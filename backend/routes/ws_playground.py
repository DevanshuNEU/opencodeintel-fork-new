"""
WebSocket endpoint for real-time playground indexing progress.

This provides instant updates as files are indexed, giving users
a smooth streaming experience instead of polling every 2 seconds.

Channel format: job:{job_id}:events
Message types: connected, cloning, progress, completed, error
"""
import json
import asyncio
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect

from dependencies import redis_client
from services.observability import logger
from services.anonymous_indexer import AnonymousIndexingJob


# How long between messages before sending a ping
PING_INTERVAL_SECONDS = 30

# How long to wait for any activity before closing
IDLE_TIMEOUT_SECONDS = 120


async def websocket_playground_index(websocket: WebSocket, job_id: str):
    """
    Stream indexing progress to client via WebSocket.
    
    Subscribes to Redis pub/sub channel for this job and forwards
    all events to the connected client. Closes when job completes
    or fails, or if client disconnects.
    
    No auth required - job_id is an unguessable UUID that acts as
    a bearer token. Only the session that created the job knows it.
    """
    # Validate job_id format (basic sanity check)
    if not job_id or len(job_id) < 10:
        # Must accept before we can close with a reason
        await websocket.accept()
        await websocket.close(code=4400, reason="Invalid job ID")
        return
    
    # Validate we have Redis (required for pub/sub)
    if not redis_client:
        logger.error("WebSocket failed - no Redis connection")
        await websocket.accept()
        await websocket.close(code=4500, reason="Service unavailable")
        return
    
    # Check if job exists before subscribing
    job_manager = AnonymousIndexingJob(redis_client)
    job = job_manager.get_job(job_id)
    
    if not job:
        await websocket.accept()
        await websocket.close(code=4404, reason="Job not found")
        return
    
    # Accept the WebSocket connection
    await websocket.accept()
    logger.info("WebSocket connected", job_id=job_id[:12])
    
    # Handle race condition: job might already be complete
    job_status = job.get("status")
    if job_status == "completed":
        await websocket.send_json({
            "type": "completed",
            "job_id": job_id,
            "repo_id": job.get("repo_id"),
            "stats": job.get("stats"),
            "message": "Indexing already complete"
        })
        await websocket.close()
        return
    elif job_status == "failed":
        await websocket.send_json({
            "type": "error",
            "job_id": job_id,
            "error": job.get("error"),
            "message": job.get("error_message", "Indexing failed"),
            "recoverable": False
        })
        await websocket.close()
        return
    
    channel = f"job:{job_id}:events"
    pubsub = redis_client.pubsub()
    
    try:
        # Subscribe to job's event channel
        await asyncio.to_thread(pubsub.subscribe, channel)
        logger.debug("Subscribed to channel", channel=channel)
        
        # Send initial ack with current state
        await websocket.send_json({
            "type": "connected",
            "job_id": job_id,
            "current_status": job_status,
            "message": "Listening for indexing events"
        })
        
        # Listen for messages
        last_activity = asyncio.get_event_loop().time()
        
        while True:
            current_time = asyncio.get_event_loop().time()
            
            # Check for idle timeout
            if current_time - last_activity > IDLE_TIMEOUT_SECONDS:
                logger.warning("WebSocket idle timeout", job_id=job_id[:12])
                await websocket.send_json({
                    "type": "error",
                    "message": "Connection timed out - no activity"
                })
                break
            
            # Check for new message (non-blocking with short timeout)
            message = await asyncio.to_thread(
                pubsub.get_message,
                ignore_subscribe_messages=True,
                timeout=PING_INTERVAL_SECONDS
            )
            
            if message is None:
                # No message - send ping to keep connection alive
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    logger.debug("Client disconnected during ping", job_id=job_id[:12])
                    break
                continue
            
            if message["type"] != "message":
                continue
            
            # Got a message - reset activity timer
            last_activity = current_time
            
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
                    # Small delay to ensure client processes message before close
                    # This prevents race condition where onclose fires before onmessage
                    await asyncio.sleep(0.2)
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
