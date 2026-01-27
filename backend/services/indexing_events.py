"""
Indexing Events Publisher

Unified event publishing for real-time indexing progress.
Used by both playground (anonymous) and dashboard (authenticated) indexing.

Channel format: indexing:{entity_id}:events
Entity can be job_id (playground) or repo_id (dashboard).
"""
import json
from typing import Optional, Any
from enum import Enum
from dataclasses import dataclass, asdict

from services.observability import logger


class IndexingEventType(str, Enum):
    """Event types for indexing progress."""
    CONNECTED = "connected"
    CLONING = "cloning"
    PROGRESS = "progress"
    COMPLETED = "completed"
    ERROR = "error"
    PING = "ping"


@dataclass
class IndexingProgress:
    """Progress data for indexing event."""
    files_processed: int
    files_total: int
    functions_found: int
    current_file: Optional[str] = None
    percent: int = 0

    def __post_init__(self):
        if self.files_total > 0:
            self.percent = int((self.files_processed / self.files_total) * 100)


@dataclass
class IndexingStats:
    """Final stats for completed indexing."""
    files_processed: int
    functions_indexed: int
    indexing_time_seconds: float


class IndexingEventPublisher:
    """
    Publishes indexing events to Redis pub/sub.
    
    Events are fire-and-forget. If no WebSocket clients are listening,
    events are simply discarded. Redis job/repo state serves as fallback
    for polling clients.
    """
    
    CHANNEL_PREFIX = "indexing:"
    CHANNEL_SUFFIX = ":events"
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    def _get_channel(self, entity_id: str) -> str:
        """Get Redis pub/sub channel for entity."""
        return f"{self.CHANNEL_PREFIX}{entity_id}{self.CHANNEL_SUFFIX}"
    
    def _publish(self, entity_id: str, event: dict) -> bool:
        """Publish event to Redis channel."""
        if not self.redis:
            logger.warning("Cannot publish event - no Redis client")
            return False
        
        try:
            channel = self._get_channel(entity_id)
            result = self.redis.publish(channel, json.dumps(event))
            logger.info(
                "Published event to Redis",
                channel=channel[:40],
                event_type=event.get("type"),
                subscribers=result
            )
            return True
        except Exception as e:
            logger.warning(
                "Failed to publish indexing event",
                entity_id=entity_id,
                error=str(e)
            )
            return False
    
    def publish_connected(self, entity_id: str, message: str = "Connected") -> bool:
        """Publish connection acknowledgment."""
        return self._publish(entity_id, {
            "type": IndexingEventType.CONNECTED.value,
            "entity_id": entity_id,
            "message": message
        })
    
    def publish_cloning(
        self, 
        entity_id: str, 
        repo_name: str,
        message: str = "Cloning repository..."
    ) -> bool:
        """Publish cloning started event."""
        return self._publish(entity_id, {
            "type": IndexingEventType.CLONING.value,
            "entity_id": entity_id,
            "repo_name": repo_name,
            "message": message
        })
    
    def publish_progress(
        self,
        entity_id: str,
        files_processed: int,
        files_total: int,
        functions_found: int,
        current_file: Optional[str] = None
    ) -> bool:
        """Publish indexing progress update."""
        progress = IndexingProgress(
            files_processed=files_processed,
            files_total=files_total,
            functions_found=functions_found,
            current_file=current_file
        )
        
        return self._publish(entity_id, {
            "type": IndexingEventType.PROGRESS.value,
            "entity_id": entity_id,
            **asdict(progress)
        })
    
    def publish_completed(
        self,
        entity_id: str,
        repo_id: str,
        stats: IndexingStats,
        message: str = "Indexing complete"
    ) -> bool:
        """Publish indexing completed event."""
        return self._publish(entity_id, {
            "type": IndexingEventType.COMPLETED.value,
            "entity_id": entity_id,
            "repo_id": repo_id,
            "stats": asdict(stats),
            "message": message
        })
    
    def publish_error(
        self,
        entity_id: str,
        error: str,
        message: str,
        recoverable: bool = False
    ) -> bool:
        """Publish indexing error event."""
        return self._publish(entity_id, {
            "type": IndexingEventType.ERROR.value,
            "entity_id": entity_id,
            "error": error,
            "message": message,
            "recoverable": recoverable
        })


def get_event_publisher(redis_client) -> Optional[IndexingEventPublisher]:
    """Factory function to get event publisher."""
    if not redis_client:
        return None
    return IndexingEventPublisher(redis_client)
