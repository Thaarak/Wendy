import { getMCPClient } from '../../mcp/client';

export interface FindVenuesParams {
  location: string;
}

export interface VenueInfo {
  name?: string;
  address?: string;
  email?: string;
  phone?: string;
  capacity?: string;
}

export interface FindVenuesResult {
  success: boolean;
  message: string;
  venues?: VenueInfo[];
}

export async function findVenues(params: FindVenuesParams): Promise<FindVenuesResult> {
  try {
    const mcpClient = getMCPClient();
    const result = await mcpClient.findVenues(params.location);

    // Parse <venues> XML block
    const venues: VenueInfo[] = [];
    const venuesMatch = result.match(/<venues>([\s\S]*?)<\/venues>/);
    if (venuesMatch) {
      const venuesBlock = venuesMatch[1];
      const venueRegex = /<venue>([\s\S]*?)<\/venue>/g;
      let match;
      while ((match = venueRegex.exec(venuesBlock)) !== null) {
        const venueXml = match[1];
        const name = (venueXml.match(/<name>([\s\S]*?)<\/name>/) || [])[1]?.trim();
        const address = (venueXml.match(/<address>([\s\S]*?)<\/address>/) || [])[1]?.trim();
        const email = (venueXml.match(/<email>([\s\S]*?)<\/email>/) || [])[1]?.trim();
        const phone = (venueXml.match(/<phone>([\s\S]*?)<\/phone>/) || [])[1]?.trim();
        const capacity = (venueXml.match(/<capacity>([\s\S]*?)<\/capacity>/) || [])[1]?.trim();
        venues.push({ name, address, email, phone, capacity });
      }
    }

    return {
      success: true,
      message: result,
      venues,
    };
  } catch (error) {
    console.error('Error in find_venues tool:', error);
    return {
      success: false,
      message: `❌ Failed to find venues in ${params.location}: ${error}`,
      venues: [],
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