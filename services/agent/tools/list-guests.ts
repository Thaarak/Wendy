import { getMCPClient } from '../../mcp/client';

export interface ListGuestsParams {
  rsvp_filter?: 'yes' | 'no' | 'maybe';
}

export interface ListGuestsResult {
  success: boolean;
  message: string;
}

export async function listGuests(params: ListGuestsParams): Promise<ListGuestsResult> {
  try {
    const mcpClient = getMCPClient();
    const result = await mcpClient.listGuests(params.rsvp_filter);
    
    return {
      success: true,
      message: result,
    };
  } catch (error) {
    console.error('Error in list_guests tool:', error);
    return {
      success: false,
      message: `❌ Failed to list guests: ${error}`,
    };
  }
}

// Tool metadata for the orchestrator
export const listGuestsTool = {
  name: 'list_guests',
  description: 'List all guests or filter guests by RSVP status (yes, no, maybe)',
  parameters: {
    type: 'object',
    properties: {
      rsvp_filter: {
        type: 'string',
        description: 'Optional RSVP status filter (yes, no, maybe). If not provided, lists all guests.',
        enum: ['yes', 'no', 'maybe'],
      },
    },
    required: [],
  },
  execute: listGuests,
}; 