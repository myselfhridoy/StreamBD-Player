import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import Text from '../components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TVTouchable } from '../components/TVTouchable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import { isTV } from '../components/tv';

export default function OnboardingScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Error setting onboarding state', e);
      router.replace('/(tabs)');
    }
  };

  const featureRows = (
    <>
      <View style={styles.featureRow}>
        <View style={styles.iconBox}>
          <MaterialIcons name="tv" size={28} color="#4F46E5" />
        </View>
        <View style={styles.featureTextContainer}>
          <Text style={styles.featureTitle}>Watch Live TV</Text>
          <Text style={styles.featureDesc}>Enjoy your favorite live channels, movies, and series with seamless playback.</Text>
        </View>
      </View>

      <View style={styles.featureRow}>
        <View style={styles.iconBox}>
          <MaterialIcons name="high-quality" size={28} color="#E50914" />
        </View>
        <View style={styles.featureTextContainer}>
          <Text style={styles.featureTitle}>4K HDR Support</Text>
          <Text style={styles.featureDesc}>Experience true cinematic quality with our advanced device decoder support.</Text>
        </View>
      </View>

      <View style={styles.featureRow}>
        <View style={styles.iconBox}>
          <MaterialIcons name="playlist-add" size={28} color="#10B981" />
        </View>
        <View style={styles.featureTextContainer}>
          <Text style={styles.featureTitle}>Custom Playlists</Text>
          <Text style={styles.featureDesc}>Easily connect your own IPTV playlists using Network sources.</Text>
        </View>
      </View>
    </>
  );

  return (
    <LinearGradient colors={['#1a0b2e', '#050505']} style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/icon.png')} 
            style={styles.logo} 
          />
        </View>
        
        {/* Features Glassmorphism Card */}
        <View style={{ borderRadius: 24, overflow: 'hidden', marginVertical: 40, width: '100%', maxWidth: isTV ? 900 : 600 }}>
          {isTV ? (
            <View style={[styles.glassCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              {featureRows}
            </View>
          ) : (
            <BlurView intensity={30} tint="dark" style={styles.glassCard}>
              {featureRows}
            </BlurView>
          )}
        </View>

        {/* Get Started Button */}
        <TVTouchable 
          onPress={handleGetStarted}
          hasTVPreferredFocus={true}
          style={(state: any) => [
            styles.getStartedBtnWrapper,
            state.focused && styles.getStartedBtnFocused,
            state.pressed && { transform: [{ scale: 0.98 }] }
          ]}
        >
          <LinearGradient
            colors={['#4F46E5', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>Get Started</Text>
            <MaterialIcons name="arrow-forward" size={24} color="#fff" style={{ marginLeft: 10 }} />
          </LinearGradient>
        </TVTouchable>

      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: isTV ? 900 : 600,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 250,
    height: 90,
    resizeMode: 'contain',
  },
  glassCard: {
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    color: '#fff',
    fontSize: isTV ? 22 : 18,
    fontFamily: 'Inter_Bold',
    marginBottom: 4,
  },
  featureDesc: {
    color: '#8a8aa3',
    fontSize: isTV ? 16 : 13,
    fontFamily: 'Inter_Medium',
    lineHeight: 18,
  },
  getStartedBtnWrapper: {
    width: '100%',
    maxWidth: isTV ? 600 : 400,
    height: isTV ? 70 : 55,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginTop: 10,
  },
  getStartedBtnFocused: {
    borderColor: '#fff',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  btnGradient: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_Bold',
  }
});
