"""
Direct Trader Communications - Backend API
Professional Trading Dealerboard Platform
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Direct Trader Communications API",
    description="Professional Trading Dealerboard Platform for Financial Institutions",
    version="1.0.0"
)

# CORS middleware for iOS app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class TradingLine(BaseModel):
    id: str
    name: str
    number: str
    type: str  # hoot, ard, mrd
    status: str  # active, inactive, ready, busy, error
    participants: List[str] = []

class CallInfo(BaseModel):
    id: str
    line_id: str
    address: str
    line_type: str
    status: str
    start_time: datetime
    duration: Optional[int] = None

class BankConfiguration(BaseModel):
    bank_id: str
    bank_name: str
    oracle_sbc_host: str
    oracle_sbc_port: int = 5061
    audiocodes_host: str
    audiocodes_port: int = 5060
    sip_domain: str
    lines: List[TradingLine] = []

# In-memory storage (replace with database in production)
bank_configs = {}
active_calls = {}
line_configurations = {}

@app.get("/")
async def root():
    return {
        "message": "Direct Trader Communications API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

# Bank Configuration Management
@app.post("/banks/{bank_id}/configure")
async def configure_bank(bank_id: str, config: BankConfiguration):
    """Configure a bank's trading lines and infrastructure"""
    bank_configs[bank_id] = config
    line_configurations[bank_id] = config.lines
    logger.info(f"Configured bank {bank_id} with {len(config.lines)} lines")
    return {"message": f"Bank {bank_id} configured successfully"}

@app.get("/banks/{bank_id}/lines")
async def get_bank_lines(bank_id: str):
    """Get all trading lines for a bank"""
    if bank_id not in line_configurations:
        raise HTTPException(status_code=404, detail="Bank not found")
    return line_configurations[bank_id]

@app.get("/banks/{bank_id}/lines/{line_type}")
async def get_lines_by_type(bank_id: str, line_type: str):
    """Get lines by type (hoot, ard, mrd)"""
    if bank_id not in line_configurations:
        raise HTTPException(status_code=404, detail="Bank not found")
    
    lines = [line for line in line_configurations[bank_id] if line.type == line_type]
    return lines

# Call Management
@app.post("/calls/initiate")
async def initiate_call(line_id: str, bank_id: str):
    """Initiate a call on a trading line"""
    if bank_id not in line_configurations:
        raise HTTPException(status_code=404, detail="Bank not found")
    
    # Find the line
    line = None
    for l in line_configurations[bank_id]:
        if l.id == line_id:
            line = l
            break
    
    if not line:
        raise HTTPException(status_code=404, detail="Line not found")
    
    # Create call info
    call_id = f"call_{line_id}_{datetime.now().timestamp()}"
    call_info = CallInfo(
        id=call_id,
        line_id=line_id,
        address=line.number,
        line_type=line.type,
        status="initiating",
        start_time=datetime.now()
    )
    
    active_calls[call_id] = call_info
    
    # Update line status
    line.status = "busy"
    
    logger.info(f"Initiated call {call_id} on line {line_id}")
    return call_info

@app.post("/calls/{call_id}/answer")
async def answer_call(call_id: str):
    """Answer an incoming call"""
    if call_id not in active_calls:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call = active_calls[call_id]
    call.status = "active"
    
    logger.info(f"Answered call {call_id}")
    return call

@app.post("/calls/{call_id}/end")
async def end_call(call_id: str):
    """End an active call"""
    if call_id not in active_calls:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call = active_calls[call_id]
    call.status = "ended"
    call.duration = int((datetime.now() - call.start_time).total_seconds())
    
    # Update line status back to ready
    # This would need to find the line and update its status
    
    logger.info(f"Ended call {call_id}")
    return call

@app.get("/calls/active")
async def get_active_calls():
    """Get all active calls"""
    active = [call for call in active_calls.values() if call.status == "active"]
    return active

# Oracle SBC Integration
@app.post("/oracle-sbc/register")
async def register_with_oracle_sbc(bank_id: str, username: str, password: str):
    """Register with Oracle SBC for a bank"""
    if bank_id not in bank_configs:
        raise HTTPException(status_code=404, detail="Bank not found")
    
    config = bank_configs[bank_id]
    
    # Oracle SBC registration logic would go here
    # This is a placeholder for the actual SIP registration
    
    logger.info(f"Registered {username} with Oracle SBC for bank {bank_id}")
    return {"message": "Registration successful", "sbc_host": config.oracle_sbc_host}

# AudioCodes Integration
@app.post("/audiocodes/configure")
async def configure_audiocodes(bank_id: str):
    """Configure AudioCodes infrastructure for a bank"""
    if bank_id not in bank_configs:
        raise HTTPException(status_code=404, detail="Bank not found")
    
    config = bank_configs[bank_id]
    
    # AudioCodes configuration logic would go here
    # This is a placeholder for the actual AudioCodes API integration
    
    logger.info(f"Configured AudioCodes for bank {bank_id}")
    return {"message": "AudioCodes configured", "host": config.audiocodes_host}

# White-label Support
@app.get("/banks/{bank_id}/branding")
async def get_bank_branding(bank_id: str):
    """Get branding configuration for white-label support"""
    if bank_id not in bank_configs:
        raise HTTPException(status_code=404, detail="Bank not found")
    
    # Return branding configuration
    return {
        "bank_name": bank_configs[bank_id].bank_name,
        "primary_color": "#1E40AF",  # Blue
        "secondary_color": "#F59E0B",  # Amber
        "logo_url": f"/branding/{bank_id}/logo.png",
        "app_name": f"{bank_configs[bank_id].bank_name} Trader"
    }

# DND (Do Not Disturb) Management
@app.post("/dnd/{user_id}/enable")
async def enable_dnd(user_id: str):
    """Enable Do Not Disturb for a user"""
    # Implementation would store DND state in database
    logger.info(f"DND enabled for user {user_id}")
    return {"message": "DND enabled", "user_id": user_id, "dnd_enabled": True}

@app.post("/dnd/{user_id}/disable")
async def disable_dnd(user_id: str):
    """Disable Do Not Disturb for a user"""
    # Implementation would store DND state in database
    logger.info(f"DND disabled for user {user_id}")
    return {"message": "DND disabled", "user_id": user_id, "dnd_enabled": False}

@app.get("/dnd/{user_id}/status")
async def get_dnd_status(user_id: str):
    """Get DND status for a user"""
    # Implementation would check DND state from database
    return {"user_id": user_id, "dnd_enabled": False, "mode": "manual"}

@app.post("/dnd/{user_id}/schedule")
async def schedule_dnd(user_id: str, start_time: str, end_time: str):
    """Schedule DND for specific times"""
    # Implementation would store scheduled DND times
    logger.info(f"DND scheduled for user {user_id} from {start_time} to {end_time}")
    return {
        "message": "DND scheduled",
        "user_id": user_id,
        "start_time": start_time,
        "end_time": end_time
    }

@app.post("/dnd/{user_id}/allowed-callers")
async def add_allowed_caller(user_id: str, caller_address: str):
    """Add an allowed caller for DND override"""
    # Implementation would store allowed callers
    logger.info(f"Added allowed caller {caller_address} for user {user_id}")
    return {"message": "Allowed caller added", "caller": caller_address}

@app.delete("/dnd/{user_id}/allowed-callers/{caller_address}")
async def remove_allowed_caller(user_id: str, caller_address: str):
    """Remove an allowed caller"""
    # Implementation would remove from allowed callers
    logger.info(f"Removed allowed caller {caller_address} for user {user_id}")
    return {"message": "Allowed caller removed", "caller": caller_address}

# Hoot Line Monitoring
@app.post("/hoot-lines/{line_id}/monitor")
async def start_hoot_monitoring(line_id: str, user_id: str, muted: bool = True):
    """Start monitoring a hoot line"""
    # Implementation would start monitoring
    logger.info(f"Started monitoring hoot line {line_id} for user {user_id}, muted: {muted}")
    return {
        "message": "Monitoring started",
        "line_id": line_id,
        "user_id": user_id,
        "muted": muted
    }

@app.post("/hoot-lines/{line_id}/stop-monitoring")
async def stop_hoot_monitoring(line_id: str, user_id: str):
    """Stop monitoring a hoot line"""
    # Implementation would stop monitoring
    logger.info(f"Stopped monitoring hoot line {line_id} for user {user_id}")
    return {"message": "Monitoring stopped", "line_id": line_id, "user_id": user_id}

@app.post("/hoot-lines/{line_id}/toggle-mute")
async def toggle_hoot_mute(line_id: str, user_id: str):
    """Toggle mute status for hoot line monitoring"""
    # Implementation would toggle mute
    logger.info(f"Toggled mute for hoot line {line_id} for user {user_id}")
    return {"message": "Mute toggled", "line_id": line_id, "user_id": user_id}

@app.get("/hoot-lines/{line_id}/audio-activity")
async def get_audio_activity(line_id: str):
    """Get current audio activity on a hoot line"""
    # Implementation would get real audio levels
    return {
        "line_id": line_id,
        "has_activity": True,
        "audio_level": 0.7,
        "is_speaking": True,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

