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

  async listGuests(rsvpFilter?: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/list_guests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rsvp_filter: rsvpFilter || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.result || 'Guests listed successfully';
    } catch (error) {
      console.error('Error listing guests:', error);
      throw error;
    }
  }

  async followUp(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/follow_up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.result || 'Follow-up emails sent successfully';
    } catch (error) {
      console.error('Error sending follow-up emails:', error);
      throw error;
    }
  }

  async processEmailResponse(senderEmail: string, emailContent: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/process_email_response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_email: senderEmail,
          email_content: emailContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.result || 'Email processed successfully';
    } catch (error) {
      console.error('Error processing email response:', error);
      throw error;
    }
  }

  async startEmailMonitoring(intervalMinutes: number = 5): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/start_email_monitoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interval_minutes: intervalMinutes,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.result || 'Email monitoring started successfully';
    } catch (error) {
      console.error('Error starting email monitoring:', error);
      throw error;
    }
  }

  async stopEmailMonitoring(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/stop_email_monitoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.result || 'Email monitoring stopped successfully';
    } catch (error) {
      console.error('Error stopping email monitoring:', error);
      throw error;
    }
  }

  async manualEmailCheck(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/manual_email_check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.result || 'Manual email check completed successfully';
    } catch (error) {
      console.error('Error performing manual email check:', error);
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
}

// Singleton instance
let mcpClient: WendyMCPClient | null = null;

export function getMCPClient(): WendyMCPClient {
  if (!mcpClient) {
    mcpClient = new WendyMCPClient();
  }
  return mcpClient;
} 