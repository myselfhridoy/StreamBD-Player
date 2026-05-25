import { Link, Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
}) {
  return <MaterialIcons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#A78BFA' : '#4F46E5',
        tabBarInactiveTintColor: isDark ? '#6b6b80' : '#8a8aa3',
        headerShown: false, // Hide header completely for a cleaner look
        tabBarStyle: { 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          backgroundColor: isDark ? 'rgba(15, 15, 24, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="local"
        options={{
          title: 'Local',
          tabBarIcon: ({ color }) => <TabBarIcon name="folder" color={color} />,
        }}
      />
      <Tabs.Screen
        name="samples"
        options={{
          title: 'Samples',
          tabBarIcon: ({ color }) => <TabBarIcon name="ondemand-video" color={color} />,
        }}
      />
      <Tabs.Screen
        name="playlist"
        options={{
          title: 'Playlist',
          tabBarIcon: ({ color }) => <TabBarIcon name="playlist-play" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
