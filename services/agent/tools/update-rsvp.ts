import { getMCPClient } from '../../mcp/client';

export interface UpdateRSVPParams {
  email: string;
  rsvp: 'yes' | 'no' | 'maybe';
}

export interface UpdateRSVPResult {
  success: boolean;
  message: string;
}

export async function updateRSVP(params: UpdateRSVPParams): Promise<UpdateRSVPResult> {
  try {
    const mcpClient = getMCPClient();
    
    // Call the Python server to update RSVP
    const result = await mcpClient.updateRSVP(params.email, params.rsvp);
    
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
    console.error('Error in update_rsvp tool:', error);
    return {
      success: false,
      message: `❌ Failed to update RSVP for ${params.email}: ${error}`,
    };
  }
}

// Tool metadata for the orchestrator
export const updateRSVPTool = {
  name: 'update_rsvp',
  description: 'Update a guest\'s RSVP status (yes, no, maybe)',
  parameters: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'The email address of the guest',
      },
      rsvp: {
        type: 'string',
        description: 'The RSVP status (yes, no, maybe)',
        enum: ['yes', 'no', 'maybe'],
      },
    },
    required: ['email', 'rsvp'],
  },
  execute: updateRSVP,
}; 