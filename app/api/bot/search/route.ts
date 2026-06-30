import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/bot/guard';

export async function GET(request: Request) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  try {
    // Custom YouTube Scraper because yt-search package might be broken or blocked
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store'
    });
    
    if (!response.ok) throw new Error('YouTube search request failed');
    
    const html = await response.text();
    
    // Find ytInitialData
    const match = html.match(/ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/);
    if (!match) throw new Error('Could not parse youtube search results (ytInitialData not found)');
    
    const ytData = JSON.parse(match[1]);
    const contents = ytData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
    
    if (!contents) throw new Error('No video results found in parsed data');
    
    for (const item of contents) {
      if (item.videoRenderer) {
        const video = item.videoRenderer;
        return NextResponse.json({
          videoId: video.videoId,
          title: video.title?.runs?.[0]?.text || 'Unknown Title',
          url: `https://youtube.com/watch?v=${video.videoId}`,
          thumbnail: video.thumbnail?.thumbnails?.[0]?.url || '',
          duration: video.lengthText?.simpleText || 'Unknown'
        });
      }
    }
    
    return NextResponse.json({ error: 'No video renderer found in results' }, { status: 404 });
  } catch (error: any) {
    console.error('YouTube Search Scraper Error:', error);
    
    // Fallback to yt-search just in case it works
    try {
      const ytSearch = require('yt-search');
      const result = await ytSearch(q);
      const videos = result.videos;

      if (!videos || videos.length === 0) {
        return NextResponse.json({ error: 'No results found in fallback' }, { status: 404 });
      }

      const firstVideo = videos[0];
      return NextResponse.json({
        videoId: firstVideo.videoId,
        title: firstVideo.title,
        url: firstVideo.url,
        thumbnail: firstVideo.thumbnail,
        duration: firstVideo.timestamp,
      });
    } catch (fallbackError: any) {
       console.error('ytSearch fallback error:', fallbackError);
       return NextResponse.json({ error: error.message || fallbackError.message }, { status: 500 });
    }
  }
}
