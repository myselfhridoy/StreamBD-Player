import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, TouchableWithoutFeedback, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Video, { DRMType, OnLoadData, OnProgressData, ReactVideoSource } from 'react-native-video';
import Slider from '@react-native-community/slider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PlayerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { mediaUrl, cookie, referer, origin, drmUrl, userAgent, drmScheme } = params;

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

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'audio' | 'subs' | 'quality' | 'speed'>('audio');
  
  // Animation & Timers
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!showSettings) {
      startControlsTimeout();
    } else {
      clearControlsTimeout(); // Keep controls visible while settings are open
    }
    return () => clearControlsTimeout();
  }, [paused, showSettings]);

  const clearControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  };

  const startControlsTimeout = () => {
    clearControlsTimeout();
    if (!paused && !showSettings) {
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
    if (showSettings) return; // Don't hide if settings are open
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowControls(false));
  };

  const toggleControls = () => {
    if (showSettings) {
      setShowSettings(false);
      startControlsTimeout();
      return;
    }
    if (showControls) {
      hideControls();
    } else {
      showControlsUI();
    }
  };

  const handleLoad = (data: OnLoadData) => {
    setIsBuffering(false);
    
    // Live detection
    if (!data.duration || data.duration <= 0 || data.duration > 86400) {
      setIsLive(true);
      setDuration(0);
    } else {
      setIsLive(false);
      setDuration(data.duration);
    }

    // Populate Tracks
    if (data.audioTracks) setAudioTracks(data.audioTracks);
    if (data.textTracks) setTextTracks(data.textTracks);
    
    // Filter and sort video tracks (unique resolutions)
    if (data.videoTracks) {
      const uniqueHeights = new Set<number>();
      const filteredVideos = data.videoTracks.filter(t => {
        if (!t.height || uniqueHeights.has(t.height)) return false;
        uniqueHeights.add(t.height);
        return true;
      }).sort((a, b) => b.height - a.height); // Highest resolution first
      setVideoTracks(filteredVideos);
    }
  };

  const cycleResizeMode = () => {
    if (resizeMode === 'contain') setResizeMode('cover');
    else if (resizeMode === 'cover') setResizeMode('stretch');
    else setResizeMode('contain');
    showControlsUI();
  };

  const togglePiP = () => {
    if (Platform.OS === 'web') {
      window.alert('Picture-in-Picture is a native feature and is not supported in the web preview.');
      return;
    }
    setIsPiPActive(true);
    try {
      videoRef.current?.restoreUserInterfaceForPictureInPictureStopCompleted(true);
    } catch (e) {
      console.log('PiP Error:', e);
    }
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
            } as ReactVideoSource}
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

      {/* Settings Modal */}
      {showSettings && (
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsPanel}>
            <View style={styles.settingsSidebar}>
              <Text style={styles.settingsHeader}>Settings</Text>
              {(['audio', 'subs', 'quality', 'speed'] as const).map(tab => (
                <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.activeTabBtn]} onPress={() => setActiveTab(tab)}>
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
      <Animated.View 
        style={[styles.controlsOverlay, { opacity: fadeAnim }]} 
        pointerEvents={showControls && !showSettings ? 'box-none' : 'none'}
      >
        {/* Top Bar */}
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

        {/* Center Controls */}
        <View style={styles.centerControls} pointerEvents="box-none">
          {!isLive && (
            <TouchableOpacity style={styles.centerBtn} onPress={() => { videoRef.current?.seek(Math.max(currentTime - 10, 0)); showControlsUI(); }}>
              <MaterialIcons name="replay-10" size={48} color="#fff" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.playBtn} onPress={() => { setPaused(!paused); showControlsUI(); }}>
            <MaterialIcons name={paused ? "play-arrow" : "pause"} size={64} color="#fff" />
          </TouchableOpacity>
          
          {!isLive && (
            <TouchableOpacity style={styles.centerBtn} onPress={() => { videoRef.current?.seek(currentTime + 10); showControlsUI(); }}>
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
          {/* Bottom Right Controls */}
          <View style={styles.bottomRightControls}>
            <TouchableOpacity style={styles.smallIconButton} onPress={cycleResizeMode}>
              <MaterialIcons 
                name={resizeMode === 'contain' ? 'aspect-ratio' : resizeMode === 'cover' ? 'crop-free' : 'settings-overscan'} 
                size={24} color="#fff" 
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  video: { width: '100%', height: '100%' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  controlsOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', zIndex: 20 },
  topGradient: { height: 100, paddingTop: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between' },
  topRightControls: { flexDirection: 'row', gap: 10 },
  bottomGradient: { height: 120, justifyContent: 'flex-end', paddingBottom: 20, paddingHorizontal: 30 },
  iconButton: { padding: 10, borderRadius: 24 },
  smallIconButton: { padding: 10 },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  centerBtn: { padding: 15, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.4)' },
  playBtn: { padding: 20, borderRadius: 60, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2, borderColor: 'transparent' },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  slider: { flex: 1, height: 40, marginHorizontal: 15 },
  timeText: { color: '#fff', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  liveContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 10 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E50914', marginRight: 6 },
  liveText: { color: '#E50914', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  bottomRightControls: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -15 },
  
  // Settings UI
  settingsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 30, justifyContent: 'center', alignItems: 'center' },
  settingsPanel: { width: '70%', height: '70%', backgroundColor: 'rgba(20,20,25,0.95)', borderRadius: 16, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  settingsSidebar: { width: 140, backgroundColor: 'rgba(0,0,0,0.3)', paddingTop: 20 },
  settingsHeader: { color: '#fff', fontSize: 20, fontWeight: 'bold', paddingHorizontal: 20, marginBottom: 20 },
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
