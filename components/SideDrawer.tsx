import React, { useEffect, useRef } from 'react';
import { TVTouchable } from './TVTouchable';

import { StyleSheet, View, Text, Modal, Animated, Dimensions, TouchableWithoutFeedback, Linking, Share, ScrollView, BackHandler, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { clearTokenCache } from '../utils/tokenParser';

const { width, height } = Dimensions.get('window');

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = width * 0.75;

export default function SideDrawer({ visible, onClose }: SideDrawerProps) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out StreamBD Player for the best streaming experience!',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@streambd.com');
  };

  const menuItems = [
    { icon: 'playlist-play', label: 'Playlists', onPress: () => { onClose(); router.push('/playlist'); } },
    { icon: 'picture-in-picture', label: 'Floating Player', onPress: () => { onClose(); /* Will add PIP logic later */ } },
    { icon: 'settings', label: 'Video Quality Setting', onPress: () => { onClose(); /* Settings logic later */ } },
    { icon: 'notifications', label: 'Notice', onPress: () => { onClose(); } },
    { icon: 'chat', label: 'Join Us', onPress: () => { onClose(); Linking.openURL('https://t.me/StreamBD'); } },
    { icon: 'copyright', label: 'Copyright', onPress: () => { onClose(); } },
    { icon: 'share', label: 'Share Our App', onPress: () => { onClose(); handleShare(); } },
    { icon: 'email', label: 'Email', onPress: () => { onClose(); handleEmail(); } },
    { icon: 'system-update', label: 'Update App', onPress: () => { onClose(); } },
    { icon: 'exit-to-app', label: 'Exit', onPress: () => { 
        onClose(); 
        Alert.alert('Exit App', 'Are you sure you want to exit the app?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', onPress: () => { clearTokenCache(); BackHandler.exitApp(); } },
        ]);
    } },
  ];

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlayContainer}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>
        
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <View style={styles.header}>
            <Text style={styles.logoText}>Stream<Text style={styles.logoTextHighlight}>BD</Text></Text>
            <Text style={styles.subtitle}>Best streaming experience!</Text>
          </View>
          
          <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
            {menuItems.map((item, index) => (
              <TVTouchable key={index} style={styles.menuItem} onPress={item.onPress}>
                <MaterialIcons name={item.icon as any} size={24} color="#fff" style={styles.menuIcon} />
                <Text style={styles.menuText}>{item.label}</Text>
              </TVTouchable>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: 'rgba(15, 15, 24, 0.95)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoText: {
    color: '#fff',
    fontSize: 32,
    fontFamily: 'Inter_Bold',
  },
  logoTextHighlight: {
    color: '#4F46E5', // Accent color
  },
  subtitle: {
    color: '#8a8aa3',
    fontSize: 12,
    marginTop: 5,
    fontFamily: 'Inter_Medium',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  menuIcon: {
    marginRight: 20,
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_SemiBold',
  },
});
