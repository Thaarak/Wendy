import { getMCPClient } from '../../mcp/client';

export interface SendInviteParams {
  email: string;
  name?: string;
}

export interface SendInviteResult {
  success: boolean;
  message: string;
  guestId?: number;
}

export async function sendInvite(params: SendInviteParams): Promise<SendInviteResult> {
  try {
    const mcpClient = getMCPClient();
    const result = await mcpClient.sendInvite(params.email, params.name);
    
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
    console.error('Error in send_invite tool:', error);
    return {
      success: false,
      message: `❌ Failed to send invitation to ${params.email}: ${error}`,
    };
  }
}

// Tool metadata for the orchestrator
export const sendInviteTool = {
  name: 'send_invite',
  description: 'Send a wedding invitation email to a guest and add them to the guest list database',
  parameters: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'The email address of the guest to invite',
      },
      name: {
        type: 'string',
        description: 'Optional name for the guest (if not provided, email will be used)',
      },
    },
    required: ['email'],
  },
  execute: sendInvite,
}; 