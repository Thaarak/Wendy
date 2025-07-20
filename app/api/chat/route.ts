export async function POST(req: Request) {
  const body = await req.json();
  const { message } = body;

  if (!message) {
    return new Response(JSON.stringify({ error: 'No message provided' }), { status: 400 });
  }

  // Proxy to backend /agent endpoint
  const backendRes = await fetch('http://localhost:8000/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const data = await backendRes.json();

  // Return the agent's reply/result
  return new Response(
    JSON.stringify({ reply: data.reply || data.result || '(No response)' }),
    { status: 200 }
  );
} 