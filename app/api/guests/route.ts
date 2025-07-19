import { getMCPClient } from '@/services/mcp/client';

export async function GET() {
  try {
    const mcpClient = getMCPClient();
    const guests = await mcpClient.listGuests();
    
    // Transform the data to match the expected format
    const transformedGuests = guests.map((guest: any) => ({
      id: guest.id,
      name: guest.name,
      email: guest.email,
      rsvp: guest.rsvp,
      createdAt: guest.created_at, // Transform created_at to createdAt
    }));
    
    return new Response(JSON.stringify(transformedGuests), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching guests:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch guests' }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 