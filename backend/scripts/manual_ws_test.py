#!/usr/bin/env python3
"""
MANUAL WebSocket E2E test for playground indexing.

NOT run in CI - requires:
  - Running backend server (uvicorn main:app)
  - Redis running
  - aiohttp installed (pip install aiohttp)

This script:
1. Creates an indexing job via the REST API
2. Connects to the WebSocket endpoint
3. Listens for all events until completion/error
4. Reports what we received

Usage: 
  cd backend
  pip install aiohttp  # if not installed
  python3 scripts/manual_ws_test.py
"""
import asyncio
import aiohttp
import json
import sys
from datetime import datetime

# Config
BASE_URL = "http://localhost:8000/api/v1"
WS_URL = "ws://localhost:8000/api/v1"
TEST_REPO = "https://github.com/pmndrs/zustand"  # Small, fast to index


def log(msg: str, level: str = "INFO"):
    """Print timestamped log message."""
    ts = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    icon = {"INFO": "ℹ️", "OK": "✅", "ERR": "❌", "WS": "🔌", "EVENT": "📨"}.get(level, "•")
    print(f"[{ts}] {icon} {msg}")


async def create_indexing_job(session: aiohttp.ClientSession) -> dict:
    """Create a new indexing job via REST API."""
    log("Creating indexing job for zustand...")
    
    async with session.post(
        f"{BASE_URL}/playground/index",
        json={"github_url": TEST_REPO}
    ) as resp:
        # 202 Accepted is the expected status for async job creation
        if resp.status not in (200, 202):
            text = await resp.text()
            log(f"Failed to create job: {resp.status} - {text}", "ERR")
            return None
        
        data = await resp.json()
        job_id = data.get("job_id")
        log(f"Job created: {job_id} (status: {resp.status})", "OK")
        return data


async def listen_websocket(job_id: str) -> list:
    """Connect to WebSocket and collect all events."""
    events = []
    ws_endpoint = f"{WS_URL}/ws/playground/{job_id}"
    
    log(f"Connecting to WebSocket: {ws_endpoint}", "WS")
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.ws_connect(ws_endpoint, timeout=120) as ws:
                log("WebSocket connected!", "OK")
                
                async for msg in ws:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        event = json.loads(msg.data)
                        events.append(event)
                        
                        event_type = event.get("type", "unknown")
                        
                        # Log based on event type
                        if event_type == "connected":
                            log(f"Server acknowledged connection", "EVENT")
                        elif event_type == "ping":
                            log("Received keepalive ping", "EVENT")
                        elif event_type == "cloning":
                            repo = event.get("repo_name", "?")
                            log(f"Cloning: {repo}", "EVENT")
                        elif event_type == "progress":
                            pct = event.get("percent", 0)
                            files = event.get("files_processed", 0)
                            total = event.get("files_total", 0)
                            current = event.get("current_file") or ""
                            funcs = event.get("functions_found", 0)
                            # Truncate long paths
                            if current and len(current) > 40:
                                current = "..." + current[-37:]
                            log(f"Progress: {pct}% ({files}/{total}) | {funcs} funcs | {current}", "EVENT")
                        elif event_type == "completed":
                            stats = event.get("stats", {})
                            log(f"COMPLETED! Functions: {stats.get('functions_found', '?')}, Time: {stats.get('time_taken_seconds', '?')}s", "OK")
                            break
                        elif event_type == "error":
                            log(f"ERROR: {event.get('message', 'Unknown error')}", "ERR")
                            break
                        else:
                            log(f"Unknown event: {event_type}", "EVENT")
                    
                    elif msg.type == aiohttp.WSMsgType.ERROR:
                        log(f"WebSocket error: {ws.exception()}", "ERR")
                        break
                    elif msg.type == aiohttp.WSMsgType.CLOSED:
                        log("WebSocket closed by server", "WS")
                        break
                        
        except asyncio.TimeoutError:
            log("WebSocket connection timed out", "ERR")
        except Exception as e:
            log(f"WebSocket error: {e}", "ERR")
    
    return events


async def main():
    """Run the end-to-end test."""
    print("\n" + "="*60)
    print("  WebSocket E2E Test - Playground Indexing")
    print("="*60 + "\n")
    
    async with aiohttp.ClientSession() as session:
        # Step 1: Create job
        job_data = await create_indexing_job(session)
        if not job_data:
            sys.exit(1)
        
        job_id = job_data.get("job_id")
        if not job_id:
            log("No job_id in response", "ERR")
            sys.exit(1)
    
    # Step 2: Listen to WebSocket
    print()
    events = await listen_websocket(job_id)
    
    # Step 3: Summary
    print("\n" + "="*60)
    print("  Test Summary")
    print("="*60)
    
    event_types = [e.get("type") for e in events]
    print(f"\nTotal events received: {len(events)}")
    print(f"Event types: {' → '.join(event_types)}")
    
    # Check expected flow
    # Note: "cloning" may be skipped if repo was recently cloned
    required = ["connected", "completed"]
    has_required = all(t in event_types for t in required)
    has_progress = "progress" in event_types
    
    print()
    if has_required and has_progress:
        log("TEST PASSED - Full event flow received!", "OK")
        print()
        return 0
    elif "error" in event_types:
        log("TEST COMPLETED WITH ERROR - Error event received (may be expected)", "ERR")
        print()
        return 1
    else:
        log(f"TEST INCOMPLETE - Missing events. Got: {event_types}", "ERR")
        print()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
