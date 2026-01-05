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

# We'll test the WebSocket handler directly since TestClient
# doesn't support async WebSocket testing well


class TestWebSocketPlayground:
    """Test suite for playground WebSocket endpoint."""

    def test_websocket_rejects_invalid_job_id(self):
        """Short/invalid job IDs should be rejected."""
        from main import app
        
        client = TestClient(app)
        
        # Job ID too short
        with pytest.raises(Exception):
            with client.websocket_connect("/api/v1/ws/playground/abc"):
                pass

    def test_websocket_rejects_when_no_redis(self):
        """Should close gracefully if Redis is unavailable."""
        from routes.ws_playground import websocket_playground_index
        
        # Mock WebSocket
        mock_ws = AsyncMock(spec=WebSocket)
        
        # Patch redis_client to None
        with patch('routes.ws_playground.redis_client', None):
            asyncio.run(websocket_playground_index(mock_ws, "idx_abc123def456"))
        
        # Should close with service unavailable
        mock_ws.close.assert_called_once()
        call_args = mock_ws.close.call_args
        assert call_args[1]['code'] == 4500


class TestPubSubIntegration:
    """Test Redis Pub/Sub event publishing."""

    def test_publish_event_called_on_status_update(self):
        """Verify events are published when status changes."""
        from services.anonymous_indexer import AnonymousIndexingJob, JobStatus
        
        # Create mock Redis
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({
            "job_id": "idx_test123",
            "status": "queued",
            "repo_name": "flask"
        })
        
        job_manager = AnonymousIndexingJob(mock_redis)
        
        # Update status to cloning
        job_manager.update_status("idx_test123", JobStatus.CLONING)
        
        # Verify publish was called
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
        
        # Update progress
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
            files_indexed=100,
            functions_found=500,
            time_taken_seconds=45.2
        )
        
        job_manager.update_status(
            "idx_test123",
            JobStatus.COMPLETED,
            stats=stats,
            repo_id="anon_test123"
        )
        
        # Verify publish was called with completed event
        call_args = mock_redis.publish.call_args
        event_data = json.loads(call_args[0][1])
        
        assert event_data["type"] == "completed"
        assert event_data["repo_id"] == "anon_test123"
        assert event_data["stats"]["functions_found"] == 500

    def test_processing_status_skips_duplicate_publish(self):
        """PROCESSING status should not publish (handled by update_progress)."""
        from services.anonymous_indexer import AnonymousIndexingJob, JobStatus, JobProgress
        
        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({
            "job_id": "idx_test123",
            "status": "cloning"
        })
        
        job_manager = AnonymousIndexingJob(mock_redis)
        
        # Call update_status with PROCESSING directly
        progress = JobProgress(files_total=100, files_processed=0, functions_found=0)
        job_manager.update_status("idx_test123", JobStatus.PROCESSING, progress=progress)
        
        # Should NOT have published (returns early for PROCESSING)
        mock_redis.publish.assert_not_called()


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
        
        # Type should be string "cloning", not JobStatus.CLONING
        assert isinstance(event_data["type"], str)
        assert event_data["type"] == "cloning"
