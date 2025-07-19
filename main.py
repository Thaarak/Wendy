import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from dotenv import load_dotenv
import yagmail
import uuid
from llm_service import process_vendor_reply, generate_initial_email
import json

load_dotenv()

app = FastAPI()

# In-memory conversation store
conversations: Dict[str, dict] = {}

# Pydantic models
class EmailSendRequest(BaseModel):
    vendorType: str
    vendorEmail: str
    userId: str
    context: Optional[dict] = None
    subject: str
    # body: str  # Remove this field, body will be generated

class EmailInboundRequest(BaseModel):
    conversationId: str
    from_email: str = Field(..., alias='from')
    body: str
    subject: Optional[str] = None

class Message(BaseModel):
    from_email: str
    to: str
    timestamp: str
    body: str
    subject: Optional[str] = None

# Health check
@app.get('/api/health')
def health():
    return {"status": "ok"}

# Send initial email and create conversation
@app.post('/api/email/send')
def send_email(req: EmailSendRequest):
    conv_id = str(uuid.uuid4())
    # Generate the email body using OpenAI
    event_date = req.context.get('eventDate') if req.context else None
    email_body = generate_initial_email(req.vendorType, event_date, req.context)
    conversations[conv_id] = {
        "conversationId": conv_id,
        "vendorType": req.vendorType,
        "vendorEmail": req.vendorEmail,
        "userId": req.userId,
        "context": req.context,
        "status": "email_sent",
        "history": []
    }
    msg = {
        "from_email": "wendy",
        "to": req.vendorEmail,
        "timestamp": __import__('datetime').datetime.utcnow().isoformat(),
        "body": email_body,
        "subject": req.subject
    }
    conversations[conv_id]["history"].append(msg)
    try:
        yag = yagmail.SMTP(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASS'))
        yag.send(to=req.vendorEmail, subject=req.subject, contents=email_body)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")
    return {"conversationId": conv_id}

# Receive vendor reply
@app.post('/api/email/inbound')
def inbound_email(req: EmailInboundRequest):
    conv = conversations.get(req.conversationId)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msg = {
        "from_email": req.from_email,
        "to": "wendy",
        "timestamp": __import__('datetime').datetime.utcnow().isoformat(),
        "body": req.body,
        "subject": req.subject
    }
    conv["history"].append(msg)
    # Call LLM to process the reply and decide next action
    llm_raw = process_vendor_reply(conv, req.body)
    try:
        llm_result = json.loads(llm_raw)
    except Exception:
        llm_result = {"action": "prompt_user", "content": llm_raw}
    conv["status"] = llm_result["action"]
    conv["pendingUserAction"] = llm_result
    return {"status": "received", "llmResult": llm_result}

# Get conversation state/log
@app.get('/api/conversations/{conv_id}')
def get_conversation(conv_id: str):
    conv = conversations.get(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

# List all conversations
@app.get('/api/conversations')
def list_conversations():
    return list(conversations.values()) 