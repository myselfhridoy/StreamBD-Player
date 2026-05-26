import Text from '../components/Text';
import React, { useState, useEffect, memo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, ActivityIndicator, Image, Modal, TextInput, Dimensions, TouchableHighlight } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseM3U, Channel } from '../utils/m3uParser';
import { usePlaylist } from './context/PlaylistContext';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');
const numColumns = Math.floor(width / 100);

const MemoizedChannelItem = memo(({ item, index, onPress, onLongPress, isFavorite }: { item: Channel, index: number, onPress: (item: Channel, index: number) => void, onLongPress: (item: Channel) => void, isFavorite: boolean }) => (
  <TouchableHighlight 
    style={[styles.channelItem, isFavorite && styles.favoriteItem]} 
    onPress={() => onPress(item, index)}
    onLongPress={() => onLongPress(item)}
    underlayColor="rgba(255,255,255,0.1)"
  >
    <View style={{ alignItems: 'center', width: '100%' }}>
      <View style={styles.logoContainer}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.channelLogo} resizeMode="contain" />
        ) : (
          <Text style={{color: '#E50914', fontWeight: 'bold', fontSize: 18}}>Live</Text>
        )}
        {isFavorite && (
          <View style={styles.favBadge}>
            <MaterialIcons name="star" size={12} color="#FFD700" />
          </View>
        )}
      </View>
      <Text style={styles.channelName} numberOfLines={2} ellipsizeMode="tail">
        {item.name}
      </Text>
    </View>
  </TouchableHighlight>
));

export default function ChannelBrowserScreen() {
  const { playlistUrl, playlistName, isLocal, isLiveEvent } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPlaylist } = usePlaylist();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [favoriteUrls, setFavoriteUrls] = useState<Set<string>>(new Set());
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isCategorySearchActive, setIsCategorySearchActive] = useState(false);

  useEffect(() => {
    loadPlaylist();
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const data = await AsyncStorage.getItem('favorite_channels');
      if (data) {
        const favs: Channel[] = JSON.parse(data);
        const urls = new Set(favs.map(f => f.url));
        setFavoriteUrls(urls);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = async (channel: Channel) => {
    try {
      const data = await AsyncStorage.getItem('favorite_channels');
      let favs: Channel[] = data ? JSON.parse(data) : [];
      
      const isFav = favs.some(f => f.url === channel.url);
      if (isFav) {
        favs = favs.filter(f => f.url !== channel.url);
      } else {
        // Tag with isLiveEvent if added from the Live TV section
        favs.push({ ...channel, isLiveEvent: isLiveEvent === 'true' } as any);
      }
      
      await AsyncStorage.setItem('favorite_channels', JSON.stringify(favs));
      
      // Update local state
      const urls = new Set(favs.map(f => f.url));
      setFavoriteUrls(urls);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPlaylist = async () => {
    setLoading(true);
    setError('');
    try {
      let content = '';
      if (isLocal === 'true') {
        content = await FileSystem.readAsStringAsync(playlistUrl as string);
      } else {
        const response = await fetch(playlistUrl as string);
        if (!response.ok) throw new Error('Failed to fetch playlist');
        content = await response.text();
      }

      const parsed = parseM3U(content);
      setAllChannels(parsed);
      setFilteredChannels(parsed);
      
      // Extract unique categories
      const uniqueCats = new Set<string>();
      parsed.forEach(c => {
        if (c.group) uniqueCats.add(c.group);
      });
      setCategories(['All', ...Array.from(uniqueCats)]);
    } catch (err: any) {
      setError(err.message || 'Failed to load playlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = allChannels;
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(c => c.group === selectedCategory);
    }
    
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    setFilteredChannels(filtered);
  }, [selectedCategory, searchQuery, allChannels]);

  const handleChannelPress = useCallback((channel: Channel, index: number) => {
    setPlaylist(filteredChannels, index);
    router.push({
      pathname: '/player',
      params: { 
        mediaUrl: channel.url, 
        cookie: channel.cookie || '', 
        referer: channel.httpReferer || '', 
        origin: channel.origin || '', 
        userAgent: channel.userAgent || 'Default',
        streamFormat: 'auto',
        channelName: channel.name,
        channelLogo: channel.logo,
        channelGroup: channel.group,
        tokenUrl: channel.tokenUrl || '',
        tokenMatch: channel.tokenMatch || '',
        tokenReplace: channel.tokenReplace || '',
        tokenId: channel.tokenId ? String(channel.tokenId) : '',
        drmScheme: channel.drm?.type || 'clearkey',
        drmUrl: channel.drm?.licenseServer || (channel.drm?.rawKeyPair || ''),
        isLiveEvent: isLiveEvent === 'true' ? 'true' : 'false'
      }
    });
  }, [filteredChannels, setPlaylist, router]);

  const renderChannel = useCallback(({ item, index }: { item: Channel, index: number }) => (
    <MemoizedChannelItem 
      item={item} 
      index={index} 
      onPress={handleChannelPress} 
      onLongPress={toggleFavorite}
      isFavorite={favoriteUrls.has(item.url)}
    />
  ), [handleChannelPress, favoriteUrls]);

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
            <Text style={styles.headerTitle} numberOfLines={1}>{playlistName || 'Playlist'}</Text>
          ) : (
            <TextInput
              style={styles.searchInput}
              placeholder="Search channels..."
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
            <MaterialIcons name={isSearchActive ? "close" : "search"} size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/favorites')} style={styles.iconBtn}>
            <MaterialIcons name="star" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories Bar */}
      {!loading && !error && (
        <View style={styles.categoryBarContainer}>
          <TouchableOpacity style={styles.choseBtn} onPress={() => setShowCategoryModal(true)}>
            <MaterialIcons name="list" size={20} color="#fff" style={{ marginRight: 5 }} />
            <Text style={styles.choseBtnText}>Chose</Text>
          </TouchableOpacity>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.categoryChip, selectedCategory === item && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(item)}
              >
                {selectedCategory === item && <MaterialIcons name="check" size={16} color="#fff" style={{ marginRight: 4 }} />}
                <Text style={styles.categoryChipText}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingRight: 15 }}
          />
        </View>
      )}

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Loading channels...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <MaterialIcons name="error-outline" size={48} color="#E50914" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadPlaylist}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredChannels}
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
              <Text style={styles.emptyText}>No channels found</Text>
            </View>
          }
        />
      )}

      {/* Category Modal */}
      <Modal 
        visible={showCategoryModal} 
        transparent 
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.categoryModal, { marginTop: Math.max(insets.top, 15) + 60 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.iconBtn}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              {!isCategorySearchActive ? (
                <Text style={styles.modalTitle}>Chose Category</Text>
              ) : (
                <TextInput
                  style={[styles.searchInput, { marginLeft: 0 }]}
                  placeholder="Search category..."
                  placeholderTextColor="#999"
                  value={categorySearchQuery}
                  onChangeText={setCategorySearchQuery}
                  autoFocus
                />
              )}
              <TouchableOpacity onPress={() => {
                if (isCategorySearchActive) setCategorySearchQuery('');
                setIsCategorySearchActive(!isCategorySearchActive);
              }} style={styles.iconBtn}>
                <MaterialIcons name={isCategorySearchActive ? "close" : "search"} size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories.filter(c => c.toLowerCase().includes(categorySearchQuery.toLowerCase()))}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalCategoryItem}
                  onPress={() => {
                    setSelectedCategory(item);
                    setShowCategoryModal(false);
                  }}
                >
                  <MaterialIcons name="playlist-play" size={24} color="#fff" />
                  <Text style={styles.modalCategoryText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
    marginLeft: 5,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    marginLeft: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#666',
    paddingVertical: 5,
  },
  categoryBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  choseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
  },
  choseBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 6,
    marginRight: 8,
  },
  categoryChipActive: {
    borderColor: '#fff',
  },
  categoryChipText: {
    color: '#fff',
    fontSize: 14,
  },
  gridContainer: {
    paddingHorizontal: 10,
    paddingBottom: 100,
  },
  channelItem: {
    width: (width - 20) / numColumns,
    alignItems: 'center',
    padding: 10,
  },
  favoriteItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 12,
  },
  logoContainer: {
    width: 75,
    height: 75,
    backgroundColor: '#1C2039',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#2A2E45',
    overflow: 'hidden',
    position: 'relative',
  },
  favBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 2,
  },
  channelLogo: {
    width: 50,
    height: 50,
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
  loadingText: {
    color: '#ccc',
    marginTop: 15,
    fontSize: 16,
  },
  errorText: {
    color: '#ff4444',
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#E50914',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#ccc',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  categoryModal: {
    backgroundColor: '#1C2039',
    marginHorizontal: 15,
    borderRadius: 15,
    maxHeight: '70%',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2E45',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2E45',
  },
  modalCategoryText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
});
