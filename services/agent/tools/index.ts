import { sendInviteTool } from './send-invite';
import { updateRSVPTool } from './update-rsvp';

// Tool registry - add new tools here
export const TOOL_REGISTRY = {
  send_invite: sendInviteTool,
  update_rsvp: updateRSVPTool,
  // Add more tools here as you create them
  // add_vendor: addVendorTool,
  // etc.
};

// Export all tools for easy access
export { sendInviteTool } from './send-invite';
export { updateRSVPTool } from './update-rsvp';

// Helper function to get tool by name
export function getTool(name: string) {
  return TOOL_REGISTRY[name as keyof typeof TOOL_REGISTRY];
}

// Helper function to get all tool definitions for the orchestrator
export function getAllToolDefinitions() {
  return Object.values(TOOL_REGISTRY).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

// Helper function to execute a tool
export async function executeTool(name: string, params: any) {
  const tool = getTool(name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return await tool.execute(params);
} 