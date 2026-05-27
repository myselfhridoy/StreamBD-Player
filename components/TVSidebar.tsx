import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, usePathname } from 'expo-router';
import { TVTouchable } from './tv';
import Text from './Text';

const COLLAPSED_WIDTH = 60;
const EXPANDED_WIDTH = 180;

const MENU_ITEMS = [
  { icon: 'home', label: 'Home', route: '/' },
  { icon: 'dashboard', label: 'Categories', route: '/categories' },
  { icon: 'movie', label: 'Media', route: '/media' },
  { icon: 'favorite', label: 'Favorites', route: '/favorites' },
  { icon: 'settings', label: 'Settings', route: '/settings' },
];

export default function TVSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isFocused, setIsFocused] = useState(false);
  const widthAnim = useRef(new Animated.Value(COLLAPSED_WIDTH)).current;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.timing(widthAnim, {
      toValue: EXPANDED_WIDTH,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [widthAnim]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    Animated.timing(widthAnim, {
      toValue: COLLAPSED_WIDTH,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [widthAnim]);

  return (
    <Animated.View style={[styles.container, { width: widthAnim }]}>
      <View style={styles.menuContainer}>
        {MENU_ITEMS.map((item, index) => {
          // React Navigation / Expo Router pathname matching
          const isActive = pathname === item.route || (pathname === '/index' && item.route === '/');

          return (
            <TVTouchable
              key={index}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onPress={() => router.push(item.route as any)}
              style={(state: any) => [
                styles.menuItem,
                isActive && !state.focused && styles.menuItemActive,
              ]}
              focusedStyle={styles.menuItemFocused}
              nextFocusRight={-1} // Let Android TV handle it natively for now
            >
              <MaterialIcons
                name={item.icon as any}
                size={26}
                color={isActive ? '#E50914' : '#8a8aa3'}
                style={styles.icon}
              />
              <Animated.View style={{ opacity: widthAnim.interpolate({ inputRange: [COLLAPSED_WIDTH, EXPANDED_WIDTH], outputRange: [0, 1] }), overflow: 'hidden' }}>
                <Text
                  style={[
                    styles.label,
                    isActive && styles.labelActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Animated.View>
            </TVTouchable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0b10',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    height: '100%',
    paddingTop: 40,
    zIndex: 50,
  },
  menuContainer: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginVertical: 5,
    borderRadius: 8,
    width: '100%',
  },
  menuItemActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  menuItemFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ scale: 1.05 }],
    borderWidth: 2,
    borderColor: '#fff',
  },
  icon: {
    width: 30,
    textAlign: 'center',
  },
  label: {
    color: '#8a8aa3',
    fontSize: 16,
    fontFamily: 'Inter_Medium',
    marginLeft: 15,
    width: 100, // Fixed width to prevent jumping during animation
  },
  labelActive: {
    color: '#E50914',
    fontFamily: 'Inter_Bold',
  },
});
