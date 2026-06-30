const ytSearch = require('yt-search');
async function run() {
  try {
    const r = await ytSearch('thiền lý ơi');
    console.log(r.videos[0].title);
  } catch(e) {
    console.error("ERROR:", e);
  }
}
run();
