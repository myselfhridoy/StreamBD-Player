import React, { useEffect, useRef } from 'react';
import { TVTouchable } from './TVTouchable';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Animated, BackHandler, Dimensions, Linking, Modal, ScrollView, Share, StyleSheet, Text, TouchableWithoutFeedback, View, Image } from 'react-native';
import { clearTokenCache } from '../utils/tokenParser';

const { width, height } = Dimensions.get('window');

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = width * 0.75;

export default function SideDrawer({ visible, onClose }: SideDrawerProps) {
  const [showExitModal, setShowExitModal] = React.useState(false);
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
    { icon: 'home', label: 'Home', onPress: () => { onClose(); router.push('/'); } },
    { icon: 'dashboard', label: 'Categories', onPress: () => { onClose(); router.push('/categories'); } },
    { icon: 'cloud-download', label: 'Network', onPress: () => { onClose(); router.push('/custom'); } },
    { icon: 'favorite', label: 'Favorites', onPress: () => { onClose(); router.push('/favorites'); } },
    { icon: 'playlist-play', label: 'Playlists', onPress: () => { onClose(); router.push('/playlist'); } },
    { icon: 'settings', label: 'Settings', onPress: () => { onClose(); router.push('/settings'); } },
    { icon: 'picture-in-picture', label: 'Floating Player', onPress: () => { onClose(); /* Will add PIP logic later */ } },
    { icon: 'notifications', label: 'Notice', onPress: () => { onClose(); } },
    { icon: 'chat', label: 'Join Us', onPress: () => { onClose(); Linking.openURL('https://t.me/StreamBD'); } },
    { icon: 'copyright', label: 'Copyright', onPress: () => { onClose(); } },
    { icon: 'share', label: 'Share Our App', onPress: () => { onClose(); handleShare(); } },
    { icon: 'email', label: 'Email', onPress: () => { onClose(); handleEmail(); } },
    { icon: 'system-update', label: 'Update App', onPress: () => { onClose(); } },
    {
      icon: 'exit-to-app', label: 'Exit', onPress: () => {
        setShowExitModal(true);
      }
    },
  ];

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlayContainer}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <View style={styles.header}>
            <Image 
              source={require('../assets/images/icon.png')} 
              style={{ width: 200, height: 70, resizeMode: 'contain', marginBottom: 10 }} 
            />
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
                onPress={() => { setShowExitModal(false); onClose(); clearTokenCache(); BackHandler.exitApp(); }}
              >
                <Text style={styles.exitBtnConfirmText}>Exit</Text>
              </TVTouchable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 2,
    borderColor: 'transparent',
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
