import { getMCPClient } from '../../mcp/client';

export interface FindVenuesParams {
  location: string;
}

export interface FindVenuesResult {
  success: boolean;
  message: string;
  venues?: any[];
}

export async function findVenues(params: FindVenuesParams): Promise<FindVenuesResult> {
  try {
    const mcpClient = getMCPClient();
    const result = await mcpClient.findVenues(params.location);
    
    // Check if the result indicates success (contains venue information)
    if (result.includes('<venues>') || result.includes('venue') || !result.includes('❌')) {
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
    console.error('Error in find_venues tool:', error);
    return {
      success: false,
      message: `❌ Failed to find venues in ${params.location}: ${error}`,
    };
  }
}

// Tool metadata for the orchestrator
export const findVenuesTool = {
  name: 'find_venues',
  description: 'Search for wedding venues in a specified location using AI and web search capabilities',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The location to search for wedding venues (e.g., "San Francisco, CA", "New York, NY")',
      },
    },
    required: ['location'],
  },
  execute: findVenues,
}; 