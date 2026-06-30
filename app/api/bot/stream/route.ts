import ytdl from '@distube/ytdl-core';
import { requireUser, isAllowedMediaUrl } from '@/lib/bot/guard';

async function getFallbackAudioUrl(videoId: string): Promise<string | null> {
  const invidiousInstances = [
    'vid.puffyan.us',
    'invidious.nerdvpn.de',
    'inv.nadeko.net',
    'invidious.no-logs.com'
  ];
  
  for (const instance of invidiousInstances) {
    try {
      const res = await fetch(`https://${instance}/api/v1/videos/${videoId}?local=true`, {
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        const audioFormats = data.adaptiveFormats?.filter((f: any) => f.type.startsWith('audio')) || [];
        if (audioFormats.length > 0) {
          const bestAudio = audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
          console.log(`[Bot] Found fallback audio URL from Invidious: ${instance}`);
          return bestAudio.url;
        }
      }
    } catch (e) {
      console.warn(`[Bot] Invidious fallback instance ${instance} failed.`);
    }
  }

  const pipedInstances = [
    'pipedapi.kavin.rocks',
    'pipedapi.tokhmi.xyz',
    'api.piped.projectsegfau.lt',
    'pipedapi.in.projectsegfau.lt'
  ];

  for (const instance of pipedInstances) {
    try {
      const res = await fetch(`https://${instance}/streams/${videoId}`, {
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        const audioStreams = data.audioStreams || [];
        if (audioStreams.length > 0) {
          const bestAudio = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
          console.log(`[Bot] Found fallback audio URL from Piped: ${instance}`);
          return bestAudio.url;
        }
      }
    } catch (e) {
      console.warn(`[Bot] Piped fallback instance ${instance} failed.`);
    }
  }

  return null;
}

export async function GET(request: Request) {
  if (!(await requireUser())) {
    return new Response('Unauthorized', { status: 401 });
  }

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
          stream.on('data', (chunk: Uint8Array) => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', (err: Error) => controller.error(err));
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
      
      // 2. Fallback to API
      const fallbackUrl = await getFallbackAudioUrl(v);
      if (!fallbackUrl) {
        throw new Error(`ytdl-core failed (${ytdlError.message}) and all fallbacks failed.`);
      }

      if (!isAllowedMediaUrl(fallbackUrl)) {
        throw new Error('Fallback URL host not allowed');
      }

      const audioRes = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!audioRes.ok || !audioRes.body) {
        throw new Error(`Failed to fetch stream from fallback URL (Status: ${audioRes.status})`);
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
