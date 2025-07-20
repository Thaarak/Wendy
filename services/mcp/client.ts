// Simple HTTP client for MCP server
export class WendyMCPClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async sendInvite(email: string, name?: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/send_invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name: name || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.result || 'Invitation sent successfully';
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw error;
    }
  }

  async updateRSVP(email: string, rsvp: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/update_rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          rsvp,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.result || 'RSVP updated successfully';
    } catch (error) {
      console.error('Error updating RSVP:', error);
      throw error;
    }
  }

  async listGuests(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/resources/list_guests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result || []; // Return the result directly since it's already an array
    } catch (error) {
      console.error('Error listing guests:', error);
      throw error;
    }
  }

  async getGuest(guestId: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/resources/get_guest/${guestId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.resource;
    } catch (error) {
      console.error('Error getting guest:', error);
      throw error;
    }
  }

  async findVenues(location: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/find_venues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.result || 'Venue search completed';
    } catch (error) {
      console.error('Error finding venues:', error);
      throw error;
    }
  }
}

// Singleton instance
let mcpClient: WendyMCPClient | null = null;

export function getMCPClient(): WendyMCPClient {
  if (!mcpClient) {
    mcpClient = new WendyMCPClient();
  }
  return mcpClient;
} 