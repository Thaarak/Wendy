# 🏗️ Wendy AI Wedding Planner - Complete Architecture Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [MCP Server & AI Agent Integration](#mcp-server--ai-agent-integration)
4. [AI Agent & Frontend Integration](#ai-agent--frontend-integration)
5. [Creating New Services](#creating-new-services)
6. [Testing Services](#testing-services)
7. [Development Workflow](#development-workflow)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

Wendy is an AI-powered wedding planning assistant built with a **microservices architecture**:

```
Frontend (Next.js) → AI Agent (TypeScript) → MCP Server (Python) → Database (SQLite)
```

### **Key Components:**
- **Frontend**: Next.js 14 with App Router
- **AI Agent**: OpenAI GPT-3.5-turbo with function calling
- **MCP Server**: Python FastAPI with SQLite database
- **Email Service**: Python SMTP integration
- **Tool System**: Modular tool architecture

---

## 🏗️ Architecture Deep Dive

### **1. Frontend Layer (`app/`)**
```
app/
├── api/                    # Next.js API routes
│   ├── chat/route.ts      # Chat endpoint
│   └── guests/route.ts    # Guest list endpoint
├── (dashboard)/           # Dashboard pages
│   ├── chat/page.tsx      # Chat interface
│   ├── guests/page.tsx    # Guest management
│   └── calendar/page.tsx  # Calendar view
└── layout.tsx             # Root layout
```

**Purpose**: User interface and API endpoints

### **2. AI Agent Layer (`services/agent/`)**
```
services/agent/
├── orchestrator.ts        # AI agent coordination
└── tools/                 # Tool implementations
    ├── index.ts          # Tool registry
    ├── send-invite.ts    # Invitation tool
    └── update-rsvp.ts    # RSVP tool
```

**Purpose**: AI decision-making and tool orchestration

### **3. MCP Client Layer (`services/mcp/`)**
```
services/mcp/
└── client.ts             # HTTP client for Python server
```

**Purpose**: Communication bridge to Python server

### **4. Backend Server (`mcp-server/`)**
```
mcp-server/
├── wendy_mcp_server.py   # FastAPI server
├── wedding.db            # SQLite database
├── requirements.txt      # Python dependencies
└── venv/                # Python virtual environment
```

**Purpose**: Business logic, database operations, email sending

---

## 🔄 MCP Server & AI Agent Integration

### **How They Communicate:**

#### **1. HTTP Endpoints (Python Server)**
```python
# mcp-server/wendy_mcp_server.py
@app.post("/tools/send_invite")
async def send_invite(request: SendInviteRequest):
    # Actually sends email and saves to database
    email_sent = email_service.send_invitation(request.email)
    guest_data = await db.add_guest(request.name, request.email)
    return SendInviteResponse(result="✅ Invitation sent!")
```

#### **2. HTTP Client (TypeScript)**
```typescript
// services/mcp/client.ts
async sendInvite(email: string, name?: string): Promise<string> {
  const response = await fetch(`${this.baseUrl}/tools/send_invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const result = await response.json();
  return result.result;
}
```

#### **3. Tool Wrapper (TypeScript)**
```typescript
// services/agent/tools/send-invite.ts
export async function sendInvite(params: SendInviteParams): Promise<SendInviteResult> {
  const mcpClient = getMCPClient();
  const result = await mcpClient.sendInvite(params.email, params.name);
  return { success: true, message: result };
}
```

### **Data Flow:**
```
AI Agent → Tool Wrapper → HTTP Client → Python Server → Database/Email
```

---

## 🤖 AI Agent & Frontend Integration

### **How the AI Agent Works:**

#### **1. Message Processing Flow**
```typescript
// services/agent/orchestrator.ts
async processMessage(userMessage: string): Promise<string> {
  // Step 1: AI decides which tools to use
  const toolCalls = await this.decideToolsToUse(userMessage);
  
  // Step 2: Execute the tools
  const results = await this.executeTools(toolCalls);
  
  // Step 3: Generate response based on results
  return await this.generateResponse(userMessage, toolCalls, results);
}
```

#### **2. Tool Decision Making**
```typescript
private async decideToolsToUse(userMessage: string) {
  const completion = await this.openai.chat.completions.create({
    model: 'gpt-3.5-turbo-1106',
    messages: [
      { role: 'system', content: 'You are Wendy, an AI wedding planner...' },
      { role: 'user', content: userMessage },
    ],
    functions: this.availableTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
    function_call: 'auto',
  });
}
```

#### **3. Frontend Integration**
```typescript
// app/api/chat/route.ts
export async function POST(request: Request) {
  const { message } = await request.json();
  const orchestrator = getAgentOrchestrator();
  const reply = await orchestrator.processMessage(message);
  return Response.json({ reply });
}
```

### **Complete Flow:**
```
User Types → Frontend → API Route → AI Agent → Tool Selection → Tool Execution → Response Generation → Frontend Display
```

---

## 🛠️ Creating New Services

### **Step-by-Step Guide:**

#### **1. Add Python Backend Endpoint**

**File**: `mcp-server/wendy_mcp_server.py`

```python
# Add request/response models
class AddVendorRequest(BaseModel):
    name: str
    email: str
    type: str

class AddVendorResponse(BaseModel):
    result: str

# Add HTTP endpoint
@app.post("/tools/add_vendor", response_model=AddVendorResponse)
async def add_vendor(request: AddVendorRequest):
    """Add a new vendor to the database."""
    if not db:
        raise HTTPException(status_code=500, detail="Server not initialized")
    
    try:
        # Add vendor to database
        vendor_data = await db.add_vendor(request.name, request.email, request.type)
        
        if vendor_data:
            return AddVendorResponse(
                result=f"✅ Added vendor: {request.name} ({request.type})"
            )
        else:
            return AddVendorResponse(
                result=f"❌ Failed to add vendor: {request.name}"
            )
            
    except Exception as e:
        return AddVendorResponse(
            result=f"❌ Error adding vendor: {str(e)}"
        )
```

#### **2. Add Database Method**

**File**: `mcp-server/wendy_mcp_server.py` (in Database class)

```python
async def add_vendor(self, name: str, email: str, vendor_type: str) -> dict:
    """Add a new vendor to the database."""
    if not self.conn:
        raise RuntimeError("Database not connected")

    cursor = await self.conn.cursor()
    
    await cursor.execute(
        """
        INSERT INTO vendors (name, email, type, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """,
        (name, email, vendor_type)
    )
    
    await self.conn.commit()
    
    # Get the inserted vendor
    await cursor.execute("SELECT * FROM vendors WHERE email = ?", (email,))
    row = await cursor.fetchone()
    return dict(row) if row else None
```

#### **3. Add MCP Client Method**

**File**: `services/mcp/client.ts`

```typescript
async addVendor(name: string, email: string, type: string): Promise<string> {
  try {
    const response = await fetch(`${this.baseUrl}/tools/add_vendor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        type,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.result || 'Vendor added successfully';
  } catch (error) {
    console.error('Error adding vendor:', error);
    throw error;
  }
}
```

#### **4. Create TypeScript Tool**

**File**: `services/agent/tools/add-vendor.ts`

```typescript
import { getMCPClient } from '../../mcp/client';

export interface AddVendorParams {
  name: string;
  email: string;
  type: 'venue' | 'caterer' | 'photographer' | 'florist';
}

export interface AddVendorResult {
  success: boolean;
  message: string;
  vendorId?: number;
}

export async function addVendor(params: AddVendorParams): Promise<AddVendorResult> {
  try {
    const mcpClient = getMCPClient();
    const result = await mcpClient.addVendor(params.name, params.email, params.type);
    
    if (result.includes('✅')) {
      return {
        success: true,
        message: result,
      };
    } else {
      return {
        success: false,
        message: result,
      };
    }
  } catch (error) {
    console.error('Error in add_vendor tool:', error);
    return {
      success: false,
      message: `❌ Failed to add vendor: ${error}`,
    };
  }
}

// Tool metadata for the orchestrator
export const addVendorTool = {
  name: 'add_vendor',
  description: 'Add a new vendor to the wedding planning database',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The vendor name',
      },
      email: {
        type: 'string',
        description: 'The vendor email address',
      },
      type: {
        type: 'string',
        description: 'The vendor type',
        enum: ['venue', 'caterer', 'photographer', 'florist'],
      },
    },
    required: ['name', 'email', 'type'],
  },
  execute: addVendor,
};
```

#### **5. Register the Tool**

**File**: `services/agent/tools/index.ts`

```typescript
import { addVendorTool } from './add-vendor';

// Tool registry - add new tools here
export const TOOL_REGISTRY = {
  send_invite: sendInviteTool,
  update_rsvp: updateRSVPTool,
  add_vendor: addVendorTool, // Add your new tool here
};

// Export all tools for easy access
export { addVendorTool } from './add-vendor';
```

#### **6. Update Database Schema (if needed)**

**File**: `mcp-server/wendy_mcp_server.py` (in Database.init_schema)

```python
# Create vendors table
await cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
)
```

---

## 🧪 Testing Services

### **1. Test Python Server Endpoint**

```bash
# Start the Python server
cd mcp-server
source venv/bin/activate
python wendy_mcp_server.py

# In another terminal, test the endpoint
curl http://localhost:8000/tools/add_vendor \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Vendor", "email": "vendor@test.com", "type": "venue"}'
```

### **2. Test MCP Client**

```bash
# Test the TypeScript client
curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Add vendor Test Vendor (vendor@test.com) as a venue"}'
```

### **3. Test End-to-End Flow**

```bash
# Test the complete flow
curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Add a photographer named John Smith (john@photography.com)"}'
```

### **4. Verify Database**

```bash
# Check if data was saved
curl http://localhost:8000/resources/list_vendors
```

### **5. Debug Common Issues**

#### **Python Server Not Running**
```bash
# Check if server is running
ps aux | grep wendy_mcp_server.py

# Restart if needed
pkill -f wendy_mcp_server.py
cd mcp-server && source venv/bin/activate && python wendy_mcp_server.py
```

#### **Port Conflicts**
```bash
# Check what's using port 8000
lsof -i :8000

# Check what's using port 3000
lsof -i :3000
```

#### **Database Issues**
```bash
# Check database file
ls -la mcp-server/wedding.db

# Reset database if needed
rm mcp-server/wedding.db
# Restart Python server to recreate
```

---

## 🔄 Development Workflow

### **1. Starting Development Environment**

```bash
# Terminal 1: Start Python MCP server
cd mcp-server
source venv/bin/activate
python wendy_mcp_server.py

# Terminal 2: Start Next.js frontend
pnpm dev
```

### **2. Adding New Features**

1. **Plan the feature**: What should it do?
2. **Add Python endpoint**: Business logic
3. **Add TypeScript tool**: AI interface
4. **Register tool**: Make it available to AI
5. **Test end-to-end**: Verify everything works
6. **Update documentation**: Keep README current

### **3. Code Organization**

```
Feature: Add Vendor Management
├── Backend: mcp-server/wendy_mcp_server.py (add_vendor endpoint)
├── Database: mcp-server/wedding.db (vendors table)
├── Client: services/mcp/client.ts (addVendor method)
├── Tool: services/agent/tools/add-vendor.ts (AI interface)
└── Registry: services/agent/tools/index.ts (tool registration)
```

### **4. Best Practices**

#### **Python Backend**
- Use Pydantic models for request/response validation
- Handle errors gracefully with try/catch
- Use async/await for database operations
- Return consistent response formats

#### **TypeScript Tools**
- Provide clear tool descriptions for AI
- Use TypeScript interfaces for type safety
- Handle errors and return meaningful messages
- Keep tools focused and single-purpose

#### **AI Agent**
- Write clear tool descriptions
- Use enums for constrained values
- Provide helpful error messages
- Test with various user inputs

---

## 🐛 Troubleshooting

### **Common Issues & Solutions**

#### **1. "Tool not found" Error**
```bash
# Check if tool is registered
grep -r "add_vendor" services/agent/tools/

# Verify tool is in registry
cat services/agent/tools/index.ts
```

#### **2. "HTTP 404" Error**
```bash
# Check if Python server is running
curl http://localhost:8000/health

# Check if endpoint exists
grep -r "add_vendor" mcp-server/wendy_mcp_server.py
```

#### **3. "Database error"**
```bash
# Check database file permissions
ls -la mcp-server/wedding.db

# Check database schema
sqlite3 mcp-server/wedding.db ".schema"
```

#### **4. "AI not calling tool"**
```bash
# Check tool description clarity
cat services/agent/tools/add-vendor.ts

# Test with explicit tool call
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Please use the add_vendor tool to add a vendor"}'
```

#### **5. "Email not sending"**
```bash
# Check email credentials
grep -r "smtp" mcp-server/wendy_mcp_server.py

# Test email service directly
python -c "
from mcp_server.wendy_mcp_server import EmailService
service = EmailService()
print(service.send_invitation('test@example.com'))
"
```

### **Debug Commands**

#### **Check Server Status**
```bash
# Python server
curl http://localhost:8000/health

# Next.js server
curl http://localhost:3000/api/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

#### **Check Database**
```bash
# List all guests
curl http://localhost:8000/resources/list_guests

# List all vendors (if implemented)
curl http://localhost:8000/resources/list_vendors
```

#### **Check Tool Registry**
```bash
# See all available tools
grep -r "name:" services/agent/tools/*.ts
```

---

## 📚 Key Files Reference

### **Core Files**
- `mcp-server/wendy_mcp_server.py` - Python backend server
- `services/agent/orchestrator.ts` - AI agent coordination
- `services/mcp/client.ts` - HTTP client for Python server
- `app/api/chat/route.ts` - Next.js chat API endpoint
- `services/agent/tools/index.ts` - Tool registry

### **Configuration Files**
- `package.json` - Node.js dependencies
- `mcp-server/requirements.txt` - Python dependencies
- `next.config.mjs` - Next.js configuration
- `.gitignore` - Git ignore rules

### **Database**
- `mcp-server/wedding.db` - SQLite database file
- Database schema defined in `mcp-server/wendy_mcp_server.py`

---

## 🚀 Deployment Considerations

### **Development vs Production**
- **Development**: Local SQLite, local email testing
- **Production**: Cloud database, production email service

### **Environment Variables**
```bash
# Add to .env file
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_database_url
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### **Scaling Considerations**
- Deploy Python server separately (Heroku, Railway, etc.)
- Use production database (PostgreSQL, MySQL)
- Set up proper email service
- Configure CORS for cross-origin requests

---

## 🎯 Quick Start for New Developers

### **1. Clone and Setup**
```bash
git clone <repository-url>
cd Wendy
pnpm install
cd mcp-server && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
```

### **2. Start Services**
```bash
# Terminal 1: Python server
cd mcp-server && source venv/bin/activate && python wendy_mcp_server.py

# Terminal 2: Next.js app
pnpm dev
```

### **3. Test Everything Works**
```bash
# Test chat
curl http://localhost:3000/api/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Invite test@example.com"}'

# Test guest list
curl http://localhost:3000/api/guests
```

### **4. Add Your First Tool**
Follow the [Creating New Services](#creating-new-services) section above.

---

This architecture provides a **scalable, maintainable, and testable** foundation for AI-powered applications. The separation of concerns allows each component to be developed, tested, and deployed independently while maintaining clear interfaces between layers.

## 📞 Support

For questions or issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [Testing Services](#testing-services) section
3. Examine the existing tool implementations in `services/agent/tools/`
4. Check the Python server logs for backend issues
5. Check the Next.js console for frontend issues

Happy coding! 🎉 