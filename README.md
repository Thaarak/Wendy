# 💍 Wendy AI Wedding Planner

An AI-powered wedding planning assistant with a modular tool-based architecture.

## 🏗️ Architecture

### **Agent Orchestrator Pattern**
```
User Message → Agent Orchestrator → Tool Selection → Tool Execution → Response Generation
```

### **Components:**

1. **Agent Orchestrator** (`services/agent/orchestrator.ts`)
   - Manages AI agent decision-making
   - Coordinates tool selection and execution
   - Generates contextual responses

2. **Tool Registry** (`services/agent/tools/index.ts`)
   - Central registry for all available tools
   - Easy tool discovery and execution
   - Scalable tool management

3. **Individual Tools** (`services/agent/tools/`)
   - Each tool in its own file
   - Consistent interface and error handling
   - Easy to add new tools

4. **MCP Server** (`mcp-server/`)
   - FastAPI HTTP server
   - Custom SQLite database management
   - Email service integration

## 🚀 Quick Start

### **Prerequisites:**
- Node.js 18+
- Python 3.8+
- pnpm (recommended)

### **Installation:**
```bash
# Install Node.js dependencies
pnpm install

# Install Python dependencies
cd mcp-server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### **Running the Application:**
```bash
# Terminal 1: Start the MCP server
cd mcp-server
source venv/bin/activate
python wendy_mcp_server.py

# Terminal 2: Start the Next.js app
pnpm dev
```

Visit `http://localhost:3000` to access the application.

## 🛠️ Adding New Tools

### **1. Create Tool File**
Create a new file in `services/agent/tools/` (e.g., `add-vendor.ts`):

```typescript
import { getMCPClient } from '../../mcp/client';

export interface AddVendorParams {
  name: string;
  email: string;
  type: 'venue' | 'caterer' | 'photographer';
}

export interface AddVendorResult {
  success: boolean;
  message: string;
  vendorId?: number;
}

export async function addVendor(params: AddVendorParams): Promise<AddVendorResult> {
  try {
    // Your tool implementation here
    return {
      success: true,
      message: `✅ Added vendor: ${params.name}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to add vendor: ${error}`,
    };
  }
}

// Tool metadata
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
        description: 'The vendor email',
      },
      type: {
        type: 'string',
        description: 'The vendor type',
        enum: ['venue', 'caterer', 'photographer'],
      },
    },
    required: ['name', 'email', 'type'],
  },
  execute: addVendor,
};
```

### **2. Register the Tool**
Add to `services/agent/tools/index.ts`:

```typescript
import { addVendorTool } from './add-vendor';

export const TOOL_REGISTRY = {
  send_invite: sendInviteTool,
  update_rsvp: updateRSVPTool,
  add_vendor: addVendorTool, // Add your new tool here
};
```

### **3. Add MCP Server Endpoint**
Add to `mcp-server/wendy_mcp_server.py`:

```python
@app.post("/tools/add_vendor", response_model=AddVendorResponse)
async def add_vendor(request: AddVendorRequest):
    # Your server implementation here
    pass
```

### **4. Update MCP Client**
Add to `services/mcp/client.ts`:

```typescript
async addVendor(name: string, email: string, type: string): Promise<string> {
  // Your client implementation here
}
```

## 📁 Project Structure

```
Wendy/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── (dashboard)/       # Dashboard pages
│   └── context/           # React context
├── components/            # React components
├── services/              # Business logic and services
│   ├── agent/            # AI agent orchestration
│   │   ├── orchestrator.ts
│   │   └── tools/        # Individual tool implementations
│   │       ├── index.ts  # Tool registry
│   │       ├── send-invite.ts
│   │       └── update-rsvp.ts
│   └── mcp/              # MCP server client
│       └── client.ts
├── mcp-server/           # Python MCP server
│   ├── wendy_mcp_server.py
│   ├── requirements.txt
│   └── wedding.db        # SQLite database
└── public/               # Static assets
```

## 🔧 Available Tools

### **send_invite**
- **Purpose**: Send wedding invitations and add guests to database
- **Parameters**: `email` (required), `name` (optional)
- **Usage**: "Invite john@example.com"

### **update_rsvp**
- **Purpose**: Update guest RSVP status
- **Parameters**: `email` (required), `rsvp` (yes/no/maybe)
- **Usage**: "Update RSVP for john@example.com to yes"

## 🗄️ Database

We use a **custom SQLite database** managed by the Python MCP server:

- **Location**: `mcp-server/wedding.db`
- **Schema**: Managed by Python `aiosqlite`
- **Operations**: All database operations go through the MCP server
- **Benefits**: Simple, lightweight, no ORM complexity

## 🎯 Benefits of This Architecture

1. **Modularity**: Each tool is self-contained
2. **Scalability**: Easy to add new tools
3. **Maintainability**: Clear separation of concerns
4. **Testability**: Tools can be tested independently
5. **Flexibility**: AI agent can choose appropriate tools dynamically
6. **Simplicity**: No complex ORM, direct SQL queries

## 🚀 Deployment

### **Local Development**
- MCP server runs on `http://localhost:8000`
- Next.js app runs on `http://localhost:3000`

### **Production**
- Deploy MCP server to cloud (Heroku, Railway, etc.)
- Deploy Next.js app to Vercel/Netlify
- Update MCP client URL for production

## 🤝 Contributing

1. Create new tool files in `services/agent/tools/`
2. Register tools in `services/agent/tools/index.ts`
3. Add corresponding MCP server endpoints
4. Update MCP client if needed
5. Test thoroughly

## 📝 License

MIT License - feel free to use this architecture for your own projects!
