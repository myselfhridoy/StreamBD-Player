import Colors from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, ScrollView, Image, StyleSheet, View, useColorScheme, Modal, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../../components/Text';
import { TVTouchable, isTV } from '../../components/tv';
import { useDrawer } from '../context/DrawerContext';
import { clearTokenCache } from '../../utils/tokenParser';

const { width, height } = Dimensions.get('window');
const TMDB_API_KEY = '460327acf6e0235a391222cb530de9c8';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const HERO_IMAGE_URL = 'https://image.tmdb.org/t/p/original';

interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  overview: string;
  media_type?: 'movie' | 'tv';
}

interface Category {
  title: string;
  url: string;
  type: 'movie' | 'tv';
  items: MediaItem[];
}

const CATEGORIES = [
  {
    title: 'Trending Bollywood',
    url: `/discover/movie?with_original_language=hi&sort_by=popularity.desc&api_key=${TMDB_API_KEY}`,
    type: 'movie' as const,
  },
  {
    title: 'Blockbuster South Indian',
    url: `/discover/movie?with_original_language=te|ta|ml|kn&sort_by=popularity.desc&api_key=${TMDB_API_KEY}`,
    type: 'movie' as const,
  },
  {
    title: 'Bangla Hits',
    url: `/discover/movie?with_original_language=bn&sort_by=popularity.desc&api_key=${TMDB_API_KEY}`,
    type: 'movie' as const,
  },
  {
    title: 'Popular Series',
    url: `/discover/tv?with_original_language=hi|bn|te|ta|en&sort_by=popularity.desc&api_key=${TMDB_API_KEY}`,
    type: 'tv' as const,
  },
];

const MediaCard = React.memo(({ item, onPress, onFocusChange }: { item: MediaItem, onPress: (item: MediaItem) => void, onFocusChange: (item: MediaItem | null) => void }) => {
  return (
    <TVTouchable
      onPress={() => onPress(item)}
      onFocus={() => onFocusChange(item)}
      onBlur={() => onFocusChange(null)}
      style={styles.cardWrapper}
      focusedStyle={{
        borderWidth: 2,
        borderColor: Colors.light.tint,
        transform: [{ scale: 1.05 }]
      }}
    >
      <View style={styles.cardContainer}>
        <Image
          source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.ratingBadge}>
          <MaterialIcons name="star" size={12} color="#F59E0B" />
          <Text style={styles.ratingText}>{item.vote_average?.toFixed(1)}</Text>
        </View>
      </View>
    </TVTouchable>
  );
});

export default function MediaScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { openDrawer } = useDrawer();

  const [categories, setCategories] = useState<Category[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [heroItems, setHeroItems] = useState<MediaItem[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [focusedHeroItem, setFocusedHeroItem] = useState<MediaItem | null>(null);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        setShowExitModal(true);
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const fetchedCategories: Category[] = [];

      for (const cat of CATEGORIES) {
        const res = await fetch(`${BASE_URL}${cat.url}`);
        const data = await res.json();
        const results = data.results.map((r: any) => ({ ...r, media_type: cat.type }));

        fetchedCategories.push({
          ...cat,
          items: results,
        });
      }

      const heroPool: MediaItem[] = [];
      for (const cat of fetchedCategories) {
        const valid = cat.items.filter((r: MediaItem) => r.backdrop_path);
        heroPool.push(...valid.slice(0, 3));
      }

      setCategories(fetchedCategories as Category[]);
      setHeroItems(heroPool);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch TMDB data", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAutoRotate || heroItems.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroItems.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroItems, isAutoRotate]);

  const heroItem = focusedHeroItem || (heroItems.length > 0 ? heroItems[heroIndex] : null);

  const handlePress = useCallback((item: MediaItem) => {
    router.push({
      pathname: '/details/[id]',
      params: {
        id: item.id,
        type: item.media_type || 'movie'
      }
    });
  }, [router]);

  const handleFocusChange = useCallback((item: MediaItem | null) => {
    if (item) {
      setFocusedHeroItem(item);
      setIsAutoRotate(false);
    } else {
      setTimeout(() => {
        setFocusedHeroItem(prev => prev === null ? null : prev);
        setIsAutoRotate(true);
      }, 100);
    }
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  const renderHero = () => {
    if (!heroItem) return null;
    return (
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: `${HERO_IMAGE_URL}${heroItem.backdrop_path || heroItem.poster_path}` }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(10,10,10,0.4)', isDark ? '#0A0A0A' : '#F5F5F5']}
          style={styles.heroGradient}
        />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {heroItem.title || heroItem.name}
          </Text>

          <View style={styles.heroButtons}>
            <TVTouchable
              onPress={() => handlePress(heroItem)}
              style={({ pressed }: any) => [
                styles.playButton,
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <MaterialIcons name="play-arrow" size={28} color="#000" />
              <Text style={styles.playButtonText}>Play</Text>
            </TVTouchable>

            <TVTouchable
              onPress={() => handlePress(heroItem)}
              style={({ pressed }: any) => [
                styles.detailsButton,
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <MaterialIcons name="info-outline" size={24} color="#FFF" />
              <Text style={styles.detailsButtonText}>Details</Text>
            </TVTouchable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0A0A0A' : '#F5F5F5' }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={false}
      >
        {renderHero()}
        {categories.map((category, index) => (
          <View key={index.toString()} style={styles.rowContainer}>
            <Text style={[styles.rowTitle, { color: isDark ? '#FFF' : '#000' }]}>{category.title}</Text>
            <FlatList
              horizontal
              data={category.items}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => <MediaCard item={item} onPress={handlePress} onFocusChange={handleFocusChange} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rowContent}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={false}
            />
          </View>
        ))}
      </ScrollView>

      {/* Transparent Netflix-style Header */}
      <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.4)', 'transparent']}
        style={[styles.transparentHeader, { paddingTop: Math.max(insets.top, 15) }]}
        pointerEvents="box-none"
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {!isTV && (
              <TVTouchable onPress={openDrawer} style={styles.headerIconBtn}>
                <MaterialIcons name="menu" size={28} color="#FFF" />
              </TVTouchable>
            )}
          </View>

          <TVTouchable onPress={() => router.push('/search')} style={styles.headerIconBtn}>
            <MaterialIcons name="search" size={28} color="#FFF" />
          </TVTouchable>
        </View>
      </LinearGradient>

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
                onPress={() => { setShowExitModal(false); clearTokenCache(); BackHandler.exitApp(); }}
              >
                <Text style={styles.exitBtnConfirmText}>Exit</Text>
              </TVTouchable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100, // padding for bottom tab bar
  },
  heroContainer: {
    width: '100%',
    height: isTV ? height * 0.7 : height * 0.65,
    position: 'relative',
    marginBottom: -20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    padding: 20,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontFamily: 'Inter_Bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  heroButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  playButton: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  playButtonText: {
    color: '#000',
    fontFamily: 'Inter_Bold',
    fontSize: 18,
    marginLeft: 5,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: '#FFF',
    fontFamily: 'Inter_Bold',
    fontSize: 18,
    marginLeft: 8,
  },
  rowContainer: {
    marginBottom: 25,
  },
  rowTitle: {
    fontSize: 20,
    fontFamily: 'Inter_Bold',
    marginLeft: 20,
    marginBottom: 10,
  },
  rowContent: {
    paddingHorizontal: 15,
  },
  cardWrapper: {
    marginHorizontal: 5,
    borderRadius: 12,
  },
  cardContainer: {
    width: 120,
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Inter_Bold',
  },
  transparentHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    zIndex: 50,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 5,
    marginRight: 10,
  },
  headerLogoText: {
    color: '#E50914',
    fontSize: 22,
    fontFamily: 'Inter_Bold',
    letterSpacing: 1,
    marginLeft: 5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  premiumModalContent: {
    backgroundColor: '#1E1E2A',
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  premiumModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Inter_Bold',
    marginBottom: 10,
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
  }
});
