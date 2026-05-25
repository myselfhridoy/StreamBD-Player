import Text from '../components/Text';
import React, { useState, useEffect, memo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, Image, Dimensions, TextInput } from 'react-native';;
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Channel } from '../utils/m3uParser';
import { usePlaylist } from './context/PlaylistContext';

const { width } = Dimensions.get('window');
const numColumns = Math.floor(width / 100);

const MemoizedChannelItem = memo(({ item, index, onPress, onLongPress }: { item: Channel, index: number, onPress: (item: Channel, index: number) => void, onLongPress: (url: string) => void }) => (
  <TouchableOpacity style={styles.channelItem} onPress={() => onPress(item, index)} onLongPress={() => onLongPress(item.url)}>
    <View style={styles.logoContainer}>
      {item.logo ? (
        <Image source={{ uri: item.logo }} style={styles.channelLogo} resizeMode="contain" />
      ) : (
        <MaterialIcons name="tv" size={40} color="#ccc" />
      )}
      <TouchableOpacity 
        style={styles.favoriteIcon} 
        onPress={() => onLongPress(item.url)}
      >
        <MaterialIcons name="star" size={20} color="#FFD700" />
      </TouchableOpacity>
    </View>
    <Text style={styles.channelName} numberOfLines={2} ellipsizeMode="tail">
      {item.name}
    </Text>
  </TouchableOpacity>
));

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPlaylist } = usePlaylist();

  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [activeTab, setActiveTab] = useState<'LIVE EVENTS' | 'CHANNELS' | 'VOD'>('CHANNELS');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    try {
      const data = await AsyncStorage.getItem('favorite_channels');
      if (data) {
        setFavorites(JSON.parse(data));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeFavorite = async (url: string) => {
    try {
      const updated = favorites.filter(f => f.url !== url);
      setFavorites(updated);
      await AsyncStorage.setItem('favorite_channels', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-categorization logic
  const getCategory = (channel: Channel) => {
    // As per user request, M3U channels always go to CHANNELS tab.
    // Live Events and VOD tabs are reserved for future features.
    return 'CHANNELS';
  };

  const getFilteredFavorites = () => {
    let filtered = favorites.filter(f => getCategory(f) === activeTab);
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  };

  const handleChannelPress = useCallback((channel: Channel, index: number) => {
    setPlaylist(getFilteredFavorites(), index);
    router.push({
      pathname: '/player',
      params: { 
        mediaUrl: channel.url, 
        cookie: channel.cookie || '', 
        referer: '', 
        origin: '', 
        drmUrl: '', 
        userAgent: channel.userAgent || 'Default', 
        drmScheme: 'clearkey', 
        streamFormat: 'auto',
        channelName: channel.name,
        channelLogo: channel.logo,
        channelGroup: channel.group
      }
    });
  }, [getFilteredFavorites, setPlaylist, router]);

  const renderChannel = useCallback(({ item, index }: { item: Channel, index: number }) => (
    <MemoizedChannelItem item={item} index={index} onPress={handleChannelPress} onLongPress={removeFavorite} />
  ), [handleChannelPress, removeFavorite]);

  const displayedFavorites = getFilteredFavorites();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 15) }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          {!isSearchActive ? (
            <Text style={styles.headerTitle}>Favourites</Text>
          ) : (
            <TextInput
              style={styles.searchInput}
              placeholder="Search favorites..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => {
            if (isSearchActive) setSearchQuery('');
            setIsSearchActive(!isSearchActive);
          }} style={styles.iconBtn}>
            <MaterialIcons name="search" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, styles.starBtnActive]}>
            <MaterialIcons name="star" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['LIVE EVENTS', 'CHANNELS', 'VOD'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <FlatList
        data={displayedFavorites}
        keyExtractor={(item, index) => item.url + index}
        numColumns={numColumns}
        renderItem={renderChannel}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={{ justifyContent: 'flex-start' }}
        removeClippedSubviews={true}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListEmptyComponent={
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>No favourite channel found!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121526', // Match the deep blue background from screenshots
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    marginLeft: 5,
  },
  starBtnActive: {
    backgroundColor: '#2A2E45',
    borderRadius: 20,
    padding: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '500',
    marginLeft: 15,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    marginLeft: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#666',
    paddingVertical: 5,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#181A20', // Slightly different background for tabs
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#00E5FF', // Cyan accent color from screenshot
  },
  tabText: {
    color: '#999',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: '#00E5FF',
  },
  gridContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 100,
    flexGrow: 1,
  },
  channelItem: {
    width: (width - 20) / numColumns,
    alignItems: 'center',
    padding: 10,
  },
  logoContainer: {
    width: 75,
    height: 75,
    backgroundColor: '#fff',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#2A2E45',
    overflow: 'hidden',
  },
  channelLogo: {
    width: 50,
    height: 50,
  },
  favoriteIcon: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#1C2039',
    borderRadius: 12,
    padding: 2,
    borderWidth: 1,
    borderColor: '#2A2E45',
  },
  channelName: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
