import { getAgentOrchestrator } from '@/services/agent/orchestrator';

export async function POST(req: Request) {
  const body = await req.json();
  const { message } = body;
  
  if (!message) {
    return new Response(JSON.stringify({ error: 'No message provided' }), { status: 400 });
  }

  try {
    const orchestrator = getAgentOrchestrator();
    const reply = await orchestrator.processMessage(message);
    
    return new Response(JSON.stringify({ reply }), { status: 200 });
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(JSON.stringify({ 
      reply: '❌ Sorry, I encountered an error while processing your request. Please try again.' 
    }), { status: 200 });
  }
} 