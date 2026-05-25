const parseM3U = (content: string) => {
  const channels = [];
  const lines = content.split('\n');

  let currentChannel: any = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      const commaIndex = line.lastIndexOf(',');
      let name = '';
      if (commaIndex !== -1) name = line.substring(commaIndex + 1).trim();
      else {
        const nameMatch = line.match(/tvg-name="([^"]+)"/);
        name = nameMatch ? nameMatch[1] : 'Unknown Channel';
      }

      currentChannel = {
        name: name,
        logo: logoMatch ? logoMatch[1] : '',
        group: groupMatch ? groupMatch[1] : 'Uncategorized',
        userAgent: '',
        cookie: '',
      };
    } else if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
      if (currentChannel.name) {
        currentChannel.userAgent = line.replace('#EXTVLCOPT:http-user-agent=', '').trim();
      }
    } else if (line.startsWith('#EXTHTTP:')) {
      if (currentChannel.name) {
        try {
          const jsonStr = line.replace('#EXTHTTP:', '').trim();
          const parsedHttp = JSON.parse(jsonStr);
          if (parsedHttp.cookie) {
            currentChannel.cookie = parsedHttp.cookie;
          }
        } catch (e) {}
      }
    } else if (line !== '' && !line.startsWith('#')) {
      if (currentChannel.name) {
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = {}; 
      }
    }
  }
  return channels;
};

const testData = `
#EXTINF:-1 group-title="LIVE" tvg-chno="" tvg-id="" tvg-logo="https://images.toffeelive.com/images/program/19779/logo/240x240/mobile_logo_975410001725875598.png", TOFFEE Sports VIP
#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Linux; Android 9; Redmi S2 Build/PKQ1.181203.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36
#EXTHTTP:{"cookie":"Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9ibGRjbXByb2QtY2RuLnRvZmZlZWxpdmUuY29t:Expires=1779742608:KeyName=prod_linear:Signature=yJ7AyfyL-ZyT1C5AoSZ-7JxfEySOEwI_uk9UjdaC5imswnmiFVkRF8h112jnBusC594E1thR0F-LNGXGg3aVDw"}
https://bldcmprod-cdn.toffeelive.com/cdn/live/sports_highlights/playlist.m3u8
`;

console.log(JSON.stringify(parseM3U(testData), null, 2));
