import { OpenAI } from 'openai';
import { getAllToolDefinitions, executeTool } from './tools';
import { makeVenueReservationTool } from './tools/make-venue-reservation';

// Debug logging utility
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

function log(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[AgentOrchestrator] ${message}`, data ? data : '');
  }
}

function logError(message: string, error?: any) {
  console.error(`[AgentOrchestrator] ERROR: ${message}`, error ? error : '');
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export class AgentOrchestrator {
  private openai: OpenAI;
  private availableTools: ToolDefinition[];
  private lastVenueList: any[] = []; // Store the last venues found
  private pendingReservation: any = null;

  constructor() {
    log('Initializing AgentOrchestrator...');
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logError('OPENAI_API_KEY not found in environment variables');
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({ 
      apiKey: apiKey
    });
    this.availableTools = getAllToolDefinitions();
    log(`AgentOrchestrator initialized with ${this.availableTools.length} available tools:`, this.availableTools.map(t => t.name));
    // Log tool schemas for debugging
    this.availableTools.forEach(tool => {
      log(`Tool schema for ${tool.name}:`, tool);
    });
  }

  async processMessage(userMessage: string): Promise<string> {
    log('Processing user message:', { message: userMessage, timestamp: new Date().toISOString() });

    // Reservation intent detection and missing info prompting with context
    if (/\b(book|reserve|reservation)\b/i.test(userMessage) || this.pendingReservation) {
      // Use pendingReservation if it exists, otherwise start a new one
      const fields: any = this.pendingReservation ? { ...this.pendingReservation } : {};

      // Extract venue_name from message (look for a venue in lastVenueList mentioned in the message)
      if (this.lastVenueList && this.lastVenueList.length > 0) {
        const foundVenue = this.lastVenueList.find(v =>
          v.name && userMessage.toLowerCase().includes(v.name.toLowerCase().slice(0, 8))
        );
        if (foundVenue) {
          fields.venue_name = foundVenue.name;
          fields.venue_email = foundVenue.email;
        }
      }
      // Extract guest_count
      const guestMatch = userMessage.match(/(\d+)\s*(guests|people|attendees)/i);
      if (guestMatch) fields.guest_count = parseInt(guestMatch[1]);
      // Extract event_date
      const dateMatch = userMessage.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) fields.event_date = dateMatch[1];
      // Extract user_name
      const nameMatch = userMessage.match(/my name is ([A-Za-z ]+)/i);
      if (nameMatch) fields.user_name = nameMatch[1].trim();
      // Extract user_email
      const emailMatch = userMessage.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);
      if (emailMatch) fields.user_email = emailMatch[0];
      // Extract budget
      const budgetMatch = userMessage.match(/\$[\d,]+/);
      if (budgetMatch) fields.budget = budgetMatch[0];
      // Extract special_notes (anything after 'notes:' or 'requests:')
      const notesMatch = userMessage.match(/(?:notes|requests)[:\s]+(.+)/i);
      if (notesMatch) fields.special_notes = notesMatch[1].trim();

      // NEW: Parse key-value pairs from the user message (e.g., 'username: thaarak, useremail: ...')
      const kvRegex = /([a-zA-Z_]+)\s*:\s*([^,]+)/g;
      let match;
      while ((match = kvRegex.exec(userMessage)) !== null) {
        let key = match[1].trim().toLowerCase();
        let value = match[2].trim();
        // Normalize keys
        if (key === 'username') key = 'user_name';
        if (key === 'useremail') key = 'user_email';
        if (key === 'guestcount') key = 'guest_count';
        if (key === 'eventdate') key = 'event_date';
        fields[key] = value;
      }

      // Prompt for missing fields
      const required = [
        'user_name',
        'user_email',
        'venue_name',
        'venue_email',
        'budget',
        'guest_count',
        'event_date',
      ];
      const missing = required.filter(f => !fields[f]);
      if (missing.length > 0) {
        this.pendingReservation = fields; // Save progress
        return (
          `To make a reservation, I need the following information: ${missing.join(", ")}. ` +
          `Please provide the missing details in your next message.`
        );
      }
      // All fields present, call the tool directly
      log('Calling make_venue_reservation directly with:', fields);
      const result = await makeVenueReservationTool.execute(fields);
      this.pendingReservation = null; // Clear context after completion
      return result.message;
    }
    
    try {
      // Step 1: Let the AI agent decide which tools to use
      log('Step 1: Deciding which tools to use...');
      const toolCalls = await this.decideToolsToUse(userMessage);
      log(`Tool decision complete. Selected ${toolCalls.length} tools:`, toolCalls.map(t => t.name));
      
      if (toolCalls.length === 0) {
        log('No tools needed, generating simple response...');
        // No tools needed, return a simple response
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: 'You are Wendy, an AI wedding planner. Provide helpful responses about wedding planning.' 
            },
            { role: 'user', content: userMessage },
          ],
        });
        const result = response.choices[0].message.content || 'I\'m here to help with your wedding planning!';
        log('Simple response generated:', { result });
        return result;
      }

      // Step 2: Execute the tools
      log('Step 2: Executing tools...');
      const results = await this.executeTools(toolCalls);
      log('Tool execution complete:', results.map(r => ({ name: r.name, resultLength: r.result.length })));
      
      // Step 3: Generate a response based on tool results
      log('Step 3: Generating final response...');
      const finalResponse = await this.generateResponse(userMessage, toolCalls, results);
      log('Final response generated:', { responseLength: finalResponse.length });
      
      return finalResponse;
      
    } catch (error) {
      logError('Error in agent orchestrator:', error);
      return '❌ Sorry, I encountered an error while processing your request. Please try again.';
    }
  }

  private async decideToolsToUse(userMessage: string): Promise<Array<{name: string, arguments: any}>> {
    log('Making OpenAI API call to decide tools...');
    // Log the user message
    log('User message for tool selection:', userMessage);
    try {
      const toolList = this.availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n');
      const systemPrompt = `You are Wendy, an AI wedding planner. You have access to the following tools. Use them when appropriate to help users with their wedding planning needs.\n\nAvailable tools:\n${toolList}\n\nIf the user's request requires using tools, call the appropriate tool(s). If not, respond naturally without using tools.\n\nEXAMPLES:\n- If the user says they want to book, reserve, or make a reservation at a venue, or use phrases like "book a venue", "reserve a venue", "venue reservation", "venue booking", use the make_venue_reservation tool.\n- If the user says something like: "I want to book Grand Ballroom for 120 guests on 2024-10-15. My name is Alice Smith, my email is alice@example.com, and my budget is $5000.", use the make_venue_reservation tool.\n- If the user asks to search for venues, use the find_venues tool.\n- If the user wants to invite a guest, use the send_invite tool.\n- If the user wants to update RSVP, use the update_rsvp tool.\n`;
      // Log the system prompt
      log('System prompt for tool selection:', systemPrompt);
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          { role: 'user', content: userMessage },
        ],
        functions: this.availableTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
        function_call: 'auto',
      });
      const responseMessage = completion.choices[0].message;
      const toolCalls: Array<{name: string, arguments: any}> = [];
      if (responseMessage.function_call) {
        const toolCall = {
          name: responseMessage.function_call.name,
          arguments: JSON.parse(responseMessage.function_call.arguments || '{}'),
        };
        toolCalls.push(toolCall);
        log('Tool call detected:', toolCall);
        // Log arguments for make_venue_reservation
        if (toolCall.name === 'make_venue_reservation') {
          log('make_venue_reservation tool arguments:', toolCall.arguments);
        }
      } else {
        log('No tool calls detected in response');
      }
      log(`Tool decision complete. Found ${toolCalls.length} tool calls`);
      return toolCalls;
    } catch (error) {
      logError('Error in decideToolsToUse:', error);
      throw error;
    }
  }

  private async executeTools(toolCalls: Array<{name: string, arguments: any}>): Promise<Array<{name: string, result: string}>> {
    log(`Executing ${toolCalls.length} tools...`);
    const results = [];

    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      log(`Executing tool ${i + 1}/${toolCalls.length}: ${toolCall.name}`, { arguments: toolCall.arguments });

      try {
        const startTime = Date.now();
        // Auto-fill venue_email for make_venue_reservation if possible
        if (toolCall.name === 'make_venue_reservation') {
          const args = toolCall.arguments;
          if (args.venue_name && !args.venue_email && this.lastVenueList.length > 0) {
            const venue = this.lastVenueList.find(v =>
              v.name && v.name.toLowerCase().includes(args.venue_name.toLowerCase())
            );
            if (venue && venue.email) {
              args.venue_email = venue.email;
              log('Auto-filled venue_email from lastVenueList:', args.venue_email);
            }
          }
        }
        const result = await executeTool(toolCall.name, toolCall.arguments);
        const executionTime = Date.now() - startTime;

        // If this is find_venues, store the venue list
        if (
          toolCall.name === 'find_venues' &&
          result &&
          typeof result === 'object' &&
          'venues' in result &&
          Array.isArray((result as any).venues)
        ) {
          this.lastVenueList = (result as any).venues;
          log('Stored lastVenueList:', this.lastVenueList);
        }

        const resultString = result.message || result.toString();
        results.push({ 
          name: toolCall.name, 
          result: resultString 
        });

        log(`Tool ${toolCall.name} executed successfully in ${executionTime}ms`, { 
          resultLength: resultString.length,
          executionTime,
          result: resultString.substring(0, 500) + (resultString.length > 500 ? '...' : '') // Log first 500 chars
        });

      } catch (error) {
        logError(`Error executing tool ${toolCall.name}:`, error);
        results.push({ 
          name: toolCall.name, 
          result: `❌ Error executing ${toolCall.name}: ${error}` 
        });
      }
    }

    log(`Tool execution complete. ${results.length} results obtained`);
    return results;
  }

  private async generateResponse(
    userMessage: string, 
    toolCalls: Array<{name: string, arguments: any}>, 
    toolResults: Array<{name: string, result: string}>
  ): Promise<string> {
    log('Generating final response based on tool results...');
    // If the last tool call was find_venues and we have a venue list, reply with the structured venues
    if (
      toolCalls.length > 0 &&
      toolCalls[0].name === 'find_venues' &&
      this.lastVenueList &&
      this.lastVenueList.length > 0
    ) {
      const venueLines = this.lastVenueList.map((venue, idx) => {
        return (
          `${idx + 1}. **${venue.name || 'Unknown Venue'}**\n` +
          (venue.address ? `   Address: ${venue.address}\n` : '') +
          (venue.email ? `   Email: ${venue.email}\n` : '') +
          (venue.phone ? `   Phone: ${venue.phone}\n` : '') +
          (venue.capacity ? `   Capacity: ${venue.capacity}\n` : '') +
          (venue.website ? `   Website: ${venue.website}\n` : '') +
          `\n` // Extra blank line between venues
        );
      });
      return (
        `Here are some wedding venues I found:\n\n` +
        venueLines.join('') +
        `\nLet me know if you'd like to make a reservation at any of these venues!`
      );
    }
    // Parse and log venue info if present in find_venues result
    toolResults.forEach(r => {
      if (r.name === 'find_venues') {
        // Try to extract venue info from the result (look for <venues> XML block)
        const venuesMatch = r.result.match(/<venues>([\s\S]*?)<\/venues>/);
        if (venuesMatch) {
          const venuesBlock = venuesMatch[1];
          // Extract each <venue>...</venue> block
          const venueRegex = /<venue>([\s\S]*?)<\/venue>/g;
          let match;
          const venues: any[] = [];
          while ((match = venueRegex.exec(venuesBlock)) !== null) {
            const venueXml = match[1];
            // Extract fields
            const name = (venueXml.match(/<name>([\s\S]*?)<\/name>/) || [])[1]?.trim();
            const address = (venueXml.match(/<address>([\s\S]*?)<\/address>/) || [])[1]?.trim();
            const email = (venueXml.match(/<email>([\s\S]*?)<\/email>/) || [])[1]?.trim();
            const phone = (venueXml.match(/<phone>([\s\S]*?)<\/phone>/) || [])[1]?.trim();
            const capacity = (venueXml.match(/<capacity>([\s\S]*?)<\/capacity>/) || [])[1]?.trim();
            venues.push({ name, address, email, phone, capacity });
          }
          log('Parsed venues from find_venues result:', venues);
        } else {
          log('No <venues> block found in find_venues result.');
        }
      }
    });
    // Only pass a summary of tool results to avoid token overflow
    const toolResultsText = toolResults.map(r => {
      if (r.name === 'find_venues') {
        // TODO: In the future, extract only the selected venue's details
        return `${r.name}: ${r.result.substring(0, 1000)}... [truncated]`;
      }
      return `${r.name}: ${r.result.substring(0, 1000)}${r.result.length > 1000 ? '... [truncated]' : ''}`;
    }).join('\n');
    log('Tool results summary:', {
      toolCount: toolResults.length,
      totalResultLength: toolResultsText.length,
      toolNames: toolResults.map(r => r.name)
    });
    // Log detailed tool results for debugging
    toolResults.forEach((result, index) => {
      log(`Tool result ${index + 1} - ${result.name}:`, {
        resultLength: result.result.length,
        resultPreview: result.result.substring(0, 200) + (result.result.length > 200 ? '...' : '')
      });
    });
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `You are Wendy, an AI wedding planner. You just executed some tools to help the user. \n\nTool results:\n${toolResultsText}\n\nProvide a helpful, friendly response to the user based on the tool results. Be conversational and wedding-focused. The response shoulf be formatted in a readable manner`
          },
          { role: 'user', content: userMessage },
        ],
      });
      const finalResponse = response.choices[0].message.content || 'I\'ve completed the requested action!';
      log('Final response generated successfully:', { responseLength: finalResponse.length });
      return finalResponse;
    } catch (error) {
      logError('Error generating final response:', error);
      throw error;
    }
  }
}

// Singleton instance
let orchestrator: AgentOrchestrator | null = null;

export function getAgentOrchestrator(): AgentOrchestrator {
  if (!orchestrator) {
    log('Creating new AgentOrchestrator singleton instance');
    orchestrator = new AgentOrchestrator();
  } else {
    log('Returning existing AgentOrchestrator singleton instance');
  }
  return orchestrator;
} 