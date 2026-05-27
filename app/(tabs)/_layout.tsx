import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet, useColorScheme, Dimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { isTV } from '../../components/tv';
import TVSidebar from '../../components/TVSidebar';

const { width } = Dimensions.get('window');

function TabBarIcon(props: {
  name: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string | any;
  focused: boolean;
}) {
  return (
    <View style={styles.iconContainer}>
      <MaterialIcons size={26} style={{ marginBottom: -3 }} name={props.name} color={props.color} />
      {props.focused && (
        <View style={styles.activeDot} />
      )}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const tabs = (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#E50914', // Netflix Red
        tabBarInactiveTintColor: isDark ? '#6b6b80' : '#8a8aa3',
        headerShown: false,
        tabBarShowLabel: false, // Hide labels for a cleaner look
        tabBarStyle: isTV ? { display: 'none' } : { 
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 25 : 15,
          left: 20,
          right: 20,
          elevation: 0,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          backgroundColor: isDark ? 'rgba(15, 15, 24, 0.75)' : 'rgba(255, 255, 255, 0.85)',
          borderRadius: 40,
          height: 65,
          paddingBottom: 0,
          paddingTop: 0,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
        },
        tabBarBackground: () => (
          <BlurView 
            tint={isDark ? 'dark' : 'light'} 
            intensity={60} 
            style={StyleSheet.absoluteFill} 
          />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="dashboard" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="media"
        options={{
          title: 'Media',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="movie" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favourites',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="favorite" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="settings" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );

  if (isTV) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#0d0d14' }}>
        <TVSidebar />
        <View style={{ flex: 1 }}>
          {tabs}
        </View>
      </View>
    );
  }

  return tabs;
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: 50,
  },
  activeDot: {
    position: 'absolute',
    bottom: -8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E50914',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 3,
  }
});
