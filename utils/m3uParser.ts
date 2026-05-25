export interface Channel {
  name: string;
  logo: string;
  group: string;
  url: string;
  userAgent?: string;
  cookie?: string;
}

export const parseM3U = (content: string): Channel[] => {
  const channels: Channel[] = [];
  const lines = content.split('\n');

  let currentChannel: Partial<Channel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      if (currentChannel && currentChannel.url) {
        channels.push(currentChannel as Channel);
      }

      // Extract properties using regex
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      
      // The channel name is usually after the last comma
      const commaIndex = line.lastIndexOf(',');
      let name = '';
      if (commaIndex !== -1) {
        name = line.substring(commaIndex + 1).trim();
      } else {
        // Fallback: try tvg-name
        const nameMatch = line.match(/tvg-name="([^"]+)"/);
        name = nameMatch ? nameMatch[1] : 'Unknown Channel';
      }

      currentChannel = {
        name: name,
        logo: logoMatch ? logoMatch[1] : '',
        group: groupMatch ? groupMatch[1] : 'Uncategorized',
      };
    } else if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
      if (currentChannel) {
        currentChannel.userAgent = line.replace('#EXTVLCOPT:http-user-agent=', '').trim();
      }
    } else if (line.startsWith('#EXTHTTP:')) {
      if (currentChannel) {
        try {
          const jsonStr = line.replace('#EXTHTTP:', '').trim();
          const parsedHttp = JSON.parse(jsonStr);
          if (parsedHttp.cookie) {
            currentChannel.cookie = parsedHttp.cookie;
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    } else if (!line.startsWith('#')) {
      // This should be the URL line
      if (currentChannel) {
        currentChannel.url = line;
      }
    }
  }

  // Push the last channel if it exists
  if (currentChannel && currentChannel.url) {
    channels.push(currentChannel as Channel);
  }

  return channels;
};
