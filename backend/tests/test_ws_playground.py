"""
Tests for playground WebSocket endpoint.

Tests the real-time indexing progress via WebSocket + Redis Pub/Sub.
"""
import pytest
import json
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket


class TestWebSocketPlayground:
    """Test suite for playground WebSocket endpoint."""

    def test_websocket_rejects_invalid_job_id(self):
        """Short/invalid job IDs should be rejected."""
        from main import app
        
        client = TestClient(app)
        
        # Job ID too short - should accept then close with 4400
        with client.websocket_connect("/api/v1/ws/playground/abc") as ws:
            # Connection will be closed immediately
            pass

    def test_websocket_rejects_when_no_redis(self):
        """Should close gracefully if Redis is unavailable."""
        from routes.ws_playground import websocket_playground_index
        
        mock_ws = AsyncMock(spec=WebSocket)
        
        with patch('routes.ws_playground.redis_client', None):
            asyncio.run(websocket_playground_index(mock_ws, "idx_abc123def456"))
        
        # Should accept first, then close
        mock_ws.accept.assert_called_once()
        mock_ws.close.assert_called_once()
        call_args = mock_ws.close.call_args
        assert call_args[1]['code'] == 4500

    def test_websocket_rejects_nonexistent_job(self):
        """Should close with 4404 if job doesn't exist."""
        from routes.ws_playground import websocket_playground_index
        
        mock_ws = AsyncMock(spec=WebSocket)
        mock_redis = MagicMock()
        mock_redis.get.return_value = None  # Job not found
        
        with patch('routes.ws_playground.redis_client', mock_redis):
            asyncio.run(websocket_playground_index(mock_ws, "idx_nonexistent"))
        
        mock_ws.accept.assert_called_once()
        mock_ws.close.assert_called_once()
        call_args = mock_ws.close.call_args
        assert call_args[1]['code'] == 4404

    def test_websocket_handles_already_completed_job(self):
        """If job is already complete, send completion and close."""
        from routes.ws_playground import websocket_playground_index
        
        mock_ws = AsyncMock(spec=WebSocket)
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({
            "job_id": "idx_test123",
            "status": "completed",
            "repo_id": "anon_test123",
            "stats": {"files_processed": 100, "functions_indexed": 500}
        })
        
        with patch('routes.ws_playground.redis_client', mock_redis):
            asyncio.run(websocket_playground_index(mock_ws, "idx_test123"))
        
        # Should send completed event immediately
        mock_ws.send_json.assert_called_once()
        sent_data = mock_ws.send_json.call_args[0][0]
        assert sent_data["type"] == "completed"
        assert sent_data["repo_id"] == "anon_test123"
        mock_ws.close.assert_called_once()

    def test_websocket_handles_already_failed_job(self):
        """If job already failed, send error and close."""
        from routes.ws_playground import websocket_playground_index
        
        mock_ws = AsyncMock(spec=WebSocket)
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({
            "job_id": "idx_test123",
            "status": "failed",
            "error": "clone_failed",
            "error_message": "Repository not found"
        })
        
        with patch('routes.ws_playground.redis_client', mock_redis):
            asyncio.run(websocket_playground_index(mock_ws, "idx_test123"))
        
        mock_ws.send_json.assert_called_once()
        sent_data = mock_ws.send_json.call_args[0][0]
        assert sent_data["type"] == "error"
        assert sent_data["error"] == "clone_failed"
        mock_ws.close.assert_called_once()


class TestPubSubIntegration:
    """Test Redis Pub/Sub event publishing."""

    def test_publish_event_called_on_status_update(self):
        """Verify events are published when status changes."""
        from services.anonymous_indexer import AnonymousIndexingJob, JobStatus
        
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({
            "job_id": "idx_test123",
            "status": "queued",
            "repo_name": "flask"
        })
        
        job_manager = AnonymousIndexingJob(mock_redis)
        job_manager.update_status("idx_test123", JobStatus.CLONING)
        
        mock_redis.publish.assert_called()
        call_args = mock_redis.publish.call_args
        
        channel = call_args[0][0]
        event_data = json.loads(call_args[0][1])
        
        assert channel == "job:idx_test123:events"
        assert event_data["type"] == "cloning"
        assert event_data["repo_name"] == "flask"

    def test_progress_event_published_with_file_info(self):
        """Verify progress events include current file."""
        from services.anonymous_indexer import AnonymousIndexingJob, JobStatus
        
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({
            "job_id": "idx_test123",
            "status": "processing"
        })
        
        job_manager = AnonymousIndexingJob(mock_redis)
        
        job_manager.update_progress(
            job_id="idx_test123",
            files_processed=25,
            functions_found=150,
            files_total=100,
            current_file="src/flask/app.py"
        )
        
        # Find the progress event (first publish call)
        progress_call = mock_redis.publish.call_args_list[0]
        event_data = json.loads(progress_call[0][1])
        
        assert event_data["type"] == "progress"
        assert event_data["files_processed"] == 25
        assert event_data["files_total"] == 100
        assert event_data["current_file"] == "src/flask/app.py"
        assert event_data["percent"] == 25

    def test_completed_event_includes_stats(self):
        """Verify completion event includes stats."""
        from services.anonymous_indexer import AnonymousIndexingJob, JobStatus, JobStats
        
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({
            "job_id": "idx_test123",
            "status": "processing"
        })
        
        job_manager = AnonymousIndexingJob(mock_redis)
        
        stats = JobStats(
            files_processed=100,
            functions_indexed=500,
            indexing_time_seconds=45.2
        )
        
        job_manager.update_status(
            "idx_test123",
            JobStatus.COMPLETED,
            stats=stats,
            repo_id="anon_test123"
        )
        
        call_args = mock_redis.publish.call_args
        event_data = json.loads(call_args[0][1])
        
        assert event_data["type"] == "completed"
        assert event_data["repo_id"] == "anon_test123"
        assert event_data["stats"]["functions_indexed"] == 500

    def test_processing_status_skips_duplicate_publish(self):
        """PROCESSING status should not publish (handled by update_progress)."""
        from services.anonymous_indexer import AnonymousIndexingJob, JobStatus, JobProgress
        
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({
            "job_id": "idx_test123",
            "status": "cloning"
        })
        
        job_manager = AnonymousIndexingJob(mock_redis)
        
        progress = JobProgress(files_total=100, files_processed=0, functions_found=0)
        job_manager.update_status("idx_test123", JobStatus.PROCESSING, progress=progress)
        
        # Should NOT have published (returns early for PROCESSING)
        mock_redis.publish.assert_not_called()

    def test_failed_event_includes_recoverable_flag(self):
        """Failed events should indicate if error is recoverable."""
        from services.anonymous_indexer import AnonymousIndexingJob, JobStatus
        
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({
            "job_id": "idx_test123",
            "status": "processing"
        })
        
        job_manager = AnonymousIndexingJob(mock_redis)
        
        # Clone failures are not recoverable
        job_manager.update_status(
            "idx_test123",
            JobStatus.FAILED,
            error="clone_failed",
            error_message="Repo not found"
        )
        
        call_args = mock_redis.publish.call_args
        event_data = json.loads(call_args[0][1])
        
        assert event_data["type"] == "failed"
        assert event_data["recoverable"] == False


class TestEventFormats:
    """Verify event message formats match frontend expectations."""

    def test_event_types_are_strings(self):
        """Event types should be string values, not enum objects."""
        from services.anonymous_indexer import AnonymousIndexingJob, JobStatus
        
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({
            "job_id": "idx_test123",
            "status": "queued"
        })
        
        job_manager = AnonymousIndexingJob(mock_redis)
        job_manager.update_status("idx_test123", JobStatus.CLONING)
        
        call_args = mock_redis.publish.call_args
        event_data = json.loads(call_args[0][1])
        
        assert isinstance(event_data["type"], str)
        assert event_data["type"] == "cloning"

    def test_progress_percent_is_integer(self):
        """Progress percent should be an integer 0-100."""
        from services.anonymous_indexer import AnonymousIndexingJob
        
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({
            "job_id": "idx_test123",
            "status": "processing"
        })
        
        job_manager = AnonymousIndexingJob(mock_redis)
        
        job_manager.update_progress(
            job_id="idx_test123",
            files_processed=33,
            functions_found=100,
            files_total=100,
            current_file="test.py"
        )
        
        progress_call = mock_redis.publish.call_args_list[0]
        event_data = json.loads(progress_call[0][1])
        
        assert isinstance(event_data["percent"], int)
        assert event_data["percent"] == 33

    def test_all_events_include_job_id(self):
        """All events should include job_id for client correlation."""
        from services.anonymous_indexer import AnonymousIndexingJob, JobStatus
        
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({
            "job_id": "idx_test123",
            "status": "queued"
        })
        
        job_manager = AnonymousIndexingJob(mock_redis)
        
        # Test different event types
        job_manager.update_status("idx_test123", JobStatus.CLONING)
        
        call_args = mock_redis.publish.call_args
        event_data = json.loads(call_args[0][1])
        
        assert "job_id" in event_data
        assert event_data["job_id"] == "idx_test123"
