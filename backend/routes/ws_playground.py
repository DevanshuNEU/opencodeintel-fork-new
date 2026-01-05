"""
WebSocket endpoint for real-time playground indexing progress.

This provides instant updates as files are indexed, giving users
a smooth streaming experience instead of polling every 2 seconds.

Channel format: job:{job_id}:events
Message types: started, progress, completed, error
"""
import json
import asyncio
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect

from dependencies import redis_client
from services.observability import logger


# How long to wait for first message before giving up
INITIAL_TIMEOUT_SECONDS = 30

# How long between messages before assuming job is dead
MESSAGE_TIMEOUT_SECONDS = 60


async def websocket_playground_index(websocket: WebSocket, job_id: str):
    """
    Stream indexing progress to client via WebSocket.
    
    Subscribes to Redis pub/sub channel for this job and forwards
    all events to the connected client. Closes when job completes
    or fails, or if client disconnects.
    
    No auth required - job_id is an unguessable UUID that acts as
    a bearer token. Only the session that created the job knows it.
    """
    # Validate we have Redis (required for pub/sub)
    if not redis_client:
        logger.error("WebSocket failed - no Redis connection")
        await websocket.close(code=4500, reason="Service unavailable")
        return
    
    # Validate job_id format (basic sanity check)
    if not job_id or len(job_id) < 10:
        await websocket.close(code=4400, reason="Invalid job ID")
        return
    
    channel = f"job:{job_id}:events"
    
    # Accept the WebSocket connection
    await websocket.accept()
    logger.info("WebSocket connected", job_id=job_id[:12], channel=channel)
    
    # Set up Redis pub/sub
    pubsub = redis_client.pubsub()
    
    try:
        # Subscribe to job's event channel
        await asyncio.to_thread(pubsub.subscribe, channel)
        logger.debug("Subscribed to channel", channel=channel)
        
        # Send initial ack so client knows we're connected
        await websocket.send_json({
            "type": "connected",
            "job_id": job_id,
            "message": "Listening for indexing events"
        })
        
        # Listen for messages
        while True:
            # Check for new message (non-blocking with timeout)
            message = await asyncio.to_thread(
                pubsub.get_message,
                ignore_subscribe_messages=True,
                timeout=MESSAGE_TIMEOUT_SECONDS
            )
            
            if message is None:
                # Timeout - check if client is still connected
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    logger.debug("Client disconnected during timeout", job_id=job_id[:12])
                    break
                continue
            
            if message["type"] != "message":
                continue
            
            # Parse and forward the event
            try:
                event_data = json.loads(message["data"])
                await websocket.send_json(event_data)
                
                # Close connection after terminal events
                event_type = event_data.get("type")
                if event_type in ("completed", "error"):
                    logger.info(
                        "Job finished, closing WebSocket",
                        job_id=job_id[:12],
                        event_type=event_type
                    )
                    break
                    
            except json.JSONDecodeError:
                logger.warning("Invalid JSON in pub/sub message", job_id=job_id[:12])
                continue
            except Exception as e:
                logger.error("Error forwarding message", error=str(e), job_id=job_id[:12])
                continue
                
    except WebSocketDisconnect:
        logger.debug("WebSocket disconnected by client", job_id=job_id[:12])
        
    except Exception as e:
        logger.error("WebSocket error", error=str(e), job_id=job_id[:12])
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Internal server error"
            })
        except Exception:
            pass
            
    finally:
        # Clean up pub/sub subscription
        try:
            await asyncio.to_thread(pubsub.unsubscribe, channel)
            await asyncio.to_thread(pubsub.close)
        except Exception:
            pass
        
        # Close WebSocket if still open
        try:
            await websocket.close()
        except Exception:
            pass
        
        logger.debug("WebSocket cleanup complete", job_id=job_id[:12])
