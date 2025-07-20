"""
Wendy Wedding Planning HTTP Server

This server provides HTTP endpoints for wedding planning including:
- Guest management with SQLite database
- Email invitation system
- RSVP tracking
"""

import os
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, List, Optional
import json

# Load environment variables from .env
<<<<<<< Updated upstream
from dotenv import load_dotenv
load_dotenv()
=======
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("[WARNING] python-dotenv not installed. .env file will not be loaded.")
>>>>>>> Stashed changes

import aiosqlite
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import openai
import asyncio
import sqlite3
from email_monitor import EmailMonitor
from agent_orchestrator import AgentOrchestrator

app = FastAPI(
    title="Wendy Wedding Planning Server",
    description="AI-powered wedding planning assistant with guest management and email invitations.",
    version="1.0.0"
)

# lifespan fucntion here and then pass it into enrichmcp and then pass it into the agent orchestrator

# Add test_db endpoint here
@app.get("/test_db")
async def test_db():
    global db
    if not db:
        return {"error": "DB not initialized"}
    guests = await db.get_all_guests()
    return {"guests": guests}


# Pydantic models
class Guest(BaseModel):
    id: int
    name: str
    email: str
    rsvp: str
    created_at: str


class SendInviteRequest(BaseModel):
    email: str
    name: Optional[str] = None


class SendInviteResponse(BaseModel):
    result: str


class UpdateRSVPRequest(BaseModel):
    email: str
    rsvp: str


class UpdateRSVPResponse(BaseModel):
    result: str


class ListGuestsRequest(BaseModel):
    rsvp_filter: Optional[str] = None  # 'yes', 'no', 'maybe', or None for all


class ListGuestsResponse(BaseModel):
    result: str


class FollowUpRequest(BaseModel):
    pass  # No parameters needed


class FollowUpResponse(BaseModel):
    result: str


class ProcessEmailRequest(BaseModel):
    sender_email: str
    email_content: str


class ProcessEmailResponse(BaseModel):
    result: str


class WeddingDetails(BaseModel):
    couple_names: str
    wedding_date: str
    location: str
    time: str

class WeddingDetailsResponse(BaseModel):
    couple_names: str
    wedding_date: str
    location: str
    time: str

# Database helper class
class Database:
    """Simple async wrapper for SQLite."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn: aiosqlite.Connection | None = None

    async def connect(self):
        """Connect to the database."""
        self.conn = await aiosqlite.connect(self.db_path)
        self.conn.row_factory = aiosqlite.Row
        await self.init_schema()

    async def close(self):
        """Close the database connection."""
        if self.conn:
            await self.conn.close()

    async def init_schema(self):
        """Initialize the database schema."""
        if not self.conn:
            raise RuntimeError("Database not connected")

        cursor = await self.conn.cursor()

        # Create guests table
        await cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS guests (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                rsvp TEXT DEFAULT 'unknown',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        # Create wedding_details table (single row)
        await cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS wedding_details (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                couple_names TEXT,
                wedding_date TEXT,
                location TEXT,
                time TEXT
            )
            """
        )
        # Ensure a row always exists
        await cursor.execute(
            "INSERT OR IGNORE INTO wedding_details (id, couple_names, wedding_date, location, time) VALUES (1, '', '', '', '')"
        )

        await self.conn.commit()

    async def add_guest(self, name: str, email: str) -> dict:
        """Add a new guest to the database."""
        if not self.conn:
            raise RuntimeError("Database not connected")

        cursor = await self.conn.cursor()
        
        # Use upsert to handle duplicate emails
        await cursor.execute(
            """
            INSERT OR REPLACE INTO guests (name, email, rsvp, created_at)
            VALUES (?, ?, 'unknown', CURRENT_TIMESTAMP)
            """,
            (name, email)
        )
        
        await self.conn.commit()
        
        # Get the inserted/updated guest
        await cursor.execute("SELECT * FROM guests WHERE email = ?", (email,))
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def get_all_guests(self) -> list[dict]:
        """Get all guests."""
        if not self.conn:
            raise RuntimeError("Database not connected")

        cursor = await self.conn.execute("SELECT * FROM guests ORDER BY created_at DESC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def get_guests_by_rsvp(self, rsvp_status: str) -> list[dict]:
        """Get guests filtered by RSVP status."""
        if not self.conn:
            raise RuntimeError("Database not connected")

        cursor = await self.conn.execute(
            "SELECT * FROM guests WHERE rsvp = ? ORDER BY created_at DESC",
            (rsvp_status,)
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def get_maybe_guests(self) -> list[dict]:
        """Get all guests with 'maybe' RSVP status."""
        return await self.get_guests_by_rsvp('maybe')

    async def get_guest_by_email(self, email: str) -> dict | None:
        """Get a guest by email address."""
        if not self.conn:
            raise RuntimeError("Database not connected")

        cursor = await self.conn.cursor()
        await cursor.execute("SELECT * FROM guests WHERE email = ?", (email,))
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def update_guest_rsvp(self, email: str, rsvp: str) -> dict | None:
        """Update a guest's RSVP status."""
        if not self.conn:
            raise RuntimeError("Database not connected")

        cursor = await self.conn.cursor()
        await cursor.execute(
            "UPDATE guests SET rsvp = ? WHERE email = ?",
            (rsvp, email)
        )
        await self.conn.commit()
        
        # Get the updated guest
        await cursor.execute("SELECT * FROM guests WHERE email = ?", (email,))
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def get_wedding_details(self) -> dict:
        if not self.conn:
            raise RuntimeError("Database not connected")
        cursor = await self.conn.execute("SELECT * FROM wedding_details WHERE id = 1")
        row = await cursor.fetchone()
        return dict(row) if row else {"couple_names": "", "wedding_date": "", "location": "", "time": ""}

    async def set_wedding_details(self, couple_names: str, wedding_date: str, location: str, time: str):
        if not self.conn:
            raise RuntimeError("Database not connected")
        await self.conn.execute(
            "UPDATE wedding_details SET couple_names = ?, wedding_date = ?, location = ?, time = ? WHERE id = 1",
            (couple_names, wedding_date, location, time)
        )
        await self.conn.commit()


# Email helper class
class EmailService:
    """Email service for sending invitations."""
    
    def __init__(self):
        self.smtp_host = "smtp.gmail.com"
        self.smtp_port = 465
        self.smtp_user = "wendy.weddingplanning@gmail.com"
        self.smtp_pass = "ovzy uzkz szmm vech"  # App password
        
    def send_invitation(self, to_email: str, guest_name: str = None, couple_names: str = None, wedding_date: str = None, location: str = None) -> bool:
        """Send a wedding invitation email. Requires all wedding details."""
        # Check for missing details
        missing = []
        if not couple_names:
            missing.append('couple_names')
        if not wedding_date:
            missing.append('wedding_date')
        if not location:
            missing.append('location')
        if missing:
            raise ValueError(f"Missing wedding details: {', '.join(missing)}")
        try:
            # Create message
            msg = MIMEText(
                f"""
                Dear {guest_name or 'Guest'},
                
                You are cordially invited to our wedding!
                
                Date: {wedding_date}
                Location: {location}
                
                We would be honored by your presence on our special day.
                Please RSVP at your earliest convenience.
                
                Best regards,
                Wendy ({couple_names})
                """,
                'plain'
            )
            msg['Subject'] = 'You are invited to our wedding!'
            msg['From'] = self.smtp_user
            msg['To'] = to_email
            # Send email
            with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port) as server:
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
            print(f"✅ Invitation sent to {to_email}")
            return True
        except Exception as e:
            print(f"❌ Failed to send invitation to {to_email}: {e}")
            return False

    def send_follow_up(self, to_email: str, guest_name: str = None) -> bool:
        """Send a follow-up email to guests with 'maybe' RSVP status."""
        try:
            # Create follow-up message
            msg = MIMEText(
                f"""
                Dear {guest_name or 'Guest'},
                
                We hope this email finds you well! We wanted to follow up on your wedding invitation.
                
                We noticed you haven't confirmed your RSVP yet. We would love to know if you'll be able to join us on our special day!
                
                Please let us know your RSVP status at your earliest convenience.
                
                Thank you for your response!
                
                Best regards,
                The Happy Couple
                """,
                'plain'
            )
            
            msg['Subject'] = 'Follow-up: Wedding RSVP Reminder'
            msg['From'] = self.smtp_user
            msg['To'] = to_email
            
            # Send email
            with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port) as server:
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
                
            print(f"✅ Follow-up email sent to {to_email}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to send follow-up email to {to_email}: {e}")
            return False


# Global instances
db: Database | None = None
email_service: EmailService | None = None
openai_client: openai.OpenAI | None = None
email_monitor: EmailMonitor | None = None
agent_orchestrator: AgentOrchestrator | None = None

# --- Persistent context store (in-memory, per user) ---
user_context_store = {}

def get_user_key(message, context):
    # Try to extract user email from message or context
    # This is a simple heuristic; you can improve it as needed
    if context and isinstance(context, dict):
        if 'user_email' in context:
            return context['user_email']
        if 'sender_email' in context:
            return context['sender_email']
    if isinstance(message, str):
        import re
        match = re.search(r"[\w\.-]+@[\w\.-]+", message)
        if match:
            return match.group(0)
    return None


async def analyze_email_for_rsvp(email_content: str) -> dict:
    """Analyze email content for RSVP information using OpenAI."""
    global openai_client
    
    if not openai_client:
        # Initialize OpenAI client if not already done
        openai_client = openai.OpenAI(api_key="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")
    
    try:
        prompt = f"""
        Analyze this email response for RSVP information:

        Email content: {email_content}

        Determine if this contains an RSVP response. Look for:
        - "Yes, I'll come", "I'll be there", "Count me in" → RSVP: yes
        - "No, I can't make it", "I won't be able to attend" → RSVP: no  
        - "Maybe", "I'll let you know", "I'm not sure" → RSVP: maybe
        - No RSVP content → RSVP: null

        Respond with JSON:
        {{
          "rsvp_status": "yes|no|maybe|null",
          "confidence": 0.0-1.0,
          "reasoning": "brief explanation"
        }}
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        return result
        
    except Exception as e:
        print(f"Error analyzing email: {e}")
        return {
            "rsvp_status": None,
            "confidence": 0.0,
            "reasoning": f"Error analyzing email: {str(e)}"
        }


@app.on_event("startup")
async def startup_event():
    """Initialize database, email service, and start automatic email monitoring for Wendy's own inbox on startup."""
    global db, email_service, email_monitor, agent_orchestrator
    
    # Setup database
    db_path = Path(__file__).parent / "wedding.db"
    db = Database(str(db_path))
    await db.connect()
    print(f"✅ Connected to SQLite database: {db_path}")
    
    # Setup email service (always wendy.weddingplanning@gmail.com)
    email_service = EmailService()
    print("✅ Email service initialized")

    # Setup and start email monitor (always for Wendy's own inbox)
    email_monitor = EmailMonitor(db, email_service)
    print("✅ Email monitor initialized")
    # Start monitoring automatically, every 30 seconds for demo
    email_monitor.start_monitoring(interval_minutes=0.1)
    print("🔄 Automatic email monitoring started for wendy.weddingplanning@gmail.com")

    agent_orchestrator = AgentOrchestrator(
        db,
        email_service,
        smtp_user=email_service.smtp_user,
        smtp_pass=email_service.smtp_pass,
        openai_api_key=None  # Uses default or env var
    )
    print("✅ Agent orchestrator initialized")

    # Set the orchestrator on the email monitor to avoid circular import
    email_monitor.agent_orchestrator = agent_orchestrator
    print("✅ Email monitor linked to agent orchestrator")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global db
    if db:
        await db.close()
        print("🔒 Closed database connection")


# HTTP endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/agent")
async def agent_endpoint(request: Request):
    """
    Unified endpoint for chat/email triggers. Accepts JSON: {"message": ..., "context": {...}}
    Calls the agent orchestrator and returns the result.
    Now persists context per user session (by email) for multi-turn flows.
    """
    global agent_orchestrator, user_context_store
    data = await request.json()
    message = data.get("message")
    context = data.get("context")
    user_key = get_user_key(message, context)
    # Load previous context if available
    if user_key and user_key in user_context_store and not context:
        context = user_context_store[user_key]
    result = await agent_orchestrator.handle_event(message, context)
    # Save updated context for this user
    if user_key and result.get("context"):
        user_context_store[user_key] = result["context"]
    return JSONResponse(result)


@app.get("/resources/list_guests", response_model=List[Guest])
async def list_guests():
    """List all guests in the wedding database."""
    if not db:
        raise HTTPException(status_code=500, detail="Server not initialized")
    
    guest_rows = await db.get_all_guests()
    
    guests = []
    for row in guest_rows:
        guests.append(
            Guest(
                id=row["id"],
                name=row["name"],
                email=row["email"],
                rsvp=row["rsvp"],
                created_at=row["created_at"],
            )
        )
    
    return guests


@app.get("/resources/get_guest/{guest_id}", response_model=Guest)
async def get_guest(guest_id: int):
    """Get a specific guest by ID."""
    if not db:
        raise HTTPException(status_code=500, detail="Server not initialized")
    
    # Get all guests and find the one we want
    guest_rows = await db.get_all_guests()
    
    for row in guest_rows:
        if row["id"] == guest_id:
            return Guest(
                id=row["id"],
                name=row["name"],
                email=row["email"],
                rsvp=row["rsvp"],
                created_at=row["created_at"],
            )
    
    raise HTTPException(status_code=404, detail="Guest not found")


@app.get("/wedding/details", response_model=WeddingDetailsResponse)
async def get_wedding_details():
    global db
    if not db:
        raise HTTPException(status_code=500, detail="Server not initialized")
    details = await db.get_wedding_details()
    return WeddingDetailsResponse(**details)

@app.post("/wedding/details", response_model=WeddingDetailsResponse)
async def set_wedding_details(details: WeddingDetails):
    global db
    if not db:
        raise HTTPException(status_code=500, detail="Server not initialized")
    await db.set_wedding_details(details.couple_names, details.wedding_date, details.location, details.time)
    return details


if __name__ == "__main__":
    import uvicorn
    print("Starting Wendy Wedding Planning HTTP Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000) 