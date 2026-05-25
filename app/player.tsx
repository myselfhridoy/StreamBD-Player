import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import Video, { DRMType } from 'react-native-video';

export default function PlayerScreen() {
  const params = useLocalSearchParams();
  const { mediaUrl, cookie, referer, origin, drmUrl, userAgent, drmScheme } = params;

  const videoRef = useRef<Video>(null);

  // Construct headers if any are provided
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie as string;
  if (referer) headers['Referer'] = referer as string;
  if (origin) headers['Origin'] = origin as string;
  if (userAgent && userAgent !== 'Default') headers['User-Agent'] = userAgent as string;

  // Configure DRM if a license URL is provided
  let drmConfig = undefined;
  if (drmUrl) {
    let type = DRMType.WIDEVINE;
    if (drmScheme === 'playready') type = DRMType.PLAYREADY;
    else if (drmScheme === 'clearkey') type = DRMType.CLEARKEY;
    else if (drmScheme === 'fairplay') type = DRMType.FAIRPLAY;

    drmConfig = {
      type,
      licenseServer: drmUrl as string,
    };
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Player', headerShown: false }} />
      <Video
        ref={videoRef}
        source={{
          uri: (mediaUrl as string) || '',
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          drm: drmConfig,
        }}
        controls={true}
        resizeMode="contain"
        style={styles.video}
        onError={(e) => console.log('Video Error:', e)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
});
