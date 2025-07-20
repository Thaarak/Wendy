import { getMCPClient } from '@/services/mcp/client';

export async function GET() {
  try {
    // Use the resources endpoint that returns actual guest data
    const response = await fetch('http://localhost:8000/resources/list_guests');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const guests = await response.json();
    
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