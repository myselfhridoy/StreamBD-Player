import React, { useState, useRef } from 'react';
import { StyleSheet, TextInput, ScrollView, TouchableOpacity, View, Animated, Text, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OutlinedInput = ({ label, value, onChangeText, placeholder }: any) => {
  return (
    <View style={styles.inputWrapper}>
      {value.length === 0 ? (
        <View style={styles.placeholderWrapper} pointerEvents="none">
          <Text style={styles.placeholderText}>{label}</Text>
        </View>
      ) : (
        <View style={styles.floatingLabelWrapper}>
          <Text style={styles.floatingLabel}>{label}</Text>
        </View>
      )}
      <TextInput
        style={styles.outlinedInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={value.length === 0 ? '' : placeholder}
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

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePlay = () => {
    if (!mediaUrl) {
      // Show Toast
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
      params: { mediaUrl, cookie, referer, origin, drmUrl, userAgent, drmScheme }
    });
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>StreamBD Player</Text>
        <TouchableOpacity onPress={() => router.push('/history')} style={styles.historyBtn}>
          <MaterialIcons name="history" size={26} color="#ccc" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Custom Toast */}
      {showToast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <MaterialIcons name="play-circle-outline" size={24} color="#f39c12" style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>Please check the play URL</Text>
        </Animated.View>
      )}

      {/* FAB */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: Math.max(insets.bottom + 80, 90) }]} 
        activeOpacity={0.8} 
        onPress={handlePlay}
      >
        <MaterialIcons name="play-arrow" size={32} color="#3b82f6" />
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
    backgroundColor: '#121212', // Pure dark theme from screenshot
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  historyBtn: {
    padding: 5,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  inputWrapper: {
    marginBottom: 20,
    position: 'relative',
  },
  placeholderWrapper: {
    position: 'absolute',
    left: 15,
    top: 15,
    zIndex: 1,
  },
  placeholderText: {
    color: '#ccc',
    fontSize: 16,
  },
  floatingLabelWrapper: {
    position: 'absolute',
    left: 10,
    top: -8,
    backgroundColor: '#121212',
    paddingHorizontal: 4,
    zIndex: 2,
  },
  floatingLabel: {
    color: '#888',
    fontSize: 12,
  },
  outlinedInput: {
    height: 54,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    paddingHorizontal: 15,
    color: '#fff',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flex1: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
  },
  toastText: {
    color: '#ccc',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    borderWidth: 1,
    borderColor: '#333',
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
