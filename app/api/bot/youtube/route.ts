import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/bot/guard';

export async function GET(request: Request) {
  try {
    if (!(await requireUser())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }

    // 1. Search for video using Invidious API
    const searchUrl = `https://vid.puffyan.us/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
    const searchRes = await fetch(searchUrl);
    
    if (!searchRes.ok) {
      return NextResponse.json({ error: 'Failed to search YouTube' }, { status: 500 });
    }
    
    const searchData = await searchRes.json();
    if (!searchData || searchData.length === 0) {
      return NextResponse.json({ error: 'No results found' }, { status: 404 });
    }

    const videoId = searchData[0].videoId;
    const title = searchData[0].title;
    const thumbnail = searchData[0].videoThumbnails?.[0]?.url;

    // 2. Get video details and audio stream URL
    const videoUrl = `https://vid.puffyan.us/api/v1/videos/${videoId}`;
    const videoRes = await fetch(videoUrl);
    
    if (!videoRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch video details' }, { status: 500 });
    }
    
    const videoData = await videoRes.json();
    
    // Find the best audio stream
    const audioFormats = videoData.adaptiveFormats?.filter((f: any) => f.type.startsWith('audio')) || [];
    if (audioFormats.length === 0) {
      return NextResponse.json({ error: 'No audio stream found' }, { status: 404 });
    }
    
    // Sort by bitrate descending or just pick the first one
    const bestAudio = audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    return NextResponse.json({
      videoId,
      title,
      thumbnail,
      audioUrl: bestAudio.url,
      mimeType: bestAudio.type
    });
  } catch (error) {
    console.error('YouTube API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
