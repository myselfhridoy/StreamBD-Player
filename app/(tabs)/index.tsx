import React, { useState } from 'react';
import { StyleSheet, TextInput, ScrollView, Platform, TouchableOpacity, useColorScheme } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Picker } from '@react-native-picker/picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

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
  
  const inputStyle = [
    styles.input,
    {
      borderColor: isDark ? '#333' : '#ccc',
      color: isDark ? '#fff' : '#000',
      backgroundColor: isDark ? '#1a1a1a' : '#fff'
    }
  ];

  const pickerContainerStyle = [
    styles.pickerContainer,
    {
      borderColor: isDark ? '#333' : '#ccc',
      backgroundColor: isDark ? '#1a1a1a' : '#fff'
    }
  ];

  const router = useRouter();

  const handlePlay = () => {
    router.push({
      pathname: '/player',
      params: { mediaUrl, cookie, referer, origin, drmUrl, userAgent, drmScheme }
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TextInput
          style={inputStyle}
          placeholder="Media Stream URL"
          placeholderTextColor={isDark ? '#888' : '#aaa'}
          value={mediaUrl}
          onChangeText={setMediaUrl}
        />
        <TextInput
          style={inputStyle}
          placeholder="Cookie Value"
          placeholderTextColor={isDark ? '#888' : '#aaa'}
          value={cookie}
          onChangeText={setCookie}
        />
        <TextInput
          style={inputStyle}
          placeholder="Referer Value"
          placeholderTextColor={isDark ? '#888' : '#aaa'}
          value={referer}
          onChangeText={setReferer}
        />
        <TextInput
          style={inputStyle}
          placeholder="Origin Value"
          placeholderTextColor={isDark ? '#888' : '#aaa'}
          value={origin}
          onChangeText={setOrigin}
        />
        <TextInput
          style={inputStyle}
          placeholder="DRM License URL"
          placeholderTextColor={isDark ? '#888' : '#aaa'}
          value={drmUrl}
          onChangeText={setDrmUrl}
        />

        <View style={styles.row}>
          <View style={[styles.flex1, { marginRight: 8 }]}>
            <Text style={styles.label}>UserAgent</Text>
            <View style={pickerContainerStyle}>
              <Picker
                selectedValue={userAgent}
                onValueChange={(itemValue) => setUserAgent(itemValue)}
                style={{ color: isDark ? '#fff' : '#000' }}
                dropdownIconColor={isDark ? '#fff' : '#000'}
              >
                <Picker.Item label="Default" value="Default" />
                <Picker.Item label="Chrome" value="Chrome" />
                <Picker.Item label="Firefox" value="Firefox" />
              </Picker>
            </View>
          </View>

          <View style={[styles.flex1, { marginLeft: 8 }]}>
            <Text style={styles.label}>DrmScheme</Text>
            <View style={pickerContainerStyle}>
              <Picker
                selectedValue={drmScheme}
                onValueChange={(itemValue) => setDrmScheme(itemValue)}
                style={{ color: isDark ? '#fff' : '#000' }}
                dropdownIconColor={isDark ? '#fff' : '#000'}
              >
                <Picker.Item label="widevine" value="widevine" />
                <Picker.Item label="playready" value="playready" />
                <Picker.Item label="clearkey" value="clearkey" />
              </Picker>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handlePlay}>
        <MaterialIcons name="play-arrow" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  flex1: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    color: '#888',
    marginLeft: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    height: Platform.OS === 'ios' ? undefined : 50,
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8b9af3',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
