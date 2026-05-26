import Text from '../../components/Text';
import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, TextInput, ScrollView, TouchableOpacity, View, Animated, Modal, BackHandler, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SideDrawer from '../../components/SideDrawer';
import { clearTokenCache } from '../../utils/tokenParser';

const OutlinedInput = ({ label, value, onChangeText, placeholder }: any) => {
  return (
    <View style={styles.inputWrapper}>
      <View style={styles.floatingLabelWrapper}>
        <Text style={styles.floatingLabel}>{label}</Text>
      </View>
      <TextInput
        style={styles.outlinedInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || `Enter ${label}`}
        placeholderTextColor="#666"
      />
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

  // Custom UA Modal State
  const [showCustomUAModal, setShowCustomUAModal] = useState(false);
  const [customUAInput, setCustomUAInput] = useState('');
  const [customUA, setCustomUA] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const router = useRouter();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert('Exit App', 'Are you sure you want to exit the app?', [
          {
            text: 'Cancel',
            onPress: () => null,
            style: 'cancel',
          },
          {
            text: 'Exit',
            onPress: () => {
              clearTokenCache();
              BackHandler.exitApp();
            },
          },
        ]);
        return true; // Prevent default back behavior
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
      params: { 
        mediaUrl, 
        cookie, 
        referer, 
        origin, 
        drmUrl, 
        userAgent, 
        drmScheme, 
        fromHome: 'true'
      }
    });
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      <SideDrawer visible={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsDrawerOpen(true)} style={styles.iconBtn}>
          <MaterialIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>StreamBD Player</Text>
        <TouchableOpacity onPress={() => router.push('/history')} style={styles.iconBtn}>
          <MaterialIcons name="history" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.glassCard}>
          <OutlinedInput label="Media Stream URL" value={mediaUrl} onChangeText={setMediaUrl} />
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
                <View style={[styles.outlinedInput, { paddingHorizontal: 0, justifyContent: 'center' }]}>
                  <Picker
                    selectedValue={userAgent}
                    onValueChange={(val) => {
                      if (val === 'Custom') {
                        setShowCustomUAModal(true);
                      } else {
                        setUserAgent(val);
                      }
                    }}
                    style={{ color: '#fff', width: '100%', height: 50, backgroundColor: 'transparent' } as any}
                    dropdownIconColor="#ccc"
                  >
                    <Picker.Item label="Default" value="Default" />
                    <Picker.Item label="Chrome(Android)" value="Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36" />
                    <Picker.Item label="Chrome(PC)" value="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36" />
                    <Picker.Item label="Firefox(PC)" value="Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0" />
                    <Picker.Item label="iPhone" value="Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1" />
                    {customUA !== '' && <Picker.Item label="Custom UA" value={customUA} />}
                    <Picker.Item label="Add Custom..." value="Custom" />
                  </Picker>
                </View>
              </View>
            </View>

            <View style={[styles.flex1, { marginLeft: 5 }]}>
              <View style={styles.inputWrapper}>
                <View style={styles.floatingLabelWrapper}>
                  <Text style={styles.floatingLabel}>DrmScheme</Text>
                </View>
                <View style={[styles.outlinedInput, { paddingHorizontal: 0, justifyContent: 'center' }]}>
                  <Picker
                    selectedValue={drmScheme}
                    onValueChange={(val) => setDrmScheme(val)}
                    style={{ color: '#fff', width: '100%', height: 50, backgroundColor: 'transparent' } as any}
                    dropdownIconColor="#ccc"
                  >
                    <Picker.Item label="widevine" value="widevine" />
                    <Picker.Item label="playready" value="playready" />
                    <Picker.Item label="clearkey" value="clearkey" />
                  </Picker>
                </View>
              </View>
            </View>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Custom Toast */}
      {showToast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <MaterialIcons name="play-circle-outline" size={24} color="#f39c12" style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>Please check the play URL</Text>
        </Animated.View>
      )}

      {/* FAB Play Button */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: Math.max(insets.bottom + 80, 90) }]} 
        activeOpacity={0.8} 
        onPress={handlePlay}
      >
        <MaterialIcons name="play-arrow" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Custom UA Modal */}
      <Modal visible={showCustomUAModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Custom User Agent</Text>
            <TextInput 
              style={styles.modalInput} 
              value={customUAInput} 
              onChangeText={setCustomUAInput} 
              placeholder="Mozilla/5.0..." 
              placeholderTextColor="#666" 
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowCustomUAModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { 
                if (customUAInput.trim()) {
                  setCustomUA(customUAInput.trim()); 
                  setUserAgent(customUAInput.trim()); 
                }
                setShowCustomUAModal(false); 
              }}>
                <Text style={styles.modalOk}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
  },
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
    paddingBottom: 100,
  },
  glassCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 20,
    position: 'relative',
  },
  floatingLabelWrapper: {
    position: 'absolute',
    left: 10,
    top: -8,
    backgroundColor: '#1a1a24',
    paddingHorizontal: 4,
    zIndex: 2,
  },
  floatingLabel: {
    color: '#8a8aa3',
    fontSize: 12,
    fontFamily: 'Inter_Medium',
  },
  outlinedInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_Medium',
    backgroundColor: 'rgba(255,255,255,0.02)',
    height: 52,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
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
  toastText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    width: '85%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    color: '#fff',
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
    backgroundColor: '#121212',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCancel: {
    color: '#aaa',
    fontSize: 16,
    marginRight: 20,
    fontWeight: '600',
  },
  modalOk: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
});
