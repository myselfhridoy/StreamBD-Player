import React, { useState } from 'react';
import { StyleSheet, TextInput, ScrollView, Platform, TouchableOpacity, useColorScheme } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Picker } from '@react-native-picker/picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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

  const handlePlay = () => {
    router.push({
      pathname: '/player',
      params: { mediaUrl, cookie, referer, origin, drmUrl, userAgent, drmScheme }
    });
  };

  const gradientColors = isDark ? ['#1e1e2d', '#0f0f18'] as const : ['#f4f6ff', '#e2e8ff'] as const;
  const glassColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.6)';
  const textColor = isDark ? '#ffffff' : '#1a1a24';
  const placeholderColor = isDark ? '#6b6b80' : '#8a8aa3';
  const inputBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.9)';

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        <Text style={[styles.headerText, { color: textColor }]}>Stream Setup</Text>
        
        <BlurView intensity={isDark ? 40 : 80} tint={isDark ? 'dark' : 'light'} style={[styles.glassCard, { backgroundColor: glassColor, borderColor: inputBorder }]}>
          
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

          <View style={styles.row}>
            <View style={[styles.flex1, { marginRight: 10, backgroundColor: 'transparent' }]}>
              <Text style={[styles.label, { color: textColor }]}>User Agent</Text>
              <View style={[styles.pickerContainer, { borderColor: inputBorder, backgroundColor: inputBg }]}>
                <Picker
                  selectedValue={userAgent}
                  onValueChange={(itemValue) => setUserAgent(itemValue)}
                  style={{ color: textColor }}
                  dropdownIconColor={textColor}
                >
                  <Picker.Item label="Default" value="Default" />
                  <Picker.Item label="Chrome" value="Chrome" />
                  <Picker.Item label="Firefox" value="Firefox" />
                </Picker>
              </View>
            </View>

            <View style={[styles.flex1, { marginLeft: 10, backgroundColor: 'transparent' }]}>
              <Text style={[styles.label, { color: textColor }]}>DRM Scheme</Text>
              <View style={[styles.pickerContainer, { borderColor: inputBorder, backgroundColor: inputBg }]}>
                <Picker
                  selectedValue={drmScheme}
                  onValueChange={(itemValue) => setDrmScheme(itemValue)}
                  style={{ color: textColor }}
                  dropdownIconColor={textColor}
                >
                  <Picker.Item label="Widevine" value="widevine" />
                  <Picker.Item label="PlayReady" value="playready" />
                  <Picker.Item label="ClearKey" value="clearkey" />
                </Picker>
              </View>
            </View>
          </View>
        </BlurView>
        
        {/* Padding for bottom FAB */}
        <View style={{ height: 100, backgroundColor: 'transparent' }} />
      </ScrollView>

      <TouchableOpacity 
        style={styles.fabShadow} 
        activeOpacity={0.8} 
        onPress={handlePlay}
      >
        <LinearGradient 
          colors={['#4F46E5', '#7C3AED']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={styles.fab}
        >
          <MaterialIcons name="play-arrow" size={32} color="#fff" />
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
    padding: 24,
  },
  headerText: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  glassCard: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 6,
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 18,
    marginBottom: 20,
    fontSize: 16,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  flex1: {
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    height: Platform.OS === 'ios' ? undefined : 56,
    justifyContent: 'center',
  },
  fabShadow: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    elevation: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
