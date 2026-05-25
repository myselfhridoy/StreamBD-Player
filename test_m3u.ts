import { parseM3U } from './utils/m3uParser';

const testM3U = `
#EXTM3U
#EXTINF:-1 tvg-name="Welcome to PlayZ TV" group-title="Welcome to PlayZ TV | New App" tvg-logo="https://blogger.googleusercontent.com/img/b/R29vZ2xl/...",Welcome to PlayZ TV
https://playztv.pages.dev/promo/intro-2.mp4
#EXTVLCOPT:http-referrer=http://www.fawanews.sc/
#EXTVLCOPT:http-origin=http://www.fawanews.sc
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
#EXTINF:-1 group-title="Ecuador Liga Pro" tvg-name="Aucas vs Manta" tvg-logo="https://pbs.twimg.com/profile_images/2018798676844453888/qC9fH20A_400x400.jpg",Aucas vs Manta
http://193.47.62.43/hls/CACACADDD.m3u8
#EXTVLCOPT:http-referrer=http://www.fawanews.sc/
#EXTVLCOPT:http-origin=http://www.fawanews.sc
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
`;

const parsed = parseM3U(testM3U);
console.log(JSON.stringify(parsed, null, 2));
