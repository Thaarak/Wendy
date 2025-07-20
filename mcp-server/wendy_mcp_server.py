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

import aiosqlite
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import openai
import asyncio
import sqlite3
from email_monitor import EmailMonitor

app = FastAPI(
    title="Wendy Wedding Planning Server",
    description="AI-powered wedding planning assistant with guest management and email invitations.",
    version="1.0.0"
)


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


# Email helper class
class EmailService:
    """Email service for sending invitations."""
    
    def __init__(self):
        self.smtp_host = "smtp.gmail.com"
        self.smtp_port = 465
        self.smtp_user = "wendy.weddingplanning@gmail.com"
        self.smtp_pass = "ovzy uzkz szmm vech"  # App password
        
    def send_invitation(self, to_email: str, guest_name: str = None) -> bool:
        """Send a wedding invitation email."""
        try:
            # Create message
            msg = MIMEText(
                f"""
                Dear {guest_name or 'Guest'},
                
                You are cordially invited to our wedding!
                
                We would be honored by your presence on our special day.
                Please RSVP at your earliest convenience.
                
                Best regards,
                The Happy Couple
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
    global db, email_service, email_monitor
    
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
    # Start monitoring automatically, every 5 minutes
    email_monitor.start_monitoring(interval_minutes=5)
    print("🔄 Automatic email monitoring started for wendy.weddingplanning@gmail.com")


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


@app.post("/tools/send_invite", response_model=SendInviteResponse)
async def send_invite(request: SendInviteRequest):
    """
    Send a wedding invitation email and add the guest to the database.
    """
    if not db or not email_service:
        raise HTTPException(status_code=500, detail="Server not initialized")
    
    try:
        # Send email invitation
        guest_name = request.name or request.email
        email_sent = email_service.send_invitation(request.email, guest_name)
        
        if not email_sent:
            return SendInviteResponse(
                result=f"❌ Failed to send invitation to {request.email}. Please try again."
            )
        
        # Add guest to database
        guest_data = await db.add_guest(guest_name, request.email)
        
        if guest_data:
            return SendInviteResponse(
                result=f"✅ Invitation sent to {request.email} and guest added to the database!"
            )
        else:
            return SendInviteResponse(
                result=f"✅ Invitation sent to {request.email}, but there was an issue adding to database."
            )
            
    except Exception as e:
        return SendInviteResponse(
            result=f"❌ Error processing invitation for {request.email}: {str(e)}"
        )



@app.post("/tools/update_rsvp", response_model=UpdateRSVPResponse)
async def update_rsvp(request: UpdateRSVPRequest):
    """
    Update the RSVP status for a guest.
    """
    if not db:
        raise HTTPException(status_code=500, detail="Server not initialized")
    
    try:
        updated_guest = await db.update_guest_rsvp(request.email, request.rsvp)
        
        if updated_guest:
            return UpdateRSVPResponse(
                result=f"✅ RSVP updated for {request.email} to '{request.rsvp}'"
            )
        else:
            return UpdateRSVPResponse(
                result=f"❌ Guest with email {request.email} not found."
            )
            
    except Exception as e:
        return UpdateRSVPResponse(
            result=f"❌ Error updating RSVP for {request.email}: {str(e)}"
        )


@app.post("/tools/list_guests", response_model=ListGuestsResponse)
async def list_guests(request: ListGuestsRequest):
    """
    List guests with optional RSVP filtering.
    """
    if not db:
        raise HTTPException(status_code=500, detail="Server not initialized")
    
    try:
        if request.rsvp_filter:
            # Filter by RSVP status
            guests = await db.get_guests_by_rsvp(request.rsvp_filter)
            if guests:
                guest_list = "\n".join([
                    f"• {guest['name']} ({guest['email']}) - RSVP: {guest['rsvp']}"
                    for guest in guests
                ])
                return ListGuestsResponse(
                    result=f"Guests with RSVP '{request.rsvp_filter}':\n{guest_list}"
                )
            else:
                return ListGuestsResponse(
                    result=f"No guests found with RSVP status '{request.rsvp_filter}'"
                )
        else:
            # Get all guests
            guests = await db.get_all_guests()
            if guests:
                guest_list = "\n".join([
                    f"• {guest['name']} ({guest['email']}) - RSVP: {guest['rsvp']}"
                    for guest in guests
                ])
                return ListGuestsResponse(
                    result=f"All guests:\n{guest_list}"
                )
            else:
                return ListGuestsResponse(
                    result="No guests found in the database"
                )
            
    except Exception as e:
        return ListGuestsResponse(
            result=f"❌ Error listing guests: {str(e)}"
        )


@app.post("/tools/follow_up", response_model=FollowUpResponse)
async def follow_up(request: FollowUpRequest):
    """
    Send follow-up emails to all guests with 'maybe' RSVP status.
    """
    if not db or not email_service:
        raise HTTPException(status_code=500, detail="Server not initialized")
    
    try:
        # Get all guests with 'maybe' RSVP status
        maybe_guests = await db.get_maybe_guests()
        
        if not maybe_guests:
            return FollowUpResponse(
                result="No guests with 'maybe' RSVP status found. No follow-up emails sent."
            )
        
        # Send follow-up emails
        successful_sends = 0
        failed_sends = 0
        
        for guest in maybe_guests:
            email_sent = email_service.send_follow_up(guest['email'], guest['name'])
            if email_sent:
                successful_sends += 1
            else:
                failed_sends += 1
        
        return FollowUpResponse(
            result=f"✅ Follow-up emails sent to {successful_sends} guests with 'maybe' RSVP status. "
                   f"{'❌ Failed to send to ' + str(failed_sends) + ' guests.' if failed_sends > 0 else ''}"
        )
            
    except Exception as e:
        return FollowUpResponse(
            result=f"❌ Error sending follow-up emails: {str(e)}"
        )


@app.post("/tools/process_email_response", response_model=ProcessEmailResponse)
async def process_email_response(request: ProcessEmailRequest):
    """
    Process email response and update RSVP if needed.
    """
    if not db:
        raise HTTPException(status_code=500, detail="Server not initialized")
    
    try:
        # 1. Check if sender is in our guest list
        guest = await db.get_guest_by_email(request.sender_email)
        if not guest:
            return ProcessEmailResponse(
                result=f"❌ Sender {request.sender_email} not found in guest list"
            )
        
        # 2. Analyze email content for RSVP
        analysis = await analyze_email_for_rsvp(request.email_content)
        
        # 3. Update RSVP if analysis found one with high confidence
        if analysis.get('rsvp_status') and analysis.get('confidence', 0) > 0.7:
            await db.update_guest_rsvp(request.sender_email, analysis['rsvp_status'])
            return ProcessEmailResponse(
                result=f"✅ Updated {guest['name']}'s RSVP to '{analysis['rsvp_status']}' (confidence: {analysis['confidence']:.2f})"
            )
        elif analysis.get('rsvp_status'):
            return ProcessEmailResponse(
                result=f"⚠️ Low confidence analysis for {guest['name']}: {analysis['rsvp_status']} (confidence: {analysis['confidence']:.2f}). Manual review recommended."
            )
        else:
            return ProcessEmailResponse(
                result=f"📧 Email from {guest['name']} processed, no RSVP information found"
            )
            
    except Exception as e:
        return ProcessEmailResponse(
            result=f"❌ Error processing email: {str(e)}"
        )


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


if __name__ == "__main__":
    import uvicorn
    print("Starting Wendy Wedding Planning HTTP Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000) 