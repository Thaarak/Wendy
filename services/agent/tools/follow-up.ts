import { getMCPClient } from '../../mcp/client';

export interface FollowUpParams {
  // No parameters needed
}

export interface FollowUpResult {
  success: boolean;
  message: string;
}

export async function followUp(params: FollowUpParams): Promise<FollowUpResult> {
  try {
    const mcpClient = getMCPClient();
    const result = await mcpClient.followUp();
    
    // Check if the result indicates success
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
    console.error('Error in follow_up tool:', error);
    return {
      success: false,
      message: `❌ Failed to send follow-up emails: ${error}`,
    };
  }
}

// Tool metadata for the orchestrator
export const followUpTool = {
  name: 'follow_up',
  description: 'Send follow-up emails to all guests with "maybe" RSVP status',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: followUp,
}; 