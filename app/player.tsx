import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, ActivityIndicator, ScrollView, Dimensions, PanResponder, AppState, useTVEventHandler, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Video, { DRMType, OnLoadData, ReactVideoSource } from 'react-native-video';
import Slider from '@react-native-community/slider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Brightness from 'expo-brightness';
import { VolumeManager } from 'react-native-volume-manager';
import { useSettings } from './context/SettingsContext';

export default function PlayerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { mediaUrl, cookie, referer, origin, drmUrl, userAgent, drmScheme, streamFormat } = params;

  const { settings } = useSettings();
  const videoRef = useRef<Video>(null);
  
  // Basic Playback State
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isLive, setIsLive] = useState(false);
  
  // Advanced Features State
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [textTracks, setTextTracks] = useState<any[]>([]);
  const [videoTracks, setVideoTracks] = useState<any[]>([]);
  
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number | undefined>(undefined);
  const [selectedTextTrack, setSelectedTextTrack] = useState<number>(-1); // -1 = disabled
  const [selectedVideoTrack, setSelectedVideoTrack] = useState<number>(0); // 0 = auto
  
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch'>('contain');
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'audio' | 'subs' | 'quality' | 'speed'>('audio');
  
  // Overlay feedback
  const [overlayText, setOverlayText] = useState('');
  const overlayTimer = useRef<NodeJS.Timeout | null>(null);

  const showOverlayFeedback = (text: string) => {
    setOverlayText(text);
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => setOverlayText(''), 1500);
  };

  // Animation & Timers
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Apply initial Landscape lock if needed
    if (settings.landscapeOnly) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsLandscape(true);
    }
  }, [settings.landscapeOnly]);

  useEffect(() => {
    if (!showSettings) {
      startControlsTimeout();
    } else {
      clearControlsTimeout();
    }
    return () => clearControlsTimeout();
  }, [paused, showSettings]);

  // Auto PiP on AppState background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' && settings.autoPiP && !paused) {
        togglePiP();
      }
    });
    return () => sub.remove();
  }, [settings.autoPiP, paused]);

  // Resume playback logic on unmount
  useEffect(() => {
    return () => {
      if (settings.resumePlay && currentTime > 0 && duration > 0 && !isLive && mediaUrl) {
        AsyncStorage.setItem(`resume_${mediaUrl}`, currentTime.toString()).catch(() => {});
      }
    };
  }, [currentTime, settings.resumePlay, duration, isLive, mediaUrl]);

  // TV D-Pad Support
  const tvSeekTimer = useRef<NodeJS.Timeout | null>(null);
  const tvPausedRef = useRef(false);

  useTVEventHandler((evt) => {
    if (!evt || !evt.eventType) return;
    const key = evt.eventType;
    if (key === 'right' || key === 'left') {
      const delta = key === 'right' ? settings.seekDuration : -settings.seekDuration;
      
      setCurrentTime((prev) => {
        const nextTime = Math.max(0, Math.min(prev + delta, duration || 99999));
        videoRef.current?.seek(nextTime);
        showOverlayFeedback(`${key === 'right' ? '+' : '-'}${settings.seekDuration}s`);
        return nextTime;
      });

      if (!paused && !tvPausedRef.current) {
        setPaused(true);
        tvPausedRef.current = true;
      }
      showControlsUI();

      if (tvSeekTimer.current) clearTimeout(tvSeekTimer.current);
      tvSeekTimer.current = setTimeout(() => {
        if (tvPausedRef.current) {
          setPaused(false);
          tvPausedRef.current = false;
        }
      }, 500);
    } else if (key === 'playPause') {
      setPaused(!paused);
    } else if (key === 'select') {
      if (!showControls && !showSettings) {
        showControlsUI();
      }
    }
  });

  // Gestures (Volume & Brightness)
  const startVal = useRef({ vol: 0, bright: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 15,
      onPanResponderGrant: async () => {
        if (settings.volumeGesture) {
          const v = await VolumeManager.getVolume();
          startVal.current.vol = typeof v === 'number' ? v : v.volume;
        }
        if (settings.brightnessGesture) {
          const { status } = await Brightness.requestPermissionsAsync();
          if (status === 'granted') {
            startVal.current.bright = await Brightness.getBrightnessAsync();
          }
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const { moveX, dy } = gestureState;
        const width = Dimensions.get('window').width;
        const height = Dimensions.get('window').height;
        const delta = -(dy / height); // Swipe up = positive delta

        if (moveX < width / 2 && settings.brightnessGesture) {
          // Left side: Brightness
          let newBright = startVal.current.bright + delta;
          newBright = Math.max(0, Math.min(newBright, 1));
          Brightness.setSystemBrightnessAsync(newBright);
          showOverlayFeedback(`Brightness: ${Math.round(newBright * 100)}%`);
        } else if (moveX >= width / 2 && settings.volumeGesture) {
          // Right side: Volume
          let newVol = startVal.current.vol + delta;
          newVol = Math.max(0, Math.min(newVol, 1));
          VolumeManager.setVolume(newVol);
          showOverlayFeedback(`Volume: ${Math.round(newVol * 100)}%`);
        }
      },
    })
  ).current;

  const clearControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  };

  const startControlsTimeout = () => {
    clearControlsTimeout();
    if (!paused && !showSettings) {
      controlsTimeoutRef.current = setTimeout(() => hideControls(), 4000);
    }
  };

  const showControlsUI = () => {
    setShowControls(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    startControlsTimeout();
  };

  const hideControls = () => {
    if (showSettings) return; 
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true })
      .start(() => setShowControls(false));
  };

  const toggleControls = () => {
    if (showSettings) {
      setShowSettings(false);
      startControlsTimeout();
      return;
    }
    if (showControls) hideControls();
    else showControlsUI();
  };

  const handleLoad = async (data: OnLoadData) => {
    setIsBuffering(false);
    
    // Save to history
    if (mediaUrl) {
      try {
        const existing = await AsyncStorage.getItem('streamHistory');
        let historyList = existing ? JSON.parse(existing) : [];
        historyList = historyList.filter((item: any) => item.url !== mediaUrl);
        historyList.unshift({ 
          url: mediaUrl, cookie, referer, origin, drmUrl, userAgent, drmScheme, streamFormat, timestamp: Date.now() 
        });
        if (historyList.length > 50) historyList.pop();
        await AsyncStorage.setItem('streamHistory', JSON.stringify(historyList));
      } catch (e) { }
    }

    // Resume logic
    if (settings.resumePlay && mediaUrl) {
      try {
        const savedTime = await AsyncStorage.getItem(`resume_${mediaUrl}`);
        if (savedTime && parseFloat(savedTime) > 0) {
          videoRef.current?.seek(parseFloat(savedTime));
        }
      } catch(e) {}
    }
    
    if (!data.duration || data.duration <= 0 || data.duration > 86400) {
      setIsLive(true);
      setDuration(0);
    } else {
      setIsLive(false);
      setDuration(data.duration);
    }

    if (data.audioTracks) setAudioTracks(data.audioTracks);
    if (data.textTracks) setTextTracks(data.textTracks);
    if (data.videoTracks) {
      const uniqueHeights = new Set<number>();
      const filteredVideos = data.videoTracks.filter(t => {
        if (!t.height || uniqueHeights.has(t.height)) return false;
        uniqueHeights.add(t.height);
        return true;
      }).sort((a, b) => b.height - a.height);
      setVideoTracks(filteredVideos);
    }
  };

  const togglePiP = () => {
    if (Platform.OS === 'web') return;
    setIsPiPActive(true);
    try {
      videoRef.current?.restoreUserInterfaceForPictureInPictureStopCompleted(true);
    } catch (e) { }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie as string;
  if (referer) headers['Referer'] = referer as string;
  if (origin) headers['Origin'] = origin as string;
  if (userAgent && userAgent !== 'Default') headers['User-Agent'] = userAgent as string;

  let drmConfig = undefined;
  if (drmUrl) {
    let type = DRMType.WIDEVINE;
    let finalLicenseServer = drmUrl as string;
    
    if (drmScheme === 'playready') type = DRMType.PLAYREADY;
    else if (drmScheme === 'clearkey') {
      type = DRMType.CLEARKEY;
      if (finalLicenseServer.includes(':') && !finalLicenseServer.startsWith('http')) {
        try {
          const [kidHex, keyHex] = finalLicenseServer.split(':');
          const hexToBase64Url = (hex: string) => {
            const bytes = new Uint8Array(hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
            let binary = '';
            bytes.forEach(b => binary += String.fromCharCode(b));
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          };
          const clearkeyJson = {
            keys: [{ kty: 'oct', k: hexToBase64Url(keyHex), kid: hexToBase64Url(kidHex) }],
            type: 'temporary'
          };
          finalLicenseServer = JSON.stringify(clearkeyJson);
        } catch (e) { }
      }
    }
    drmConfig = { type, licenseServer: finalLicenseServer, headers: Object.keys(headers).length > 0 ? headers : undefined };
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Stack.Screen options={{ headerShown: false, navigationBarHidden: true, statusBarHidden: true }} />
      
      <TouchableOpacity activeOpacity={1} style={styles.videoContainer} onPress={toggleControls}>
        <Video
          ref={videoRef}
          source={{ uri: (mediaUrl as string) || '', headers: Object.keys(headers).length > 0 ? headers : undefined, drm: drmConfig, type: (streamFormat && streamFormat !== 'auto') ? streamFormat : undefined } as ReactVideoSource}
          controls={false}
          paused={paused}
          rate={playbackRate}
          resizeMode={resizeMode}
          pictureInPicture={isPiPActive}
          selectedAudioTrack={selectedAudioTrack !== undefined ? { type: 'index', value: selectedAudioTrack } : undefined}
          selectedTextTrack={selectedTextTrack === -1 ? { type: 'disabled' } : { type: 'index', value: selectedTextTrack }}
          selectedVideoTrack={selectedVideoTrack === 0 ? { type: 'auto' } : { type: 'resolution', value: selectedVideoTrack }}
          onLoad={handleLoad}
          onProgress={(data) => setCurrentTime(data.currentTime)}
          onBuffer={({ isBuffering }) => setIsBuffering(isBuffering)}
          onPictureInPictureStatusChanged={(isActive) => setIsPiPActive(isActive.isActive)}
          style={styles.video}
          // Native Patches
          //@ts-ignore
          skipSilence={settings.skipSilence}
          enableTunneling={settings.enableTunneling}
        />
      </TouchableOpacity>

      {/* Loading Indicator */}
      {isBuffering && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      )}

      {/* Overlay Feedback Text */}
      {overlayText !== '' && (
        <View style={styles.feedbackOverlay} pointerEvents="none">
          <Text style={styles.feedbackText}>{overlayText}</Text>
        </View>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsPanel}>
            <View style={styles.settingsSidebar}>
              <Text style={styles.settingsHeader}>Settings</Text>
              {(['audio', 'subs', 'quality', 'speed'] as const).map((tab, idx) => (
                <TouchableOpacity key={tab} hasTVPreferredFocus={idx === 0} style={[styles.tabBtn, activeTab === tab && styles.activeTabBtn]} onPress={() => setActiveTab(tab)}>
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {tab === 'audio' ? 'Audio' : tab === 'subs' ? 'Subtitles' : tab === 'quality' ? 'Quality' : 'Speed'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView style={styles.settingsContent}>
              {activeTab === 'audio' && (
                <>
                  {audioTracks.length === 0 && <Text style={styles.noTracksText}>No alternative audio tracks.</Text>}
                  {audioTracks.map((track, i) => (
                    <TouchableOpacity key={i} style={styles.trackBtn} onPress={() => setSelectedAudioTrack(track.index)}>
                      <MaterialIcons name={selectedAudioTrack === track.index || (selectedAudioTrack === undefined && i === 0) ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                      <Text style={styles.trackText}>{track.language || track.title || `Track ${i + 1}`}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {activeTab === 'subs' && (
                <>
                  <TouchableOpacity style={styles.trackBtn} onPress={() => setSelectedTextTrack(-1)}>
                    <MaterialIcons name={selectedTextTrack === -1 ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                    <Text style={styles.trackText}>Off</Text>
                  </TouchableOpacity>
                  {textTracks.map((track, i) => (
                    <TouchableOpacity key={i} style={styles.trackBtn} onPress={() => setSelectedTextTrack(track.index)}>
                      <MaterialIcons name={selectedTextTrack === track.index ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                      <Text style={styles.trackText}>{track.language || track.title || `Subtitle ${i + 1}`}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {activeTab === 'quality' && (
                <>
                  <TouchableOpacity style={styles.trackBtn} onPress={() => setSelectedVideoTrack(0)}>
                    <MaterialIcons name={selectedVideoTrack === 0 ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                    <Text style={styles.trackText}>Auto</Text>
                  </TouchableOpacity>
                  {videoTracks.map((track, i) => (
                    <TouchableOpacity key={i} style={styles.trackBtn} onPress={() => setSelectedVideoTrack(track.height)}>
                      <MaterialIcons name={selectedVideoTrack === track.height ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                      <Text style={styles.trackText}>{track.height}p</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {activeTab === 'speed' && (
                <>
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
                    <TouchableOpacity key={speed} style={styles.trackBtn} onPress={() => setPlaybackRate(speed)}>
                      <MaterialIcons name={playbackRate === speed ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                      <Text style={styles.trackText}>{speed}x {speed === 1.0 ? '(Normal)' : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.closeSettingsBtn} onPress={() => {setShowSettings(false); startControlsTimeout();}}>
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Custom Controls Overlay */}
      <Animated.View style={[styles.controlsOverlay, { opacity: fadeAnim }]} pointerEvents={showControls && !showSettings ? 'box-none' : 'none'}>
        <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={styles.topGradient}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={32} color="#fff" />
          </TouchableOpacity>
          <View style={styles.topRightControls}>
            <TouchableOpacity style={styles.iconButton} onPress={togglePiP}>
              <MaterialIcons name="picture-in-picture-alt" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => { setShowSettings(true); showControlsUI(); }}>
              <MaterialIcons name="settings" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.centerControls} pointerEvents="box-none">
          {!isLive && (
            <TouchableOpacity style={styles.centerBtn} onPress={() => { videoRef.current?.seek(Math.max(currentTime - settings.seekDuration, 0)); showControlsUI(); }}>
              <MaterialIcons name="replay-10" size={48} color="#fff" />
              <Text style={styles.seekBtnText}>-{settings.seekDuration}s</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity hasTVPreferredFocus={true} style={styles.playBtn} onPress={() => { setPaused(!paused); showControlsUI(); }}>
            <MaterialIcons name={paused ? "play-arrow" : "pause"} size={64} color="#fff" />
          </TouchableOpacity>
          {!isLive && (
            <TouchableOpacity style={styles.centerBtn} onPress={() => { videoRef.current?.seek(currentTime + settings.seekDuration); showControlsUI(); }}>
              <MaterialIcons name="forward-10" size={48} color="#fff" />
              <Text style={styles.seekBtnText}>+{settings.seekDuration}s</Text>
            </TouchableOpacity>
          )}
        </View>

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
                style={styles.slider} minimumValue={0} maximumValue={duration} value={currentTime}
                minimumTrackTintColor="#E50914" maximumTrackTintColor="rgba(255, 255, 255, 0.3)" thumbTintColor="#E50914"
                onSlidingStart={() => clearControlsTimeout()}
                onSlidingComplete={(val) => { videoRef.current?.seek(val); showControlsUI(); }}
              />
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          )}
          <View style={styles.bottomRightControls}>
            <TouchableOpacity style={styles.smallIconButton} onPress={() => {
              setResizeMode(r => r === 'contain' ? 'cover' : r === 'cover' ? 'stretch' : 'contain'); showControlsUI();
            }}>
              <MaterialIcons name={resizeMode === 'contain' ? 'aspect-ratio' : resizeMode === 'cover' ? 'crop-free' : 'settings-overscan'} size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallIconButton} onPress={() => {
              ScreenOrientation.lockAsync(isLandscape ? ScreenOrientation.OrientationLock.PORTRAIT_UP : ScreenOrientation.OrientationLock.LANDSCAPE);
              setIsLandscape(!isLandscape); showControlsUI();
            }}>
              <MaterialIcons name={isLandscape ? 'screen-lock-portrait' : 'screen-rotation'} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', width: '100%', height: '100%' },
  videoContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  video: { width: '100%', height: '100%' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  feedbackOverlay: { position: 'absolute', top: '20%', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 15, borderRadius: 10, zIndex: 40 },
  feedbackText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  controlsOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', justifyContent: 'space-between', zIndex: 20, elevation: 10 },
  topGradient: { height: 100, paddingTop: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  topRightControls: { flexDirection: 'row', gap: 10 },
  bottomGradient: { height: 120, justifyContent: 'flex-end', paddingBottom: 20, paddingHorizontal: 30, width: '100%' },
  iconButton: { padding: 10, borderRadius: 24 },
  smallIconButton: { padding: 10 },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40, width: '100%' },
  centerBtn: { padding: 15, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center' },
  seekBtnText: { color: '#fff', fontSize: 12, marginTop: 4, fontWeight: 'bold' },
  playBtn: { padding: 20, borderRadius: 60, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2, borderColor: 'transparent' },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, width: '100%' },
  slider: { flex: 1, height: 40, marginHorizontal: 15 },
  timeText: { color: '#fff', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  liveContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 10 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E50914', marginRight: 6 },
  liveText: { color: '#E50914', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  bottomRightControls: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -15, width: '100%' },
  settingsOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 30, justifyContent: 'center', alignItems: 'center', elevation: 20 },
  settingsPanel: { width: '85%', maxWidth: 600, height: '75%', maxHeight: 400, backgroundColor: 'rgba(20,20,25,0.95)', borderRadius: 16, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  settingsSidebar: { width: '35%', maxWidth: 160, backgroundColor: 'rgba(0,0,0,0.3)', paddingTop: 20 },
  settingsHeader: { color: '#fff', fontSize: 18, fontWeight: 'bold', paddingHorizontal: 15, marginBottom: 20 },
  tabBtn: { paddingVertical: 15, paddingHorizontal: 20 },
  activeTabBtn: { backgroundColor: 'rgba(229,9,20,0.15)', borderLeftWidth: 4, borderLeftColor: '#E50914' },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600' },
  activeTabText: { color: '#fff' },
  settingsContent: { flex: 1, padding: 20 },
  closeSettingsBtn: { position: 'absolute', top: 15, right: 15, padding: 5 },
  trackBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  trackText: { color: '#fff', fontSize: 16, marginLeft: 15 },
  noTracksText: { color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginTop: 20 },
});
