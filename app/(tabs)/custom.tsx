import Text from '../../components/Text';
import { TVTouchable } from '../../components/TVTouchable';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState, useEffect } from 'react';
import { Animated, BackHandler, Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isTV } from '../../components/tv';
import { clearTokenCache } from '../../utils/tokenParser';
import { useDrawer } from '../context/DrawerContext';

const OutlinedInput = ({ label, value, onChangeText, placeholder, hasTVPreferredFocus }: any) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChangeText('');
  };

  return (
    <View style={styles.inputWrapper}>
      <View style={styles.floatingLabelWrapper}>
        <Text style={[styles.floatingLabel, isFocused && { color: '#fff' }]}>{label}</Text>
      </View>
      <View style={styles.inputInner}>
        <TextInput
          style={[
            styles.outlinedInput,
            { paddingRight: value ? 45 : 15 },
            isFocused && { borderColor: '#A78BFA', backgroundColor: 'rgba(255,255,255,0.1)' }
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || `Enter ${label}`}
          placeholderTextColor="#666"
          focusable={true}
          hasTVPreferredFocus={hasTVPreferredFocus}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {value ? (
          <TVTouchable style={styles.rightActionBtn} onPress={handleClear}>
            <MaterialIcons name="clear" size={20} color="#ff4444" />
          </TVTouchable>
        ) : null}
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const [mediaUrl, setMediaUrl] = useState('');
  const [cookie, setCookie] = useState('');
  const [referer, setReferer] = useState('');
  const [origin, setOrigin] = useState('');
  const [drmUrl, setDrmUrl] = useState('');
  const [userAgent, setUserAgent] = useState('Default');
  const [drmScheme, setDrmScheme] = useState('clearkey');

  const [showToast, setShowToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Modals State
  const [showUAModal, setShowUAModal] = useState(false);
  const [showDrmModal, setShowDrmModal] = useState(false);
  const [showCustomUAModal, setShowCustomUAModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [customUAInput, setCustomUAInput] = useState('');
  const [customUA, setCustomUA] = useState('');

  const { openDrawer } = useDrawer();

  const uaBtnRef = useRef<any>(null);
  const drmBtnRef = useRef<any>(null);

  useEffect(() => {
    if (!showUAModal && !showCustomUAModal && uaBtnRef.current) {
      setTimeout(() => uaBtnRef.current?.focus?.(), 100);
    }
  }, [showUAModal, showCustomUAModal]);

  useEffect(() => {
    if (!showDrmModal && drmBtnRef.current) {
      setTimeout(() => drmBtnRef.current?.focus?.(), 100);
    }
  }, [showDrmModal]);

  const router = useRouter();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        setShowExitModal(true);
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const handlePlay = () => {
    if (!mediaUrl || !mediaUrl.trim()) {
      setShowToast(true);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start(() => setShowToast(false));
      return;
    }
    router.push({
      pathname: '/player',
      params: { mediaUrl, cookie, referer, origin, drmUrl, userAgent, drmScheme, fromHome: 'true' }
    });
  };

  const uaOptions = [
    { label: 'Default', value: 'Default' },
    { label: 'Chrome (Android)', value: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36' },
    { label: 'Chrome (PC)', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36' },
    { label: 'Firefox (PC)', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0' },
    { label: 'iPhone', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1' },
    ...(customUA !== '' ? [{ label: 'Custom UA', value: customUA }] : []),
    { label: 'Add Custom...', value: 'Custom' }
  ];

  const drmOptions = [
    { label: 'Widevine', value: 'widevine' },
    { label: 'PlayReady', value: 'playready' },
    { label: 'ClearKey', value: 'clearkey' }
  ];

  return (
    <LinearGradient colors={['#1a0b2e', '#050505']} style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        {!isTV && (
          <TVTouchable onPress={openDrawer} style={styles.iconBtn}>
            <MaterialIcons name="menu" size={28} color="#fff" />
          </TVTouchable>
        )}
        <Text style={styles.headerTitle}>StreamBD Player</Text>
        <TVTouchable onPress={() => router.push('/history')} style={styles.iconBtn}>
          <MaterialIcons name="history" size={26} color="#fff" />
        </TVTouchable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
      >
        <BlurView intensity={30} tint="dark" style={styles.glassCard}>
          <OutlinedInput label="Media Stream URL" value={mediaUrl} onChangeText={setMediaUrl} hasTVPreferredFocus={true} />
          <OutlinedInput label="Cookie Value" value={cookie} onChangeText={setCookie} />
          <OutlinedInput label="Referer Value" value={referer} onChangeText={setReferer} />
          <OutlinedInput label="Origin Value" value={origin} onChangeText={setOrigin} />
          <OutlinedInput label="DRM License URL" value={drmUrl} onChangeText={setDrmUrl} />

          <View style={styles.row}>
            <View style={[styles.flex1, { marginRight: 5 }]}>
              <View style={styles.inputWrapper}>
                <View style={styles.floatingLabelWrapper}>
                  <Text style={styles.floatingLabel}>UserAgent</Text>
                </View>
                <TVTouchable ref={uaBtnRef} onPress={() => setShowUAModal(true)}>
                  <View style={[styles.outlinedInput, { justifyContent: 'center' }]}>
                    <Text style={styles.dropdownValueText} numberOfLines={1}>
                      {uaOptions.find(o => o.value === userAgent)?.label || 'Default'}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color="#A78BFA" style={styles.dropdownIcon} />
                  </View>
                </TVTouchable>
              </View>
            </View>

            <View style={[styles.flex1, { marginLeft: 5 }]}>
              <View style={styles.inputWrapper}>
                <View style={styles.floatingLabelWrapper}>
                  <Text style={styles.floatingLabel}>DrmScheme</Text>
                </View>
                <TVTouchable ref={drmBtnRef} onPress={() => setShowDrmModal(true)}>
                  <View style={[styles.outlinedInput, { justifyContent: 'center' }]}>
                    <Text style={styles.dropdownValueText} numberOfLines={1}>
                      {drmOptions.find(o => o.value === drmScheme)?.label || 'ClearKey'}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color="#A78BFA" style={styles.dropdownIcon} />
                  </View>
                </TVTouchable>
              </View>
            </View>
          </View>

          {/* Standard Play Button for TV/Mobile */}
          <TVTouchable
            style={[styles.playButton, { marginTop: 20 }]}
            onPress={handlePlay}
          >
            <MaterialIcons name="play-arrow" size={28} color="#000" />
            <Text style={styles.playButtonText}>Play Stream</Text>
          </TVTouchable>
        </BlurView>
      </ScrollView>

      {/* Custom Toast */}
      {showToast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <MaterialIcons name="play-circle-outline" size={24} color="#f39c12" style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>Please check the play URL</Text>
        </Animated.View>
      )}



      {/* UserAgent Selection Modal */}
      <Modal visible={showUAModal} transparent animationType="none" onRequestClose={() => setShowUAModal(false)}>
        <TVTouchable style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowUAModal(false)}>
          <View style={styles.premiumModalContent}>
            <Text style={styles.premiumModalTitle}>Select UserAgent</Text>
            <ScrollView bounces={false} overScrollMode="never" style={{ maxHeight: 300 }}>
              {uaOptions.map((opt, idx) => (
                <TVTouchable
                  key={idx}
                  style={[styles.selectOption, userAgent === opt.value && styles.selectOptionActive]}
                  onPress={() => {
                    if (opt.value === 'Custom') {
                      setShowUAModal(false);
                      setTimeout(() => setShowCustomUAModal(true), 100);
                    } else {
                      setUserAgent(opt.value);
                      setShowUAModal(false);
                    }
                  }}
                >
                  <Text style={[styles.selectOptionText, userAgent === opt.value && { color: '#A78BFA' }]} numberOfLines={1}>
                    {opt.label}
                  </Text>
                  {userAgent === opt.value && <MaterialIcons name="check-circle" size={20} color="#A78BFA" />}
                </TVTouchable>
              ))}
            </ScrollView>
          </View>
        </TVTouchable>
      </Modal>

      {/* DRM Schema Selection Modal */}
      <Modal visible={showDrmModal} transparent animationType="none" onRequestClose={() => setShowDrmModal(false)}>
        <TVTouchable style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDrmModal(false)}>
          <View style={styles.premiumModalContent}>
            <Text style={styles.premiumModalTitle}>Select DRM Scheme</Text>
            <ScrollView bounces={false} overScrollMode="never">
              {drmOptions.map((opt, idx) => (
                <TVTouchable
                  key={idx}
                  style={[styles.selectOption, drmScheme === opt.value && styles.selectOptionActive]}
                  onPress={() => {
                    setDrmScheme(opt.value);
                    setShowDrmModal(false);
                  }}
                >
                  <Text style={[styles.selectOptionText, drmScheme === opt.value && { color: '#A78BFA' }]} numberOfLines={1}>
                    {opt.label}
                  </Text>
                  {drmScheme === opt.value && <MaterialIcons name="check-circle" size={20} color="#A78BFA" />}
                </TVTouchable>
              ))}
            </ScrollView>
          </View>
        </TVTouchable>
      </Modal>

      {/* Custom UA Modal */}
      <Modal visible={showCustomUAModal} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <View style={styles.premiumModalContent}>
            <Text style={styles.premiumModalTitle}>Custom User Agent</Text>
            <TextInput
              style={styles.modalInput}
              value={customUAInput}
              onChangeText={setCustomUAInput}
              placeholder="Mozilla/5.0..."
              placeholderTextColor="#666"
            />
            <View style={styles.modalActions}>
              <TVTouchable onPress={() => setShowCustomUAModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TVTouchable>
              <TVTouchable onPress={() => {
                if (customUAInput.trim()) {
                  setCustomUA(customUAInput.trim());
                  setUserAgent(customUAInput.trim());
                }
                setShowCustomUAModal(false);
              }}>
                <Text style={styles.modalOk}>Save</Text>
              </TVTouchable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exit Confirmation Modal */}
      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.premiumModalContent, { alignItems: 'center', paddingTop: 30 }]}>
            <View style={styles.exitIconContainer}>
              <MaterialIcons name="exit-to-app" size={40} color="#E50914" />
            </View>
            <Text style={[styles.premiumModalTitle, { fontSize: 22, textAlign: 'center', marginTop: 15 }]}>Exit App</Text>
            <Text style={styles.exitModalSubtitle}>Are you sure you want to exit StreamBD Player?</Text>

            <View style={styles.exitModalActions}>
              <TVTouchable
                hasTVPreferredFocus={true}
                style={[styles.exitBtn, styles.exitBtnCancel]}
                onPress={() => setShowExitModal(false)}
              >
                <Text style={styles.exitBtnCancelText}>Cancel</Text>
              </TVTouchable>
              <TVTouchable
                style={[styles.exitBtn, styles.exitBtnConfirm]}
                onPress={() => { setShowExitModal(false); clearTokenCache(); BackHandler.exitApp(); }}
              >
                <Text style={styles.exitBtnConfirmText}>Exit</Text>
              </TVTouchable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  iconBtn: { padding: 8, borderRadius: 20 },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_Bold',
    marginLeft: 15,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: 'center', // Centers the form on wide screens
  },
  glassCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 10,
    borderWidth: 0,
    marginBottom: 15,
    width: '100%',
    maxWidth: 600, // Keeps it looking good on TV
  },
  inputWrapper: {
    marginBottom: 12,
    position: 'relative',
  },
  inputInner: {
    justifyContent: 'center',
  },
  rightActionBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
    zIndex: 5,
  },
  floatingLabelWrapper: {
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  floatingLabel: {
    color: '#A78BFA',
    fontSize: 12,
    fontFamily: 'Inter_SemiBold',
    letterSpacing: 0.5,
  },
  outlinedInput: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_Medium',
    backgroundColor: 'rgba(255,255,255,0.05)',
    height: 46,
  },
  dropdownValueText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_Medium',
    paddingRight: 20,
  },
  dropdownIcon: {
    position: 'absolute',
    right: 10,
  },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: { color: '#fff', fontSize: 16, flex: 1 },
  fab: {
    position: 'absolute',
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  playButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  playButtonText: {
    color: '#000',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  premiumModalContent: {
    backgroundColor: '#161622',
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 10,
  },
  premiumModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_Bold',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 4,
  },
  selectOptionActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
  },
  selectOptionText: {
    color: '#E0E0E0',
    fontSize: 15,
    fontFamily: 'Inter_Medium',
    flex: 1,
    marginRight: 10,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    fontFamily: 'Inter_Medium',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
  },
  modalCancel: {
    color: '#8a8aa3',
    fontSize: 15,
    fontFamily: 'Inter_SemiBold',
    marginRight: 20,
  },
  modalOk: {
    color: '#A78BFA',
    fontSize: 16,
    fontFamily: 'Inter_Bold',
  },
  exitIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitModalSubtitle: {
    color: '#8a8aa3',
    fontSize: 15,
    fontFamily: 'Inter_Medium',
    textAlign: 'center',
    marginBottom: 25,
    marginTop: -5,
  },
  exitModalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 15,
  },
  exitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitBtnCancel: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  exitBtnConfirm: {
    backgroundColor: '#E50914',
  },
  exitBtnCancelText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_SemiBold',
  },
  exitBtnConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_Bold',
  },
});
