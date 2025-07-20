import { getMCPClient } from '../../mcp/client';

export interface ProcessEmailResponseParams {
  sender_email: string;
  email_content: string;
}

export interface ProcessEmailResponseResult {
  success: boolean;
  message: string;
}

export async function processEmailResponse(params: ProcessEmailResponseParams): Promise<ProcessEmailResponseResult> {
  try {
    const mcpClient = getMCPClient();
    const result = await mcpClient.processEmailResponse(params.sender_email, params.email_content);
    
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
    console.error('Error in process_email_response tool:', error);
    return {
      success: false,
      message: `❌ Failed to process email response: ${error}`,
    };
  }
}

// Tool metadata for the orchestrator
export const processEmailResponseTool = {
  name: 'process_email_response',
  description: 'Analyze email response and update RSVP if it contains RSVP information',
  parameters: {
    type: 'object',
    properties: {
      sender_email: {
        type: 'string',
        description: 'The email address of the person who sent the response',
      },
      email_content: {
        type: 'string',
        description: 'The content of the email to analyze for RSVP information',
      },
    },
    required: ['sender_email', 'email_content'],
  },
  execute: processEmailResponse,
}; 