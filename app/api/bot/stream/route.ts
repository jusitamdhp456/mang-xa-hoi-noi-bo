import ytdl from '@distube/ytdl-core';

async function getInvidiousAudioUrl(videoId: string): Promise<string | null> {
  const instances = [
    'vid.puffyan.us',
    'invidious.nerdvpn.de',
    'inv.nadeko.net',
    'invidious.no-logs.com'
  ];
  
  for (const instance of instances) {
    try {
      const res = await fetch(`https://${instance}/api/v1/videos/${videoId}`);
      if (res.ok) {
        const data = await res.json();
        const audioFormats = data.adaptiveFormats?.filter((f: any) => f.type.startsWith('audio')) || [];
        if (audioFormats.length > 0) {
          const bestAudio = audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
          return bestAudio.url;
        }
      }
    } catch (e) {
      console.warn(`[Bot] Invidious fallback instance ${instance} failed.`);
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const v = searchParams.get('v');

  if (!v) {
    return new Response('Missing v parameter', { status: 400 });
  }

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${v}`;
    
    try {
      // 1. Try ytdl-core first
      const info = await ytdl.getInfo(videoUrl);
      const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
      const stream = ytdl(videoUrl, { format: audioFormat });
      
      const readable = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        },
        cancel() {
          stream.destroy();
        }
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'audio/mp4',
          'Transfer-Encoding': 'chunked',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (ytdlError: any) {
      console.warn('[Bot] ytdl-core failed, attempting fallback...', ytdlError.message);
      
      // 2. Fallback to Invidious API
      const fallbackUrl = await getInvidiousAudioUrl(v);
      if (!fallbackUrl) {
        throw new Error(`ytdl-core failed (${ytdlError.message}) and all Invidious fallbacks failed.`);
      }
      
      const audioRes = await fetch(fallbackUrl);
      if (!audioRes.ok || !audioRes.body) {
        throw new Error('Failed to fetch stream from fallback URL');
      }
      
      return new Response(audioRes.body, {
        headers: {
          'Content-Type': 'audio/mp4',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (error: any) {
    console.error('YouTube Stream Error:', error);
    return new Response(error.message, { status: 500 });
  }
}
