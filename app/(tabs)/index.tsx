import React, { useState } from 'react';
import { StyleSheet, TextInput, ScrollView, Platform, TouchableOpacity, useColorScheme, View as RNView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Picker } from '@react-native-picker/picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [mediaUrl, setMediaUrl] = useState('');
  const [cookie, setCookie] = useState('');
  const [referer, setReferer] = useState('');
  const [origin, setOrigin] = useState('');
  const [drmUrl, setDrmUrl] = useState('');
  const [userAgent, setUserAgent] = useState('Default');
  const [drmScheme, setDrmScheme] = useState('widevine');

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePlay = () => {
    if (!mediaUrl) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a Media Stream URL');
      } else {
        alert('Please enter a Media Stream URL');
      }
      return;
    }
    
    if (Platform.OS === 'web') {
      window.alert('Note: react-native-video is optimized for native Android/iOS. Web playback may be limited.');
    }

    router.push({
      pathname: '/player',
      params: { mediaUrl, cookie, referer, origin, drmUrl, userAgent, drmScheme }
    });
  };

  const gradientColors = isDark ? ['#111118', '#1c1c28'] as const : ['#f0f2f5', '#ffffff'] as const;
  const cardColor = isDark ? 'rgba(35, 35, 50, 0.7)' : 'rgba(255, 255, 255, 0.9)';
  const textColor = isDark ? '#ffffff' : '#1a1a24';
  const placeholderColor = isDark ? '#6b6b80' : '#8a8aa3';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const inputBg = isDark ? 'rgba(0,0,0,0.3)' : '#f9f9fb';

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 20, 40) }]} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        
        <Text style={[styles.headerText, { color: textColor }]}>Stream Setup</Text>
        
        <RNView style={[styles.card, { backgroundColor: cardColor, borderColor: inputBorder }]}>
          
          <Text style={[styles.label, { color: textColor }]}>Media Stream URL</Text>
          <TextInput
            style={[styles.input, { borderColor: inputBorder, color: textColor, backgroundColor: inputBg }]}
            placeholder="https://example.com/stream.m3u8"
            placeholderTextColor={placeholderColor}
            value={mediaUrl}
            onChangeText={setMediaUrl}
          />
          
          <Text style={[styles.label, { color: textColor }]}>Cookie Value (Optional)</Text>
          <TextInput
            style={[styles.input, { borderColor: inputBorder, color: textColor, backgroundColor: inputBg }]}
            placeholder="key=value;"
            placeholderTextColor={placeholderColor}
            value={cookie}
            onChangeText={setCookie}
          />

          <Text style={[styles.label, { color: textColor }]}>Referer Value (Optional)</Text>
          <TextInput
            style={[styles.input, { borderColor: inputBorder, color: textColor, backgroundColor: inputBg }]}
            placeholder="https://referrer.com"
            placeholderTextColor={placeholderColor}
            value={referer}
            onChangeText={setReferer}
          />

          <Text style={[styles.label, { color: textColor }]}>Origin Value (Optional)</Text>
          <TextInput
            style={[styles.input, { borderColor: inputBorder, color: textColor, backgroundColor: inputBg }]}
            placeholder="https://origin.com"
            placeholderTextColor={placeholderColor}
            value={origin}
            onChangeText={setOrigin}
          />

          <Text style={[styles.label, { color: textColor }]}>DRM License URL (Optional)</Text>
          <TextInput
            style={[styles.input, { borderColor: inputBorder, color: textColor, backgroundColor: inputBg }]}
            placeholder="https://license-server.com"
            placeholderTextColor={placeholderColor}
            value={drmUrl}
            onChangeText={setDrmUrl}
          />

          <RNView style={styles.row}>
            <RNView style={[styles.flex1, { marginRight: 8 }]}>
              <Text style={[styles.label, { color: textColor }]}>User Agent</Text>
              <RNView style={[styles.pickerContainer, { borderColor: inputBorder, backgroundColor: inputBg }]}>
                <Picker
                  selectedValue={userAgent}
                  onValueChange={(itemValue) => setUserAgent(itemValue)}
                  style={{ color: textColor, backgroundColor: 'transparent', width: '100%', height: '100%', border: 'none', outline: 'none' } as any}
                  dropdownIconColor={textColor}
                >
                  <Picker.Item label="Default" value="Default" />
                  <Picker.Item label="Chrome" value="Chrome" />
                  <Picker.Item label="Firefox" value="Firefox" />
                </Picker>
              </RNView>
            </RNView>

            <RNView style={[styles.flex1, { marginLeft: 8 }]}>
              <Text style={[styles.label, { color: textColor }]}>DRM Scheme</Text>
              <RNView style={[styles.pickerContainer, { borderColor: inputBorder, backgroundColor: inputBg }]}>
                <Picker
                  selectedValue={drmScheme}
                  onValueChange={(itemValue) => setDrmScheme(itemValue)}
                  style={{ color: textColor, backgroundColor: 'transparent', width: '100%', height: '100%', border: 'none', outline: 'none' } as any}
                  dropdownIconColor={textColor}
                >
                  <Picker.Item label="Widevine" value="widevine" />
                  <Picker.Item label="PlayReady" value="playready" />
                  <Picker.Item label="ClearKey" value="clearkey" />
                </Picker>
              </RNView>
            </RNView>
          </RNView>
        </RNView>
        
        {/* Plenty of padding to allow scrolling past the FAB and Bottom Tabs */}
        <RNView style={{ height: 160 }} />
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fabShadow, { bottom: Math.max(insets.bottom + 85, 90) }]} 
        activeOpacity={0.8} 
        onPress={handlePlay}
      >
        <LinearGradient 
          colors={['#4F46E5', '#7C3AED']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={[styles.fab, { borderRadius: 34 }]}
        >
          <MaterialIcons name="play-arrow" size={34} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    fontSize: 15,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  flex1: {
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    height: 52,
    justifyContent: 'center',
  },
  fabShadow: {
    position: 'absolute',
    right: 24,
    elevation: 10,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    borderRadius: 34,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
