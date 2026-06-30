import ytdl from '@distube/ytdl-core';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const v = searchParams.get('v');

  if (!v) {
    return new Response('Missing v parameter', { status: 400 });
  }

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${v}`;
    const info = await ytdl.getInfo(videoUrl);
    
    // Lấy luồng âm thanh tốt nhất có sẵn
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

    // Stream từ ytdl là chuẩn Node.js Readable Stream
    const stream = ytdl(videoUrl, { format: audioFormat });
    
    // Chuyển đổi sang Web ReadableStream để hỗ trợ cho Response của Next.js
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
        // Thông báo định dạng chung, trình duyệt sẽ tự handle
        'Content-Type': 'audio/mp4', // Hầu hết youtube highestaudio là mp4a
        'Transfer-Encoding': 'chunked',
        // Cấp quyền CORS nếu cần
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    console.error('YouTube Stream Error:', error);
    return new Response(error.message, { status: 500 });
  }
}
