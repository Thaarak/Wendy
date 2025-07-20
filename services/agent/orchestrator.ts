import { OpenAI } from 'openai';
import { getAllToolDefinitions, executeTool } from './tools';

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

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: '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'
    });
    this.availableTools = getAllToolDefinitions();
  }

  async processMessage(userMessage: string): Promise<string> {
    try {
      // Step 1: Let the AI agent decide which tools to use
      const toolCalls = await this.decideToolsToUse(userMessage);
      
      if (toolCalls.length === 0) {
        // No tools needed, return a simple response
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo-1106',
          messages: [
            { 
              role: 'system', 
              content: 'You are Wendy, an AI wedding planner. Provide helpful responses about wedding planning.' 
            },
            { role: 'user', content: userMessage },
          ],
        });
        return response.choices[0].message.content || 'I\'m here to help with your wedding planning!';
      }

      // Step 2: Execute the tools
      const results = await this.executeTools(toolCalls);
      
      // Step 3: Generate a response based on tool results
      return await this.generateResponse(userMessage, toolCalls, results);
      
    } catch (error) {
      console.error('Error in agent orchestrator:', error);
      return '❌ Sorry, I encountered an error while processing your request. Please try again.';
    }
  }

  async processEmail(senderEmail: string, emailContent: string): Promise<string> {
    try {
      // Step 1: Let the AI agent decide which tools to use for email
      const toolCalls = await this.decideToolsToUseForEmail(senderEmail, emailContent);
      
      if (toolCalls.length === 0) {
        // No tools needed, return a simple response
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo-1106',
          messages: [
            { 
              role: 'system', 
              content: 'You are Wendy, an AI wedding planner. You received an email that doesn\'t contain RSVP information. Provide a brief acknowledgment.' 
            },
            { role: 'user', content: `Email from ${senderEmail}: ${emailContent}` },
          ],
        });
        return response.choices[0].message.content || 'Email received and processed.';
      }

      // Step 2: Execute the tools
      const results = await this.executeTools(toolCalls);
      
      // Step 3: Generate a response based on tool results
      return await this.generateEmailResponse(senderEmail, emailContent, toolCalls, results);
      
    } catch (error) {
      console.error('Error in email processing:', error);
      return '❌ Sorry, I encountered an error while processing the email. Please try again.';
    }
  }

  private async decideToolsToUse(userMessage: string): Promise<Array<{name: string, arguments: any}>> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages: [
        { 
          role: 'system', 
          content: `You are Wendy, an AI wedding planner. You have access to the following tools. Use them when appropriate to help users with their wedding planning needs.

Available tools:
${this.availableTools.map(tool => 
  `- ${tool.name}: ${tool.description}`
).join('\n')}

If the user's request requires using tools, call the appropriate tool(s). If not, respond naturally without using tools.`
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
      toolCalls.push({
        name: responseMessage.function_call.name,
        arguments: JSON.parse(responseMessage.function_call.arguments || '{}'),
      });
    }

    return toolCalls;
  }

  private async decideToolsToUseForEmail(senderEmail: string, emailContent: string): Promise<Array<{name: string, arguments: any}>> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages: [
        { 
          role: 'system', 
          content: `You are Wendy, an AI wedding planner. You received an email that might contain RSVP information. 

Available tools:
${this.availableTools.map(tool => 
  `- ${tool.name}: ${tool.description}`
).join('\n')}

Analyze the email content and determine if it contains RSVP information. If it does, use the appropriate tool to process it.`
        },
        { role: 'user', content: `Email from ${senderEmail}: ${emailContent}` },
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
      toolCalls.push({
        name: responseMessage.function_call.name,
        arguments: JSON.parse(responseMessage.function_call.arguments || '{}'),
      });
    }

    return toolCalls;
  }

  private async executeTools(toolCalls: Array<{name: string, arguments: any}>): Promise<Array<{name: string, result: string}>> {
    const results = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await executeTool(toolCall.name, toolCall.arguments);
        results.push({ 
          name: toolCall.name, 
          result: result.message || result.toString() 
        });
      } catch (error) {
        console.error(`Error executing tool ${toolCall.name}:`, error);
        results.push({ 
          name: toolCall.name, 
          result: `❌ Error executing ${toolCall.name}: ${error}` 
        });
      }
    }

    return results;
  }

  private async generateResponse(
    userMessage: string, 
    toolCalls: Array<{name: string, arguments: any}>, 
    toolResults: Array<{name: string, result: string}>
  ): Promise<string> {
    const toolResultsText = toolResults.map(r => `${r.name}: ${r.result}`).join('\n');
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages: [
        { 
          role: 'system', 
          content: `You are Wendy, an AI wedding planner. You just executed some tools to help the user. 
          
Tool results:
${toolResultsText}

Provide a helpful, friendly response to the user based on the tool results. Be conversational and wedding-focused.`
        },
        { role: 'user', content: userMessage },
      ],
    });

    return response.choices[0].message.content || 'I\'ve completed the requested action!';
  }

  private async generateEmailResponse(
    senderEmail: string,
    emailContent: string, 
    toolCalls: Array<{name: string, arguments: any}>, 
    toolResults: Array<{name: string, result: string}>
  ): Promise<string> {
    const toolResultsText = toolResults.map(r => `${r.name}: ${r.result}`).join('\n');
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages: [
        { 
          role: 'system', 
          content: `You are Wendy, an AI wedding planner. You just processed an email and executed some tools to help with RSVP management. 
          
Email from: ${senderEmail}
Email content: ${emailContent}

Tool results:
${toolResultsText}

Provide a brief, professional response acknowledging the email processing. Be concise and wedding-focused.`
        },
        { role: 'user', content: `Email from ${senderEmail}: ${emailContent}` },
      ],
    });

    return response.choices[0].message.content || 'Email processed successfully!';
  }
}

// Singleton instance
let orchestrator: AgentOrchestrator | null = null;

export function getAgentOrchestrator(): AgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator();
  }
  return orchestrator;
} 