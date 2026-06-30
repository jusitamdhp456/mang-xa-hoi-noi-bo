import { NextResponse } from 'next/server';

// Hàm lấy Client ID động từ trang chủ SoundCloud
async function getSoundcloudClientId(): Promise<string | null> {
  try {
    const res = await fetch('https://soundcloud.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      next: { revalidate: 3600 } // Cache trong 1 giờ để tránh bị block
    });
    const html = await res.text();
    
    // Tìm các thẻ script chứa assets của SoundCloud
    const scriptRegex = /<script crossorigin src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"><\/script>/g;
    let match;
    const scripts = [];
    while ((match = scriptRegex.exec(html)) !== null) {
      scripts.push(match[1]);
    }
    
    // Thường client_id nằm ở các script cuối
    for (const scriptUrl of scripts.reverse().slice(0, 3)) {
      const scriptRes = await fetch(scriptUrl);
      const scriptText = await scriptRes.text();
      const clientIdMatch = scriptText.match(/client_id:"([a-zA-Z0-9]+)"/);
      if (clientIdMatch && clientIdMatch[1]) {
        return clientIdMatch[1];
      }
    }
  } catch (e) {
    console.error('[SoundCloud] Lỗi khi lấy Client ID:', e);
  }
  
  // Fallback client ID (có thể hết hạn nhưng để phòng hờ)
  return 'z8LRYFPM4UK5MMLaBe9vif23aHVz3Xk3';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 });
  }

  try {
    const clientId = await getSoundcloudClientId();
    if (!clientId) {
      throw new Error('Không thể khởi tạo SoundCloud Client ID.');
    }

    // 1. Tìm kiếm bài hát
    const searchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=3`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    if (!searchRes.ok) {
      throw new Error('Lỗi khi tìm kiếm trên SoundCloud API.');
    }
    
    const searchData = await searchRes.json();
    if (!searchData.collection || searchData.collection.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy bài hát nào trên SoundCloud.' }, { status: 404 });
    }

    // Chọn bài hát đầu tiên
    const track = searchData.collection[0];
    
    // 2. Tìm định dạng luồng âm thanh phù hợp (ưu tiên progressive - file mp3 nguyên vẹn)
    const transcodings = track.media.transcodings;
    if (!transcodings || transcodings.length === 0) {
      throw new Error('Bài hát này không hỗ trợ phát (bị khóa hoặc không có file âm thanh).');
    }

    let selectedTranscoding = transcodings.find((t: any) => t.format.protocol === 'progressive');
    if (!selectedTranscoding) {
      selectedTranscoding = transcodings[0]; // Dự phòng lấy định dạng đầu tiên (HLS)
    }

    // 3. Lấy đường link luồng gốc (Direct Stream URL)
    const streamInfoRes = await fetch(`${selectedTranscoding.url}?client_id=${clientId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    if (!streamInfoRes.ok) {
      throw new Error('Không thể phân giải link luồng âm thanh gốc.');
    }

    const streamInfoData = await streamInfoRes.json();
    
    if (!streamInfoData.url) {
      throw new Error('API SoundCloud không trả về đường dẫn nhạc hợp lệ.');
    }

    // Trả về tất cả thông tin cần thiết cho Bot
    return NextResponse.json({
      trackId: track.id.toString(),
      title: track.title,
      artist: track.user?.username || 'Unknown',
      duration: track.duration, // milliseconds
      artworkUrl: track.artwork_url,
      streamUrl: streamInfoData.url // Link này trình duyệt có thể phát trực tiếp không dính CORS!
    });
    
  } catch (error: any) {
    console.error('SoundCloud Search/Stream Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
