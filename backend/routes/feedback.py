"""
Feedback routes - handles user feedback and waitlist signups
Posts to Discord webhook server-side to keep webhook URL secret
"""
import os
import httpx
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from services.rate_limiter import rate_limit

router = APIRouter(prefix="/feedback", tags=["feedback"])

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_FEEDBACK_WEBHOOK")

MOOD_CONFIG = {
    "frustrated": {"emoji": "😠", "color": 0xEF4444, "label": "Frustrated"},
    "meh": {"emoji": "😐", "color": 0xEAB308, "label": "Meh"},
    "good": {"emoji": "😊", "color": 0x22C55E, "label": "Good"},
    "love": {"emoji": "🤩", "color": 0x8B5CF6, "label": "Love it!"},
}


class FeedbackRequest(BaseModel):
    mood: str
    message: Optional[str] = None
    email: Optional[EmailStr] = None


class WaitlistRequest(BaseModel):
    email: EmailStr
    plan: str  # "pro" or "enterprise"


async def post_to_discord(embed: dict) -> bool:
    """Post an embed to Discord webhook."""
    if not DISCORD_WEBHOOK_URL:
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                DISCORD_WEBHOOK_URL,
                json={"embeds": [embed]},
                timeout=10.0
            )
            return response.status_code == 204
    except Exception:
        return False


@router.post("")
@rate_limit(requests_per_minute=5)
async def submit_feedback(request: FeedbackRequest):
    """Submit user feedback - posts to Discord."""
    if not DISCORD_WEBHOOK_URL:
        raise HTTPException(status_code=503, detail="Feedback service unavailable")
    
    mood_info = MOOD_CONFIG.get(request.mood, MOOD_CONFIG["good"])
    
    embed = {
        "title": "💬 New Feedback",
        "color": mood_info["color"],
        "fields": [
            {"name": "Mood", "value": f"{mood_info['emoji']} {mood_info['label']}", "inline": True},
        ],
        "footer": {"text": "OpenCodeIntel Feedback"},
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    if request.email:
        embed["fields"].append({"name": "User", "value": request.email, "inline": True})
    
    if request.message:
        embed["fields"].append({"name": "Message", "value": request.message[:1000], "inline": False})
    
    success = await post_to_discord(embed)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to submit feedback")
    
    return {"success": True}


@router.post("/waitlist")
@rate_limit(requests_per_minute=3)
async def join_waitlist(request: WaitlistRequest):
    """Join waitlist for Pro or Enterprise plan."""
    if not DISCORD_WEBHOOK_URL:
        raise HTTPException(status_code=503, detail="Waitlist service unavailable")
    
    is_enterprise = request.plan.lower() == "enterprise"
    
    if is_enterprise:
        embed = {
            "title": "🏢 Enterprise Inquiry",
            "color": 0x8B5CF6,
            "fields": [
                {"name": "Email", "value": request.email, "inline": True},
                {"name": "Plan", "value": "Enterprise (Custom)", "inline": True},
            ],
            "footer": {"text": "OpenCodeIntel Enterprise"},
            "timestamp": datetime.utcnow().isoformat(),
        }
    else:
        embed = {
            "title": "🚀 New Waitlist Signup",
            "color": 0x3B82F6,
            "fields": [
                {"name": "Email", "value": request.email, "inline": True},
                {"name": "Plan Interest", "value": "Pro ($19/month)", "inline": True},
            ],
            "footer": {"text": "OpenCodeIntel Waitlist"},
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    success = await post_to_discord(embed)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to join waitlist")
    
    return {"success": True}
