import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { WebView } from 'react-native-webview';

export default function PlayerScreen() {
  const params = useLocalSearchParams();
  const { mediaUrl, cookie, referer, origin, drmUrl, userAgent, drmScheme } = params;

  // This HTML loads Video.js and attempts to set it up with DRM if provided.
  // Note: DRM support in WebViews (especially Widevine) can be limited by the mobile OS.
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link href="https://vjs.zencdn.net/8.10.0/video-js.css" rel="stylesheet" />
      <style>
        body { margin: 0; background-color: black; display: flex; align-items: center; justify-content: center; height: 100vh; }
        .video-js { width: 100vw; height: 100vh; }
      </style>
    </head>
    <body>
      <video
        id="my-player"
        class="video-js vjs-default-skin vjs-big-play-centered"
        controls
        preload="auto"
        data-setup='{}'>
      </video>

      <script src="https://vjs.zencdn.net/8.10.0/video.min.js"></script>
      <!-- EME (Encrypted Media Extensions) plugin for DRM -->
      <script src="https://cdn.jsdelivr.net/npm/videojs-contrib-eme@5.4.0/dist/videojs-contrib-eme.min.js"></script>
      
      <script>
        var player = videojs('my-player');
        
        // Initialize EME plugin for DRM
        player.eme();

        // Prepare player source
        var srcConfig = {
          src: "${mediaUrl}",
          // Let video.js auto-detect type, or you could force application/x-mpegURL for HLS
        };

        // If DRM is configured
        if ("${drmUrl}" !== "") {
          var keySystems = {};
          
          if ("${drmScheme}" === "widevine") {
             keySystems['com.widevine.alpha'] = "${drmUrl}";
          } else if ("${drmScheme}" === "playready") {
             keySystems['com.microsoft.playready'] = "${drmUrl}";
          } else if ("${drmScheme}" === "clearkey") {
             keySystems['org.w3.clearkey'] = "${drmUrl}";
          }
          
          srcConfig.keySystems = keySystems;
        }

        player.src(srcConfig);
        player.play();
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Player', headerShown: false }} />
      <WebView
        style={styles.webview}
        source={{ html: htmlContent }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
