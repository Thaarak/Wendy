import { OpenAI } from 'openai';
import { getAllToolDefinitions, executeTool } from './tools';

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
  }

  async processMessage(userMessage: string): Promise<string> {
    log('Processing user message:', { message: userMessage, timestamp: new Date().toISOString() });
    
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
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
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
        const toolCall = {
          name: responseMessage.function_call.name,
          arguments: JSON.parse(responseMessage.function_call.arguments || '{}'),
        };
        toolCalls.push(toolCall);
        log('Tool call detected:', toolCall);
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
        const result = await executeTool(toolCall.name, toolCall.arguments);
        const executionTime = Date.now() - startTime;
        
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
    const toolResultsText = toolResults.map(r => `${r.name}: ${r.result}`).join('\n');
    
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
            content: `You are Wendy, an AI wedding planner. You just executed some tools to help the user. 
            
Tool results:
${toolResultsText}

Provide a helpful, friendly response to the user based on the tool results. Be conversational and wedding-focused. The response shoulf be formatted in a readable manner`
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