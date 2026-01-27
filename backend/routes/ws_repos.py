"""
WebSocket endpoint for real-time repo indexing progress.

Subscribes to Redis pub/sub channel and streams events to authenticated clients.
Channel format: indexing:{repo_id}:events
"""
import json
import asyncio
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect

from dependencies import redis_client, repo_manager
from services.observability import logger


PING_INTERVAL_SECONDS = 30
IDLE_TIMEOUT_SECONDS = 300  # 5 minutes for repo indexing (longer than playground)


async def authenticate_websocket(websocket: WebSocket) -> Optional[dict]:
    """
    Authenticate WebSocket via query parameter token.
    
    Token is the user's JWT access token passed as ?token=xxx
    """
    token = websocket.query_params.get("token")
    if not token:
        return None
    
    try:
        from services.auth import get_auth_service
        auth_service = get_auth_service()
        return auth_service.verify_jwt(token)
    except Exception as e:
        logger.debug("WebSocket auth failed", error=str(e))
        return None


async def websocket_repo_indexing(websocket: WebSocket, repo_id: str):
    """
    Stream repo indexing progress to authenticated client.
    
    Subscribes to Redis pub/sub channel for this repo and forwards
    all indexing events. Does NOT trigger indexing - just listens.
    
    Use POST /repos/{repo_id}/index/async to start indexing,
    then connect here to receive progress updates.
    """
    # Authenticate
    user = await authenticate_websocket(websocket)
    if not user:
        await websocket.accept()
        await websocket.close(code=4001, reason="Authentication required")
        return
    
    user_id = user.get("user_id")
    if not user_id:
        await websocket.accept()
        await websocket.close(code=4001, reason="User ID required")
        return
    
    # Verify user owns this repo
    repo = repo_manager.get_repo_for_user(repo_id, user_id)
    if not repo:
        await websocket.accept()
        await websocket.close(code=4004, reason="Repository not found")
        return
    
    # Validate Redis connection
    if not redis_client:
        logger.error("WebSocket failed - no Redis connection")
        await websocket.accept()
        await websocket.close(code=4500, reason="Service unavailable")
        return
    
    # Accept connection
    await websocket.accept()
    logger.info("Repo indexing WebSocket connected", repo_id=repo_id[:12], user_id=user_id[:12])
    
    # Check current repo status
    repo_status = repo.get("status")
    
    # If already indexed, send completion immediately
    if repo_status == "indexed":
        await websocket.send_json({
            "type": "completed",
            "entity_id": repo_id,
            "repo_id": repo_id,
            "message": "Repository already indexed",
            "stats": {
                "files_processed": repo.get("file_count", 0),
                "functions_indexed": repo.get("file_count", 0),
                "indexing_time_seconds": 0
            }
        })
        await websocket.close()
        return
    
    # If error state, notify
    if repo_status == "error":
        await websocket.send_json({
            "type": "error",
            "entity_id": repo_id,
            "error": "previous_failure",
            "message": "Previous indexing failed. Please try again.",
            "recoverable": True
        })
        await websocket.close()
        return
    
    # Subscribe to indexing events channel
    channel = f"indexing:{repo_id}:events"
    pubsub = redis_client.pubsub()
    
    try:
        await asyncio.to_thread(pubsub.subscribe, channel)
        logger.debug("Subscribed to channel", channel=channel)
        
        # Send initial ack
        await websocket.send_json({
            "type": "connected",
            "entity_id": repo_id,
            "current_status": repo_status,
            "message": "Listening for indexing events"
        })
        
        last_activity = asyncio.get_event_loop().time()
        
        while True:
            current_time = asyncio.get_event_loop().time()
            
            # Check idle timeout
            if current_time - last_activity > IDLE_TIMEOUT_SECONDS:
                logger.warning("WebSocket idle timeout", repo_id=repo_id[:12])
                await websocket.send_json({
                    "type": "error",
                    "message": "Connection timed out"
                })
                break
            
            # Check for new message (non-blocking)
            message = await asyncio.to_thread(
                pubsub.get_message,
                ignore_subscribe_messages=True,
                timeout=PING_INTERVAL_SECONDS
            )
            
            if message is None:
                # Send ping to keep connection alive
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    logger.debug("Client disconnected during ping", repo_id=repo_id[:12])
                    break
                continue
            
            if message["type"] != "message":
                continue
            
            # Reset activity timer
            last_activity = current_time
            
            # Parse and forward event
            try:
                event_data = json.loads(message["data"])
                await websocket.send_json(event_data)
                
                # Close on terminal events
                event_type = event_data.get("type")
                if event_type in ("completed", "error"):
                    logger.info(
                        "Indexing finished, closing WebSocket",
                        repo_id=repo_id[:12],
                        event_type=event_type
                    )
                    await asyncio.sleep(0.2)  # Let client process message
                    break
                    
            except json.JSONDecodeError:
                logger.warning("Invalid JSON in pub/sub", repo_id=repo_id[:12])
                continue
            except Exception as e:
                logger.error("Error forwarding message", error=str(e))
                continue
                
    except WebSocketDisconnect:
        logger.debug("WebSocket disconnected by client", repo_id=repo_id[:12])
        
    except Exception as e:
        logger.error("WebSocket error", error=str(e), repo_id=repo_id[:12])
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Internal server error"
            })
        except Exception:
            pass
            
    finally:
        # Cleanup
        try:
            await asyncio.to_thread(pubsub.unsubscribe, channel)
            await asyncio.to_thread(pubsub.close)
        except Exception:
            pass
        
        try:
            await websocket.close()
        except Exception:
            pass
        
        logger.debug("WebSocket cleanup complete", repo_id=repo_id[:12])
