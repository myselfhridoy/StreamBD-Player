import Text from '../../components/Text';
import { TVTouchable, TVFlatList, getTVColumns } from '../../components/tv';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Channel } from '../../utils/m3uParser';
import { usePlaylist } from '../context/PlaylistContext';
import { useDrawer } from '../context/DrawerContext';
import { isTV } from '../../components/tv';

const { width } = Dimensions.get('window');
const numColumns = getTVColumns();

const MemoizedChannelItem = memo(({ item, index, onPress, onLongPress }: { item: Channel, index: number, onPress: (item: Channel, index: number) => void, onLongPress: (url: string) => void }) => (
  <TVTouchable
    style={styles.channelItem}
    onPress={() => onPress(item, index)}
    onLongPress={() => onLongPress(item.url)}
    underlayColor="rgba(255,255,255,0.1)"
  >
    <View style={{ alignItems: 'center', width: '100%' }}>
      <View style={styles.logoContainer}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.channelLogo} resizeMode="contain" />
        ) : (
          <MaterialIcons name="tv" size={40} color="#ccc" />
        )}
        <TVTouchable
          style={styles.favoriteIcon}
          onPress={() => onLongPress(item.url)}
        >
          <MaterialIcons name="star" size={20} color="#FFD700" />
        </TVTouchable>
      </View>
      <Text style={styles.channelName} numberOfLines={2} ellipsizeMode="tail">
        {item.name}
      </Text>
    </View>
  </TVTouchable>
));

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPlaylist } = usePlaylist();
  const { openDrawer } = useDrawer();

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
  const getCategory = (channel: any) => {
    if (channel.isVod || channel.vodId) {
      return 'VOD';
    }
    if (channel.isLiveEvent) {
      return 'LIVE EVENTS';
    }
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
    // VOD items navigate to details screen
    if ((channel as any).isVod && (channel as any).vodId) {
      router.push({
        pathname: '/details/[id]',
        params: {
          id: (channel as any).vodId,
          type: (channel as any).vodType || 'movie',
        }
      });
      return;
    }

    setPlaylist(getFilteredFavorites(), index);
    router.push({
      pathname: '/player',
      params: {
        mediaUrl: channel.url,
        cookie: channel.cookie || '',
        referer: channel.httpReferer || '',
        origin: channel.origin || '',
        userAgent: channel.userAgent || 'Default',
        drmUrl: channel.drm?.licenseServer || (channel.drm?.rawKeyPair || ''),
        drmScheme: channel.drm?.type || 'clearkey',
        streamFormat: 'auto',
        channelName: channel.name,
        channelLogo: channel.logo,
        channelGroup: channel.group,
        tokenUrl: channel.tokenUrl || '',
        tokenMatch: channel.tokenMatch || '',
        tokenReplace: channel.tokenReplace || '',
        tokenId: channel.tokenId || '',
        fromHome: 'false'
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
        {!isTV && (
          <TVTouchable onPress={openDrawer} style={styles.iconBtn}>
            <MaterialIcons name="menu" size={28} color="#fff" />
          </TVTouchable>
        )}

        {!isSearchActive ? (
          <Text style={styles.headerTitle}>Favourites</Text>
        ) : (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search favorites..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        )}

        <TVTouchable onPress={() => {
          if (isSearchActive) setSearchQuery('');
          setIsSearchActive(!isSearchActive);
        }} style={styles.iconBtn}>
          <MaterialIcons name={isSearchActive ? "close" : "search"} size={26} color="#fff" />
        </TVTouchable>
        <TVTouchable style={styles.iconBtn}>
          <MaterialIcons name="star" size={26} color="#fff" />
        </TVTouchable>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['LIVE EVENTS', 'CHANNELS', 'VOD'].map((tab) => (
          <TVTouchable
            key={tab}
            hasTVPreferredFocus={tab === 'LIVE EVENTS'}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TVTouchable>
        ))}
      </View>

      {/* Content */}
      <TVFlatList
        data={displayedFavorites}
        keyExtractor={(item, index) => item.url + index}
        renderItem={renderChannel}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={{ justifyContent: 'flex-start' }}
        removeClippedSubviews={true}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="star-border" size={64} color="#8a8aa3" style={{ marginBottom: 15 }} />
            <Text style={styles.emptyText}>No favorites in {activeTab}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_Bold',
    marginLeft: 15,
  },
  searchContainer: {
    flex: 1,
    marginLeft: 15,
    marginRight: 10,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Inter_Medium',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
  },
  tab: {
    flex: 1, // Makes all tabs identically sized
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderColor: '#4F46E5',
  },
  tabText: {
    color: '#8a8aa3',
    fontSize: 14,
    fontFamily: 'Inter_SemiBold',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#fff',
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
    backgroundColor: '#1a1a24',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    fontFamily: 'Inter_SemiBold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#8a8aa3',
    fontSize: 16,
    fontFamily: 'Inter_Medium',
  },
});
