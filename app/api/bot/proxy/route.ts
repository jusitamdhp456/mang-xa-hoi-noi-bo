export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const audioUrl = searchParams.get('url');

    if (!audioUrl) {
      return new Response('Missing audio url', { status: 400 });
    }

    const res = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!res.ok) {
      return new Response('Failed to fetch audio stream', { status: res.status });
    }

    // Proxy the stream back to the client
    const headers = new Headers();
    headers.set('Content-Type', res.headers.get('content-type') || 'audio/webm');
    headers.set('Cache-Control', 'public, max-age=3600');
    
    // Explicitly allow CORS
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');

    return new Response(res.body, {
      headers,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
