import { getAgentOrchestrator } from '../../../services/agent/orchestrator';

export async function POST(request: Request) {
  try {
    const { sender_email, email_content } = await request.json();
    
    if (!sender_email || !email_content) {
      return Response.json(
        { error: 'Missing required fields: sender_email and email_content' },
        { status: 400 }
      );
    }

    const orchestrator = getAgentOrchestrator();
    const reply = await orchestrator.processEmail(sender_email, email_content);
    
    return Response.json({ reply });
  } catch (error) {
    console.error('Error processing email:', error);
    return Response.json(
      { error: 'Failed to process email' },
      { status: 500 }
    );
  }
} 