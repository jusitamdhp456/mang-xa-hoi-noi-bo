import { NextResponse } from 'next/server';
import ytSearch from 'yt-search';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  try {
    const result = await ytSearch(q);
    const videos = result.videos;

    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: 'No results found' }, { status: 404 });
    }

    const firstVideo = videos[0];
    
    return NextResponse.json({
      videoId: firstVideo.videoId,
      title: firstVideo.title,
      url: firstVideo.url,
      thumbnail: firstVideo.thumbnail,
      duration: firstVideo.timestamp,
    });
  } catch (error: any) {
    console.error('YouTube Search Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
