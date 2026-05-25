import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, TouchableWithoutFeedback, BackHandler, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Video, { DRMType, OnLoadData, OnProgressData } from 'react-native-video';
import Slider from '@react-native-community/slider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PlayerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { mediaUrl, cookie, referer, origin, drmUrl, userAgent, drmScheme } = params;

  const videoRef = useRef<Video>(null);
  
  // State
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isLive, setIsLive] = useState(false);
  
  // Animation & Timers
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Focus state for TV
  const [focusedBtn, setFocusedBtn] = useState<string | null>(null);

  useEffect(() => {
    startControlsTimeout();
    return () => clearControlsTimeout();
  }, [paused]);

  const clearControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  };

  const startControlsTimeout = () => {
    clearControlsTimeout();
    if (!paused) {
      controlsTimeoutRef.current = setTimeout(() => {
        hideControls();
      }, 4000);
    }
  };

  const showControlsUI = () => {
    setShowControls(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    startControlsTimeout();
  };

  const hideControls = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowControls(false));
  };

  const toggleControls = () => {
    if (showControls) {
      hideControls();
    } else {
      showControlsUI();
    }
  };

  const handleLoad = (data: OnLoadData) => {
    setIsBuffering(false);
    // If duration is 0, negative, or extremely large, treat as LIVE
    if (!data.duration || data.duration <= 0 || data.duration > 86400) {
      setIsLive(true);
      setDuration(0);
    } else {
      setIsLive(false);
      setDuration(data.duration);
    }
  };

  const handleProgress = (data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  };

  const skipForward = () => {
    videoRef.current?.seek(currentTime + 10);
    showControlsUI();
  };

  const skipBackward = () => {
    videoRef.current?.seek(Math.max(currentTime - 10, 0));
    showControlsUI();
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Construct headers
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie as string;
  if (referer) headers['Referer'] = referer as string;
  if (origin) headers['Origin'] = origin as string;
  if (userAgent && userAgent !== 'Default') headers['User-Agent'] = userAgent as string;

  // Configure DRM
  let drmConfig = undefined;
  if (drmUrl) {
    let type = DRMType.WIDEVINE;
    if (drmScheme === 'playready') type = DRMType.PLAYREADY;
    else if (drmScheme === 'clearkey') type = DRMType.CLEARKEY;
    drmConfig = { type, licenseServer: drmUrl as string };
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, navigationBarHidden: true, statusBarHidden: true }} />
      
      <TouchableWithoutFeedback onPress={toggleControls}>
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{
              uri: (mediaUrl as string) || '',
              headers: Object.keys(headers).length > 0 ? headers : undefined,
              drm: drmConfig,
            }}
            controls={false}
            paused={paused}
            onLoad={handleLoad}
            onProgress={handleProgress}
            onBuffer={({ isBuffering }) => setIsBuffering(isBuffering)}
            resizeMode="contain"
            style={styles.video}
            onError={(e) => console.log('Video Error:', e)}
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Loading Indicator */}
      {isBuffering && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      )}

      {/* Custom Controls Overlay */}
      <Animated.View 
        style={[styles.controlsOverlay, { opacity: fadeAnim }]} 
        pointerEvents={showControls ? 'box-none' : 'none'}
      >
        {/* Top Bar */}
        <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={styles.topGradient}>
          <TouchableOpacity 
            style={[styles.iconButton, focusedBtn === 'back' && styles.focusedBtn]}
            onPress={() => router.back()}
            onFocus={() => setFocusedBtn('back')}
            onBlur={() => setFocusedBtn(null)}
          >
            <MaterialIcons name="arrow-back" size={32} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Center Controls */}
        <View style={styles.centerControls} pointerEvents="box-none">
          {!isLive && (
            <TouchableOpacity 
              style={[styles.centerBtn, focusedBtn === 'rewind' && styles.focusedBtn]} 
              onPress={skipBackward}
              onFocus={() => setFocusedBtn('rewind')}
              onBlur={() => setFocusedBtn(null)}
            >
              <MaterialIcons name="replay-10" size={48} color="#fff" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.playBtn, focusedBtn === 'play' && styles.focusedBtn]} 
            onPress={() => { setPaused(!paused); showControlsUI(); }}
            hasTVPreferredFocus={showControls}
            onFocus={() => setFocusedBtn('play')}
            onBlur={() => setFocusedBtn(null)}
          >
            <MaterialIcons name={paused ? "play-arrow" : "pause"} size={64} color="#fff" />
          </TouchableOpacity>
          
          {!isLive && (
            <TouchableOpacity 
              style={[styles.centerBtn, focusedBtn === 'forward' && styles.focusedBtn]} 
              onPress={skipForward}
              onFocus={() => setFocusedBtn('forward')}
              onBlur={() => setFocusedBtn(null)}
            >
              <MaterialIcons name="forward-10" size={48} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Bar */}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.bottomGradient}>
          {isLive ? (
            <View style={styles.liveContainer}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : (
            <View style={styles.sliderContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration}
                value={currentTime}
                minimumTrackTintColor="#E50914"
                maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                thumbTintColor="#E50914"
                onSlidingStart={() => clearControlsTimeout()}
                onSlidingComplete={(val) => {
                  videoRef.current?.seek(val);
                  showControlsUI();
                }}
              />
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  video: { width: '100%', height: '100%' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 20,
  },
  topGradient: {
    height: 100,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  bottomGradient: {
    height: 120,
    justifyContent: 'flex-end',
    paddingBottom: 30,
    paddingHorizontal: 30,
  },
  iconButton: {
    padding: 10,
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  centerBtn: {
    padding: 15,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  playBtn: {
    padding: 20,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  focusedBtn: {
    borderColor: '#fff',
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 15,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E50914',
    marginRight: 6,
  },
  liveText: {
    color: '#E50914',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
});
