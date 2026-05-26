import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/Text';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Colors from '@/constants/Colors';
import { AddonManager, StreamSource } from '../utils/addonManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function SourcesScreen() {
  const { id, type, title, season, episode } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [sources, setSources] = useState<StreamSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const resolved = await AddonManager.resolveFromAddons(
        type as 'movie' | 'tv',
        Number(id),
        season ? Number(season) : undefined,
        episode ? Number(episode) : undefined
      );

      if (resolved.length === 0) {
        setError('No streams found. Make sure you have addons enabled.');
      } else {
        setSources(resolved);
      }
    } catch (e) {
      console.error('[SourcesScreen] Error resolving sources:', e);
      setError('Failed to resolve streams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const playSource = async (sourceIndex: number) => {
    // Save all sources to AsyncStorage so the player can switch between them
    await AsyncStorage.setItem('@current_vod_sources', JSON.stringify(sources));

    const selectedSource = sources[sourceIndex];

    router.push({
      pathname: '/player',
      params: {
        mediaUrl: selectedSource.url,
        channelName: (title as string) || 'VOD',
        isVod: 'true',
        vodSourceIndex: sourceIndex.toString(),
        referer: selectedSource.headers?.['Referer'] || selectedSource.headers?.['referer'] || '',
        origin: selectedSource.headers?.['Origin'] || selectedSource.headers?.['origin'] || '',
        userAgent: selectedSource.headers?.['User-Agent'] || selectedSource.headers?.['user-agent'] || 'Default',
        cookie: selectedSource.headers?.['Cookie'] || selectedSource.headers?.['cookie'] || '',
      },
    });
  };

  const renderSource = ({ item, index }: { item: StreamSource; index: number }) => (
    <Pressable
      style={({ pressed }) => [
        styles.sourceCard,
        pressed && { backgroundColor: '#2A2A3A' },
      ]}
      onPress={() => playSource(index)}
    >
      <View style={styles.sourceLeft}>
        <View style={styles.qualityBadge}>
          <Text style={styles.qualityText}>{item.quality || 'Unknown'}</Text>
        </View>
        <View style={styles.sourceInfo}>
          <Text style={styles.providerText}>{item.provider || 'Unknown Provider'}</Text>
          <Text style={styles.typeText}>
            {item.type?.toUpperCase() || 'STREAM'}
            {item.subtitles && item.subtitles.length > 0 ? ` • ${item.subtitles.length} sub(s)` : ''}
          </Text>
        </View>
      </View>
      <MaterialIcons name="play-circle-outline" size={32} color={Colors.light.tint} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={26} color="#FFF" />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {(title as string) || 'Select Source'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Searching for streams...' : `${sources.length} source(s) found`}
          </Text>
        </View>
        {!loading && (
          <Pressable onPress={fetchSources} style={styles.refreshBtn}>
            <MaterialIcons name="refresh" size={24} color="#FFF" />
          </Pressable>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Fetching streams from addons...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={64} color="#E50914" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchSources}>
            <MaterialIcons name="refresh" size={20} color="#FFF" />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sources}
          keyExtractor={(item, index) => `${item.provider}-${item.quality}-${index}`}
          renderItem={renderSource}
          contentContainerStyle={styles.listContent}
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0F0F18',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Inter_Bold',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    color: '#888',
    fontSize: 15,
    marginTop: 20,
  },
  errorText: {
    color: '#CCC',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  retryText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_Bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  qualityBadge: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 14,
    minWidth: 60,
    alignItems: 'center',
  },
  qualityText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: 'Inter_Bold',
  },
  sourceInfo: {
    flex: 1,
  },
  providerText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter_Bold',
  },
  typeText: {
    color: '#888',
    fontSize: 12,
    marginTop: 3,
  },
});
