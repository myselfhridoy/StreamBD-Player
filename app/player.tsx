import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import * as Brightness from 'expo-brightness';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, Animated, AppState, Dimensions, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, AccessibilityInfo, BackHandler } from 'react-native';

const RN = require('react-native');
const TVFocusGuideView = RN.TVFocusGuideView || View;

import Video, { DRMType, OnLoadData, ReactVideoSource, SelectedTrackType, SelectedVideoTrackType, VideoRef } from 'react-native-video';
import { VolumeManager } from 'react-native-volume-manager';
import Text from '../components/Text';
import { resolveCustomTokenUrl } from '../utils/tokenParser';
import { hexToBase64Url } from '../utils/drm';
import { usePlaylist } from './context/PlaylistContext';
import { useSettings } from './context/SettingsContext';
import { TVTouchable, isTV } from '../components/tv';
;

export default function PlayerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { mediaUrl, cookie, referer, origin, drmUrl, userAgent, drmScheme, streamFormat, channelName, channelLogo, channelGroup, fromHome, isLiveEvent, tokenUrl, tokenMatch, tokenReplace, tokenId, isVod, vodSourceIndex } = params;

  const { settings } = useSettings();
  const { nextChannel, prevChannel } = usePlaylist();
  const videoRef = useRef<VideoRef>(null);

  // Basic Playback State
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Advanced Features State
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [textTracks, setTextTracks] = useState<any[]>([]);
  const [videoTracks, setVideoTracks] = useState<any[]>([]);

  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number | undefined>(undefined);
  const [selectedTextTrack, setSelectedTextTrack] = useState<number>(-1); // -1 = disabled
  const [selectedVideoTrack, setSelectedVideoTrack] = useState<number>(0); // 0 = auto

  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch' | 'auto'>('auto');
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isLandscape, setIsLandscape] = useState(settings?.landscapeOnly || false);
  const activeResizeMode = resizeMode === 'auto' ? (isLandscape ? 'stretch' : 'contain') : resizeMode;

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'audio' | 'subs' | 'quality' | 'speed' | 'sources'>('audio');
  const [vodSources, setVodSources] = useState<any[]>([]);
  const [currentVodIndex, setCurrentVodIndex] = useState<number>(0);

  const [playerError, setPlayerError] = useState<{ title: string, message: string } | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Seek Debounce
  const seekTimeout = useRef<any>(null);
  const handleSeek = useCallback((newTime: number, currentDuration: number) => {
    if (currentDuration <= 0) return;
    const finalTime = Math.max(0, Math.min(newTime, currentDuration));
    
    if (seekTimeout.current) clearTimeout(seekTimeout.current);
    seekTimeout.current = setTimeout(() => {
      videoRef.current?.seek(finalTime);
    }, 250);
  }, []);

  // Overlay feedback
  const [overlayText, setOverlayText] = useState('');
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showOverlayFeedback = (text: string) => {
    setOverlayText(text);
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => setOverlayText(''), 1500);
  };

  // Animation & Timers
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    checkFavoriteStatus();
    saveToHistory();
    // Apply initial Landscape lock if needed
    if (settings.landscapeOnly && !isTV) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsLandscape(true);
    }

    return () => {
      if (!isTV) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    };
  }, [settings.landscapeOnly, mediaUrl]);

  const saveToHistory = async () => {
    if (!mediaUrl || fromHome !== 'true') return;
    try {
      const data = await AsyncStorage.getItem('streamHistory');
      let history = data ? JSON.parse(data) : [];

      const newItem = {
        url: mediaUrl,
        name: channelName || mediaUrl,
        logo: channelLogo || '',
        group: channelGroup || 'Uncategorized',
        date: new Date().toISOString(),
        cookie,
        referer,
        origin,
        drmUrl,
        userAgent,
        drmScheme,
        streamFormat,
        tokenUrl,
        tokenMatch,
        tokenReplace,
        tokenId
      };

      // Remove duplicate
      history = history.filter((item: any) => item.url !== mediaUrl);
      // Add to front
      history.unshift(newItem);
      // Keep only last 100
      if (history.length > 100) history = history.slice(0, 100);

      await AsyncStorage.setItem('streamHistory', JSON.stringify(history));
    } catch (e) {
      console.log('Failed to save history', e);
    }
  };

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
        AsyncStorage.setItem(`resume_${mediaUrl}`, currentTime.toString()).catch(() => { });
      }
    };
  }, [currentTime, settings.resumePlay, duration, isLive, mediaUrl]);

  // Favorite Management
  const checkFavoriteStatus = async () => {
    try {
      const data = await AsyncStorage.getItem('favorite_channels');
      if (data) {
        const favs = JSON.parse(data);
        setIsFavorite(favs.some((f: any) => f.url === mediaUrl));
      }
    } catch (e) { }
  };

  const toggleFavorite = async () => {
    try {
      const data = await AsyncStorage.getItem('favorite_channels');
      let favs = data ? JSON.parse(data) : [];

      if (isFavorite) {
        favs = favs.filter((f: any) => f.url !== mediaUrl);
        setIsFavorite(false);
      } else {
        if (channelName) {
          favs.push({
            url: mediaUrl,
            name: channelName,
            logo: channelLogo || '',
            group: channelGroup || 'CHANNELS',
            cookie: cookie || '',
            userAgent: userAgent || 'Default',
            isLiveEvent: isLiveEvent === 'true'
          });
          setIsFavorite(true);
        } else {
          return;
        }
      }
      await AsyncStorage.setItem('favorite_channels', JSON.stringify(favs));
    } catch (e) { }
  };

  // Cache volume and brightness to prevent async race conditions during fast swipes
  const currentVolume = useRef(0.5);
  const currentBrightness = useRef(0.5);

  useEffect(() => {
    let volSub: any = null;
    (async () => {
      try {
        const v = await VolumeManager.getVolume();
        currentVolume.current = typeof v === 'number' ? v : v.volume;
        const b = await Brightness.getBrightnessAsync();
        if (b >= 0) currentBrightness.current = b;
      } catch (e) { }
    })();
    volSub = VolumeManager.addVolumeListener((result) => {
      currentVolume.current = result.volume;
    });

    // Hide Native Volume UI when Player is open (Critical for smooth gestures)
    if (Platform.OS !== 'web' && !isTV) {
      VolumeManager.showNativeVolumeUI({ enabled: false });
    }

    return () => {
      if (volSub) volSub.remove();
      if (Platform.OS !== 'web' && !isTV) {
        VolumeManager.showNativeVolumeUI({ enabled: true });
      }
    };
  }, []);

  // Gestures (Volume & Brightness)
  const startVal = useRef({ vol: 0, bright: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => !isTV && Math.abs(gestureState.dy) > 20 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderGrant: () => {
        if (isTV) return;
        if (settings.volumeGesture) {
          startVal.current.vol = currentVolume.current;
        }
        if (settings.brightnessGesture) {
          startVal.current.bright = currentBrightness.current;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isTV) return;
        const { moveX, dy } = gestureState;
        const width = Dimensions.get('window').width;
        const height = Dimensions.get('window').height;
        const delta = -(dy / height); // Swipe up = positive delta

        if (moveX < width / 2 && settings.brightnessGesture) {
          // Left side: Brightness
          let newBright = startVal.current.bright + delta;
          newBright = Math.max(0, Math.min(newBright, 1));
          
          if (Math.abs(newBright - currentBrightness.current) >= 0.02) { // 2% step to prevent stutter
            Brightness.setBrightnessAsync(newBright);
            currentBrightness.current = newBright;
            showOverlayFeedback(`Brightness: ${Math.round(newBright * 100)}%`);
          }
        } else if (moveX >= width / 2 && settings.volumeGesture) {
          // Right side: Volume
          let newVol = startVal.current.vol + delta;
          newVol = Math.max(0, Math.min(newVol, 1));
          
          if (Math.abs(newVol - currentVolume.current) >= 0.03) { // 3% step to prevent stutter
            VolumeManager.setVolume(newVol);
            currentVolume.current = newVol; // Optimistic local cache
            showOverlayFeedback(`Volume: ${Math.round(newVol * 100)}%`);
          }
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
      controlsTimeoutRef.current = setTimeout(() => hideControls(), isTV ? 8000 : 4000);
    }
  };



  const playBtnRef = useRef<any>(null);

  const showControlsUI = () => {
    setShowControls(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    if (isTV) {
      setTimeout(() => {
        playBtnRef.current?.focus?.();
      }, 150);
    }
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

    // Resume logic
    if (String(isVod) === 'true') {
      try {
        const savedTime = await AsyncStorage.getItem('resume_vod');
        if (savedTime && parseFloat(savedTime) > 0) {
          videoRef.current?.seek(parseFloat(savedTime));
          AsyncStorage.removeItem('resume_vod');
        }
      } catch (e) { }
    } else if (settings.resumePlay && mediaUrl) {
      try {
        const savedTime = await AsyncStorage.getItem(`resume_${mediaUrl}`);
        if (savedTime && parseFloat(savedTime) > 0) {
          videoRef.current?.seek(parseFloat(savedTime));
        }
      } catch (e) { }
    }

    if (!data.duration || data.duration <= 0 || (data.duration > 86400 && String(isVod) !== 'true')) {
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
      }).sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
      setVideoTracks(filteredVideos);
    }
  };

  const handleAudioTracks = (data: { audioTracks: any[] }) => {
    if (data.audioTracks) {
      setAudioTracks(data.audioTracks);
      if (selectedAudioTrack === undefined) {
        const firstSelectable = data.audioTracks.findIndex((t: any) => t.selected);
        if (firstSelectable !== -1) {
          setSelectedAudioTrack(firstSelectable);
        }
      }
    }
  };

  const handleTextTracks = (data: { textTracks: any[] }) => {
    if (data.textTracks) setTextTracks(data.textTracks);
  };

  const handleVideoTracks = (data: { videoTracks: any[] }) => {
    if (data.videoTracks) {
      const uniqueHeights = new Set<number>();
      const filteredVideos = data.videoTracks.filter(t => {
        if (!t.height || uniqueHeights.has(t.height)) return false;
        uniqueHeights.add(t.height);
        return true;
      }).sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
      setVideoTracks(filteredVideos);
    }
  };

  const togglePiP = () => {
    if (Platform.OS === 'web' || isTV) return;
    setIsPiPActive(true);
    try {
      videoRef.current?.enterPictureInPicture();
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

  let finalMediaUrl = (mediaUrl as string) || '';
  const headers: Record<string, string> = {};

  if (finalMediaUrl.includes('|')) {
    const parts = finalMediaUrl.split('|');
    finalMediaUrl = parts[0].trim();
    for (let i = 1; i < parts.length; i++) {
      const headerPart = parts[i].trim();
      const equalIndex = headerPart.indexOf('=');
      if (equalIndex > -1) {
        const key = headerPart.substring(0, equalIndex).trim().toLowerCase();
        const value = headerPart.substring(equalIndex + 1).trim();
        if (key === 'referer') headers['Referer'] = value;
        else if (key === 'user-agent') headers['User-Agent'] = value;
        else if (key === 'origin') headers['Origin'] = value;
        else if (key === 'cookie') headers['Cookie'] = value;
      }
    }
  }

  if (cookie) headers['Cookie'] = cookie as string;
  if (referer) headers['Referer'] = referer as string;
  if (origin) headers['Origin'] = origin as string;

  if (userAgent && userAgent !== 'Default') {
    headers['User-Agent'] = userAgent as string;
  } else if (!headers['User-Agent']) {
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }
  if (__DEV__) {
    console.log("PLAYING MEDIA URL:", mediaUrl);
    console.log("WITH HEADERS:", headers);
  }

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

  const switchChannel = useCallback((channel: any) => {
    if (!channel) return;
    setIsBuffering(true);
    setIsReady(false);
    setPlayerError(null);
    router.setParams({
      mediaUrl: channel.url,
      channelName: channel.name,
      channelLogo: channel.logo || '',
      channelGroup: channel.group || 'CHANNELS',
      cookie: channel.cookie || '',
      userAgent: channel.userAgent || 'Default',
      referer: channel.httpReferer || channel.referer || '',
      origin: channel.origin || '',
      tokenUrl: channel.tokenUrl || '',
      tokenMatch: channel.tokenMatch || '',
      tokenReplace: channel.tokenReplace || '',
      tokenId: channel.tokenId ? String(channel.tokenId) : ''
    });
    showOverlayFeedback(`Switching to ${channel.name}`);
  }, [router]);

  const handleNextChannel = useCallback(() => switchChannel(nextChannel()), [switchChannel, nextChannel]);
  const handlePrevChannel = useCallback(() => switchChannel(prevChannel()), [switchChannel, prevChannel]);

  const [resolvedMediaUrl, setResolvedMediaUrl] = useState<string | null>(null);
  const [resolvedHeaders, setResolvedHeaders] = useState<Record<string, string> | undefined>(undefined);
  const [resolvedDrm, setResolvedDrm] = useState<any>(undefined);

  const switchVodSource = async (index: number) => {
    if (!vodSources[index]) return;
    setIsBuffering(true);
    setIsReady(false);
    setPlayerError(null);
    setCurrentVodIndex(index);
    if (currentTime > 0) {
      await AsyncStorage.setItem('resume_vod', currentTime.toString());
    }
    const src = vodSources[index];
    router.setParams({
      mediaUrl: src.url,
      vodSourceIndex: index.toString(),
      referer: src.headers?.['Referer'] || src.headers?.['referer'] || '',
      origin: src.headers?.['Origin'] || src.headers?.['origin'] || '',
      userAgent: src.headers?.['User-Agent'] || src.headers?.['user-agent'] || 'Default',
      cookie: src.headers?.['Cookie'] || src.headers?.['cookie'] || '',
    });
    showOverlayFeedback(`Switched to ${src.quality} (${src.provider})`);
  };

  useEffect(() => {
    let cancelled = false;

    const performUrlResolution = async () => {
      if (!finalMediaUrl) {
        if (!cancelled) setResolvedMediaUrl(null);
        return;
      }
      setPlayerError(null);
      setIsBuffering(true);

      let currentUrl = finalMediaUrl;
      let currentHeaders = { ...headers };

      try {
        if (tokenUrl) {
          const res = await resolveCustomTokenUrl(
            currentUrl,
            tokenUrl as string,
            tokenId ? Number(tokenId) : undefined,
            currentHeaders,
            tokenMatch as string,
            tokenReplace as string
          );
          currentUrl = res.url;
          if (res.headers) currentHeaders = { ...currentHeaders, ...res.headers };

          if (res.drm) {
            let type = DRMType.WIDEVINE;
            if (res.drm.type === 'playready') type = DRMType.PLAYREADY;
            else if (res.drm.type === 'clearkey') type = DRMType.CLEARKEY;

            let licenseServer = res.drm.licenseServer || '';
            if (type === DRMType.CLEARKEY && res.drm.rawKeyPair) {
              try {
                const [kidHex, keyHex] = res.drm.rawKeyPair.split(':');
                licenseServer = JSON.stringify({
                  keys: [{ kty: 'oct', k: hexToBase64Url(keyHex), kid: hexToBase64Url(kidHex) }],
                  type: 'temporary'
                });
              } catch (e) { }
            }
            if (!cancelled) setResolvedDrm({ type, licenseServer, headers: Object.keys(currentHeaders).length > 0 ? currentHeaders : undefined });
          }
        }

        const isDirectStream = /\.(m3u8|mp4|mkv|ts|flv|webm)(\?|$)/i.test(currentUrl);
        let targetUrl = currentUrl;
        
        if (!isDirectStream || currentUrl.includes('.php')) {
          try {
            const res = await fetch(currentUrl, { method: 'HEAD', headers: currentHeaders });
            targetUrl = res.url || currentUrl;

            if (!res.ok) {
              const getRes = await fetch(currentUrl, { method: 'GET', headers: currentHeaders });
              targetUrl = getRes.url || currentUrl;
            }
          } catch (e) {
            if (__DEV__) console.log('Redirect resolution failed', e);
          }
        }

        if (!cancelled) {
          setResolvedMediaUrl(targetUrl);
          setResolvedHeaders(Object.keys(currentHeaders).length > 0 ? currentHeaders : undefined);
        }
      } catch (e) {
        if (__DEV__) console.log("Failed to resolve URL, falling back to current", e);
        if (!cancelled) {
          setResolvedMediaUrl(currentUrl || finalMediaUrl);
          setResolvedHeaders(Object.keys(currentHeaders).length > 0 ? currentHeaders : undefined);
        }
      }
    };

    if (String(isVod) === 'true') {
      AsyncStorage.getItem('@current_vod_sources').then(data => {
        if (data && !cancelled) {
          const parsed = JSON.parse(data);
          setVodSources(parsed);
          const idx = parseInt((vodSourceIndex as string) || '0');
          setCurrentVodIndex(idx);
        }
      });
    }
    
    performUrlResolution();

    return () => {
      cancelled = true;
    };
  }, [finalMediaUrl, retryKey]);

  // Unified TV State Ref for Event Handler
  const stateRef = useRef({ showControls, showSettings, currentTime, paused, duration, seekDuration: settings.seekDuration });
  useEffect(() => {
    stateRef.current = { showControls, showSettings, currentTime, paused, duration, seekDuration: settings.seekDuration };
  }, [showControls, showSettings, currentTime, paused, duration, settings.seekDuration]);

  const actionsRef = useRef({ showControlsUI, hideControls, startControlsTimeout, router, handleSeek, handlePrevChannel, handleNextChannel, setPaused });
  useEffect(() => {
    actionsRef.current = { showControlsUI, hideControls, startControlsTimeout, router, handleSeek, handlePrevChannel, handleNextChannel, setPaused };
  });

  // Global TV Event Handler for Player
  useEffect(() => {
    if (!isTV) return;
    const backAction = () => {
      const current = stateRef.current;
      const actions = actionsRef.current;
      if (current.showSettings) {
        setShowSettings(false);
        actions.startControlsTimeout();
        return true;
      }
      if (!current.showControls) {
        actions.router.back();
        return true;
      } else {
        actions.hideControls();
        return true;
      }
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isTV]);

  return (
    <View
      style={styles.container}
      {...panResponder.panHandlers}
      focusable={true}
      //@ts-ignore
      onKeyDown={(Platform.OS === 'web' || Platform.OS === 'android') ? (e: any) => {
        const key = e.nativeEvent.key;
        
        // Settings Open
        if (showSettings) {
          if (key === 'Escape' || key === 'Backspace') {
            setShowSettings(false);
            startControlsTimeout();
          }
          return;
        }

        // Controls Hidden
        if (!showControls) {
          if (key === 'ArrowDown') handleNextChannel();
          else if (key === 'ArrowUp') handlePrevChannel();
          else if (key === 'ArrowLeft') { showControlsUI(); handleSeek(currentTime - settings.seekDuration, duration); }
          else if (key === 'ArrowRight') { showControlsUI(); handleSeek(currentTime + settings.seekDuration, duration); }
          else if (key === 'Enter' || key === ' ') showControlsUI();
          else if (key === 'Escape' || key === 'Backspace') router.back();
        } 
        // Controls Visible
        else {
          if (key === 'Escape' || key === 'Backspace') hideControls();
        }
      } : undefined}
    >
      <Stack.Screen options={{
        headerShown: false,
        navigationBarHidden: true,
        statusBarHidden: true,
        orientation: isLandscape ? 'landscape' : 'portrait'
      }} />

      <View style={styles.videoContainer}>
        {resolvedMediaUrl ? (
          <Video
            ref={videoRef}
            source={{
              uri: resolvedMediaUrl,
              headers: resolvedHeaders !== undefined ? resolvedHeaders : (Object.keys(headers).length > 0 ? headers : undefined),
              drm: resolvedDrm || drmConfig,
              type: (streamFormat && streamFormat !== 'auto') ? streamFormat : undefined
            } as ReactVideoSource}
            controls={false}
            paused={paused}
            rate={playbackRate}
            resizeMode={activeResizeMode}
            selectedAudioTrack={selectedAudioTrack !== undefined ? { type: SelectedTrackType.INDEX, value: selectedAudioTrack } : undefined}
            selectedTextTrack={selectedTextTrack === -1 ? { type: SelectedTrackType.DISABLED } : { type: SelectedTrackType.INDEX, value: selectedTextTrack }}
            selectedVideoTrack={selectedVideoTrack === 0 ? { type: SelectedVideoTrackType.AUTO } : { type: SelectedVideoTrackType.RESOLUTION, value: selectedVideoTrack }}
            onLoad={handleLoad}
            onReadyForDisplay={() => setIsReady(true)}
            onAudioTracks={handleAudioTracks}
            onTextTracks={handleTextTracks}
            onVideoTracks={handleVideoTracks}
            onProgress={(data) => setCurrentTime(data.currentTime)}
            onBuffer={({ isBuffering }) => setIsBuffering(isBuffering)}
            onPictureInPictureStatusChanged={(isActive) => setIsPiPActive(isActive.isActive)}
            onError={(error: any) => {
              console.log("Video Playback Error:", error);
              setIsBuffering(false);

              const errStr = error?.error?.errorString || '';
              const stack = error?.error?.errorStackTrace || '';
              const msg = error?.error?.message || '';

              let title = 'Playback Error';
              let message = errStr.replace('ExoPlaybackException: ', '').replace(/_/g, ' ') || msg || 'An unknown error occurred while playing the video.';

              if (stack.includes('403') || errStr.includes('403') || msg.includes('403')) {
                title = 'Access Denied (403)';
                message = 'The server rejected the request. The stream token might be invalid or expired.';
              } else if (stack.includes('404') || errStr.includes('404') || msg.includes('404')) {
                title = 'Stream Not Found (404)';
                message = 'The requested video stream could not be found.';
              } else if (errStr.includes('ERROR_CODE_IO_BAD_HTTP_STATUS')) {
                title = 'Bad HTTP Status';
                message = 'The media server returned an invalid response.';
              } else if (errStr.includes('ERROR_CODE_IO_NETWORK_CONNECTION_FAILED')) {
                title = 'Network Error';
                message = 'Failed to connect to the media server. Please check your internet connection.';
              } else if (stack.includes('NO_UNSUPPORTED_TYPE') && stack.includes('audio/')) {
                title = 'Unsupported Audio Format';
                message = 'Your device does not support the audio format of this stream (e.g. Dolby EAC3). Try selecting a different source or quality from Settings > Sources.';
              } else if (errStr.includes('ERROR_CODE_DECODER_INIT_FAILED') || stack.includes('DecoderInitializationException')) {
                title = 'Decoder Failed';
                message = 'Your device hardware does not support the format of this stream. Try a different source.';
              }

              setPlayerError({ title, message });
            }}
            style={[styles.video, { opacity: isReady ? 1 : 0 }]}
            volume={1.0}
            muted={false}
            audioOutput="speaker"
            ignoreSilentSwitch="ignore"
            playInBackground={false}
            // Native Patches
            //@ts-ignore
            progressUpdateInterval={250}
          />
        ) : (
          <View style={[styles.loadingOverlay, { backgroundColor: '#000' }]}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        )}

        {/* Loading Overlay */}
        {(isBuffering || !isReady || !resolvedMediaUrl) && !playerError && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#E50914" />
          </View>
        )}
      </View>

      {/* Error Overlay */}
      {playerError && (
        <View style={styles.errorOverlayWrapper}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#E50914" style={{ marginBottom: 16 }} />
            <Text style={styles.errorTitle}>{playerError.title}</Text>
            <Text style={styles.errorMessage}>{playerError.message}</Text>
            <View style={styles.errorButtons}>
              <TVTouchable style={styles.errorBtn} onPress={() => router.back()}>
                <MaterialIcons name="arrow-back" size={20} color="#fff" />
                <Text style={styles.errorBtnText}>Go Back</Text>
              </TVTouchable>
              <TVTouchable style={[styles.errorBtn, styles.errorBtnPrimary]} onPress={() => {
                setResolvedMediaUrl(null);
                setRetryKey(k => k + 1);
              }}>
                <MaterialIcons name="refresh" size={20} color="#fff" />
                <Text style={styles.errorBtnText}>Retry</Text>
              </TVTouchable>
            </View>
          </View>
        </View>
      )}

      {/* Touch interceptor for toggling controls (Mobile & TV Mouse pointer) */}
      <Pressable 
        style={[StyleSheet.absoluteFill, { zIndex: 5 }]} 
        onPress={toggleControls} 
        focusable={false}
        importantForAccessibility="no"
      />

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
              {(String(isVod) === 'true' ? ['sources', 'audio', 'subs', 'quality', 'speed'] as const : ['audio', 'subs', 'quality', 'speed'] as const).map((tab, idx) => (
                <TVTouchable key={tab} style={[styles.tabBtn, activeTab === tab && styles.activeTabBtn]} onPress={() => setActiveTab(tab)}>
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {tab === 'audio' ? 'Audio' : tab === 'subs' ? 'Subtitles' : tab === 'quality' ? 'Quality' : tab === 'sources' ? 'Sources' : 'Speed'}
                  </Text>
                </TVTouchable>
              ))}
            </View>
            <TVFocusGuideView autoFocus style={{ flex: 1 }}>
              <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
                {activeTab === 'audio' && (
                  <>
                    {audioTracks.length === 0 && <Text style={styles.noTracksText}>No alternative audio tracks.</Text>}
                    {audioTracks.map((track, i) => (
                      <TVTouchable key={i} style={styles.trackBtn} onPress={() => setSelectedAudioTrack(track.index)}>
                        <MaterialIcons name={selectedAudioTrack === track.index || (selectedAudioTrack === undefined && i === 0) ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                        <Text style={styles.trackText}>{track.language || track.title || `Track ${i + 1}`}</Text>
                      </TVTouchable>
                    ))}
                  </>
                )}
                {activeTab === 'subs' && (
                  <>
                    <TVTouchable style={styles.trackBtn} onPress={() => setSelectedTextTrack(-1)}>
                      <MaterialIcons name={selectedTextTrack === -1 ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                      <Text style={styles.trackText}>Off</Text>
                    </TVTouchable>
                    {textTracks.map((track, i) => (
                      <TVTouchable key={i} style={styles.trackBtn} onPress={() => setSelectedTextTrack(track.index)}>
                        <MaterialIcons name={selectedTextTrack === track.index ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                        <Text style={styles.trackText}>{track.language || track.title || `Subtitle ${i + 1}`}</Text>
                      </TVTouchable>
                    ))}
                  </>
                )}
                {activeTab === 'quality' && (
                  <>
                    <TVTouchable style={styles.trackBtn} onPress={() => setSelectedVideoTrack(0)}>
                      <MaterialIcons name={selectedVideoTrack === 0 ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                      <Text style={styles.trackText}>Auto</Text>
                    </TVTouchable>
                    {videoTracks.map((track, i) => (
                      <TVTouchable key={i} style={styles.trackBtn} onPress={() => setSelectedVideoTrack(track.height)}>
                        <MaterialIcons name={selectedVideoTrack === track.height ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                        <Text style={styles.trackText}>{track.height}p</Text>
                      </TVTouchable>
                    ))}
                  </>
                )}
                {activeTab === 'speed' && (
                  <>
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
                      <TVTouchable key={speed} style={styles.trackBtn} onPress={() => setPlaybackRate(speed)}>
                        <MaterialIcons name={playbackRate === speed ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                        <Text style={styles.trackText}>{speed}x {speed === 1.0 ? '(Normal)' : ''}</Text>
                      </TVTouchable>
                    ))}
                  </>
                )}
                {activeTab === 'sources' && (
                  <>
                    {vodSources.length > 0 ? (
                      vodSources.map((src: any, index: number) => (
                        <TVTouchable key={index} style={styles.trackBtn} onPress={() => { switchVodSource(index); setShowSettings(false); }}>
                          <MaterialIcons name={currentVodIndex === index ? "radio-button-checked" : "radio-button-unchecked"} size={24} color="#E50914" />
                          <Text style={styles.trackText}>{src.quality} - {src.provider}</Text>
                        </TVTouchable>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>No sources loaded</Text>
                    )}
                  </>
                )}
              </ScrollView>
            </TVFocusGuideView>
            <TVTouchable style={styles.closeSettingsBtn} onPress={() => { setShowSettings(false); startControlsTimeout(); }}>
              <MaterialIcons name="close" size={28} color="#fff" />
            </TVTouchable>
          </View>
        </View>
      )}

      {/* Custom Controls Overlay */}
      {!playerError && (
        <Animated.View style={[styles.controlsOverlay, { opacity: fadeAnim }]} pointerEvents={showControls && !showSettings ? 'box-none' : 'none'}>
          <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={styles.topGradient}>
            <TVTouchable style={styles.iconButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={32} color="#fff" />
            </TVTouchable>
            <View style={styles.topRightControls}>
              <TVTouchable style={styles.iconButton} onPress={toggleFavorite}>
                <MaterialIcons name={isFavorite ? "star" : "star-border"} size={28} color={isFavorite ? "#FFD700" : "#fff"} />
              </TVTouchable>
              {!isTV && (
                <TVTouchable style={styles.iconButton} onPress={togglePiP}>
                  <MaterialIcons name="picture-in-picture-alt" size={28} color="#fff" />
                </TVTouchable>
              )}
              <TVTouchable style={styles.iconButton} onPress={() => { setShowSettings(true); showControlsUI(); }}>
                <MaterialIcons name="settings" size={28} color="#fff" />
              </TVTouchable>
            </View>
          </LinearGradient>

          <View style={styles.centerControls} pointerEvents="box-none">
            {!isLive && (
              <TVTouchable style={styles.centerBtn} onPress={() => { handleSeek(currentTime - settings.seekDuration, duration); showControlsUI(); }}>
                <MaterialIcons name="replay-10" size={48} color="#fff" />
                <Text style={styles.seekBtnText}>-{settings.seekDuration}s</Text>
              </TVTouchable>
            )}
            <TVTouchable ref={playBtnRef} style={styles.playBtn} onPress={() => { setPaused(!paused); showControlsUI(); }}>
              <MaterialIcons name={paused ? "play-arrow" : "pause"} size={64} color="#fff" />
            </TVTouchable>
            {!isLive && (
              <TVTouchable style={styles.centerBtn} onPress={() => { handleSeek(currentTime + settings.seekDuration, duration); showControlsUI(); }}>
                <MaterialIcons name="forward-10" size={48} color="#fff" />
                <Text style={styles.seekBtnText}>+{settings.seekDuration}s</Text>
              </TVTouchable>
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
                {!isTV ? (
                  <Slider
                    style={styles.slider} minimumValue={0} maximumValue={duration} value={currentTime}
                    minimumTrackTintColor="#E50914" maximumTrackTintColor="rgba(255, 255, 255, 0.3)" thumbTintColor="#E50914"
                    onSlidingStart={() => clearControlsTimeout()}
                    onSlidingComplete={(val) => { handleSeek(val, duration); showControlsUI(); }}
                  />
                ) : (
                  <View style={styles.sliderTvLine}>
                    <View style={[styles.sliderTvFill, { width: `${(currentTime / (duration || 1)) * 100}%` }]} />
                  </View>
                )}
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            )}
            <View style={styles.bottomRightControls}>
              <TVTouchable style={styles.smallIconButton} onPress={() => {
                setResizeMode(r => {
                  return r === 'auto' ? 'contain' :
                    r === 'contain' ? 'cover' :
                      r === 'cover' ? 'stretch' : 'auto';
                });
                showControlsUI();
              }}>
                <MaterialIcons name={activeResizeMode === 'contain' ? 'aspect-ratio' : activeResizeMode === 'cover' ? 'crop-free' : activeResizeMode === 'stretch' ? 'settings-overscan' : 'auto-fix-normal'} size={24} color="#fff" />
              </TVTouchable>
              {!isTV && (
                <TVTouchable style={styles.smallIconButton} onPress={() => {
                  ScreenOrientation.lockAsync(isLandscape ? ScreenOrientation.OrientationLock.PORTRAIT_UP : ScreenOrientation.OrientationLock.LANDSCAPE);
                  setIsLandscape(!isLandscape); showControlsUI();
                }}>
                  <MaterialIcons name={isLandscape ? 'screen-lock-portrait' : 'screen-rotation'} size={24} color="#fff" />
                </TVTouchable>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', width: '100%', height: '100%' },
  videoContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  video: { width: '100%', height: '100%' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  errorOverlayWrapper: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  errorContainer: { backgroundColor: 'rgba(20,20,25,0.95)', padding: 30, borderRadius: 16, alignItems: 'center', maxWidth: 400, width: '85%', borderWidth: 1, borderColor: 'rgba(229,9,20,0.3)' },
  errorTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  errorMessage: { color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center', marginBottom: 25, lineHeight: 24 },
  errorButtons: { flexDirection: 'row', gap: 15 },
  errorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, gap: 8 },
  errorBtnPrimary: { backgroundColor: '#E50914' },
  errorBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
  sliderTvLine: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 20, borderRadius: 2 },
  sliderTvFill: { height: '100%', backgroundColor: '#E50914', borderRadius: 2 },
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
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
});
