import { getMCPClient } from '../../mcp/client';

export interface MakeVenueReservationParams {
  user_name: string;
  user_email: string;
  venue_name: string;
  venue_email: string;
  budget: string;
  guest_count: number;
  event_date: string;
  special_notes?: string;
}

export interface MakeVenueReservationResult {
  success: boolean;
  message: string;
  reservationId?: number;
  error?: string;
}

export async function makeVenueReservation(params: MakeVenueReservationParams): Promise<MakeVenueReservationResult> {
  try {
    // Map event_date to date for backend compatibility
    const mcpClient = getMCPClient();
    const result = await mcpClient.makeVenueReservation({
      ...params,
      date: params.event_date,
    });
    if (result.result && result.result.startsWith('✅')) {
      return {
        success: true,
        message: result.result,
        reservationId: result.reservation_id,
      };
    } else {
      return {
        success: false,
        message: result.result || 'Reservation failed',
        reservationId: result.reservation_id,
        error: result.error,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: '❌ Failed to make venue reservation',
      error: error?.message || String(error),
    };
  }
}

export const makeVenueReservationTool = {
  name: 'make_venue_reservation',
  description:
    'Use this tool whenever the user asks to book, reserve, or make a reservation at a wedding venue. This tool will send an AI-generated reservation request email to the specified venue on behalf of the user and log the attempt. Required fields: user_name (the person making the reservation), user_email (their email), venue_name (the venue to book), venue_email (venue contact email), budget (user budget for the venue), guest_count (expected number of guests), event_date (desired date for the event, YYYY-MM-DD), and special_notes (any additional requests or information). Example user requests: "Book Grand Ballroom for 120 guests on 2024-10-15", "Reserve a venue for my wedding", "Make a reservation at The Plaza Hotel".',
  parameters: {
    type: 'object',
    properties: {
      user_name: { type: 'string', description: 'Name of the person making the reservation' },
      user_email: { type: 'string', description: 'Email of the person making the reservation' },
      venue_name: { type: 'string', description: 'Name of the venue to book or reserve' },
      venue_email: { type: 'string', description: 'Email address of the venue' },
      budget: { type: 'string', description: 'Budget for the venue' },
      guest_count: { type: 'number', description: 'Estimated guest count' },
      event_date: { type: 'string', description: 'Desired reservation date (YYYY-MM-DD)' },
      special_notes: { type: 'string', description: 'Any special notes or requests', nullable: true },
    },
    required: ['user_name', 'user_email', 'venue_name', 'venue_email', 'budget', 'guest_count', 'event_date'],
  },
  execute: makeVenueReservation,
}; 