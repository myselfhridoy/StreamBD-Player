import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, TextInput, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/Text';
import { useRouter, Stack } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Colors from '@/constants/Colors';

import { isTV, TVTouchable } from '../components/tv';

const { width } = Dimensions.get('window');
const TMDB_API_KEY = '460327acf6e0235a391222cb530de9c8';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const NUM_COLUMNS = isTV ? 7 : 3;
const CARD_MARGIN = isTV ? 10 : 6;
// Adjust the total width considering TV sidebar (if any) or standard TV margins
const CARD_WIDTH = isTV 
  ? (width - 150 - CARD_MARGIN * (NUM_COLUMNS * 2)) / NUM_COLUMNS
  : (width - 32 - CARD_MARGIN * (NUM_COLUMNS * 2)) / NUM_COLUMNS;

interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv' | 'person';
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback((text: string) => {
    setQuery(text);
    clearTimeout(debounceTimer.current);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const res = await fetch(
          `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(text.trim())}&include_adult=false`
        );
        const data = await res.json();
        // Filter out "person" results – only keep movies & tv
        const filtered = (data.results || []).filter(
          (r: SearchResult) => r.media_type !== 'person' && r.poster_path
        );
        setResults(filtered);
      } catch (e) {
        console.error('[SearchScreen] Error:', e);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handlePress = (item: SearchResult) => {
    router.push({
      pathname: '/details/[id]',
      params: {
        id: item.id,
        type: item.media_type || 'movie',
      },
    });
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <TVTouchable
      onPress={() => handlePress(item)}
      style={styles.cardWrapper}
      focusedStyle={{
        borderWidth: 2,
        borderColor: Colors.light.tint,
        transform: [{ scale: 1.05 }],
      }}
    >
      <View style={styles.cardInner}>
        <Image
          source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title || item.name}
          </Text>
          <View style={styles.cardMeta}>
            <MaterialIcons name="star" size={11} color="#F59E0B" />
            <Text style={styles.cardRating}>{item.vote_average?.toFixed(1)}</Text>
            <Text style={styles.cardYear}>
              {(item.release_date || item.first_air_date || '').substring(0, 4)}
            </Text>
          </View>
        </View>
      </View>
    </TVTouchable>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Search Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TVTouchable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TVTouchable>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={22} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies & series..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={search}
            autoFocus={!isTV}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TVTouchable onPress={() => { setQuery(''); setResults([]); setSearched(false); }} style={{ padding: 5 }}>
              <MaterialIcons name="close" size={20} color="#888" />
            </TVTouchable>
          )}
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : results.length === 0 && searched ? (
        <View style={styles.centered}>
          <MaterialIcons name="search-off" size={64} color="#444" />
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons name="local-movies" size={64} color="#333" />
          <Text style={styles.emptyText}>Search for any movie or series</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.media_type}-${item.id}`}
          renderItem={renderItem}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#0F0F18',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter',
    paddingVertical: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  grid: {
    padding: 16,
    paddingBottom: 40,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN,
    marginBottom: 16,
    borderRadius: 10,
  },
  cardInner: {
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#1A1A2E',
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  cardInfo: {
    padding: 8,
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Inter_Bold',
    lineHeight: 16,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  cardRating: {
    color: '#F59E0B',
    fontSize: 11,
    fontFamily: 'Inter_Bold',
  },
  cardYear: {
    color: '#888',
    fontSize: 11,
    marginLeft: 4,
  },
});
