import React, { useEffect, useState } from 'react';
import { TVTouchable } from '../../components/TVTouchable';

import { View, StyleSheet, ScrollView, Image, ActivityIndicator, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../../components/Text';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Colors from '@/constants/Colors';
import { AddonManager } from '../../utils/addonManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height } = Dimensions.get('window');
const TMDB_API_KEY = '460327acf6e0235a391222cb530de9c8';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const HERO_IMAGE_URL = 'https://image.tmdb.org/t/p/original';

export default function DetailsScreen() {
  const { id, type } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  // TV Series State
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  useEffect(() => {
    fetchDetails();
    checkFavorite();
    AddonManager.getAddons(true).catch(console.error);
  }, [id]);

  const fetchDetails = async () => {
    try {
      const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`);
      const json = await res.json();
      setData(json);

      // If TV, populate seasons
      if (type === 'tv' && json.seasons) {
        const validSeasons = json.seasons.filter((s: any) => s.season_number > 0);
        setSeasons(validSeasons);
        if (validSeasons.length > 0) {
          fetchEpisodes(validSeasons[0].season_number);
        }
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchEpisodes = async (seasonNum: number) => {
    setLoadingEpisodes(true);
    setSelectedSeason(seasonNum);
    try {
      const res = await fetch(`${BASE_URL}/tv/${id}/season/${seasonNum}?api_key=${TMDB_API_KEY}`);
      const json = await res.json();
      setEpisodes(json.episodes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const checkFavorite = async () => {
    try {
      const data = await AsyncStorage.getItem('favorite_channels');
      if (data) {
        const favs = JSON.parse(data);
        setIsFavorite(favs.some((f: any) => f.vodId === Number(id)));
      }
    } catch (e) {}
  };

  const toggleFavorite = async () => {
    try {
      const stored = await AsyncStorage.getItem('favorite_channels');
      let favs = stored ? JSON.parse(stored) : [];
      
      if (isFavorite) {
        favs = favs.filter((f: any) => f.vodId !== Number(id));
      } else {
        favs.push({
          name: data.title || data.name,
          url: `vod://${type}/${id}`,
          logo: data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : '',
          group: 'VOD',
          vodId: Number(id),
          vodType: type as string,
          isVod: true,
        });
      }
      await AsyncStorage.setItem('favorite_channels', JSON.stringify(favs));
      setIsFavorite(!isFavorite);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlay = (season?: number, episode?: number) => {
    router.push({
      pathname: '/sources',
      params: {
        id: id as string,
        type: type as string,
        title: data.title || data.name,
        ...(season !== undefined && { season: season.toString() }),
        ...(episode !== undefined && { episode: episode.toString() }),
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  if (!data) return null;

  const director = data.credits?.crew?.find((c: any) => c.job === 'Director');
  const cast = data.credits?.cast?.slice(0, 5) || [];
  const isTv = type === 'tv';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Backdrop */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: `${HERO_IMAGE_URL}${data.backdrop_path || data.poster_path}` }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', '#0A0A0A']}
            style={styles.heroGradient}
          />
          
          <TVTouchable 
            style={[styles.backButton, { top: Math.max(insets.top + 10, 30) }]}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={28} color="#FFF" />
          </TVTouchable>

          {/* Favorite button */}
          <TVTouchable 
            style={[styles.favButton, { top: Math.max(insets.top + 10, 30) }]}
            onPress={toggleFavorite}
          >
            <MaterialIcons name={isFavorite ? "favorite" : "favorite-border"} size={26} color={isFavorite ? "#E50914" : "#FFF"} />
          </TVTouchable>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{data.title || data.name}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <MaterialIcons name="star" size={16} color="#F59E0B" />
              <Text style={styles.metaText}>{data.vote_average?.toFixed(1)}</Text>
            </View>
            <Text style={styles.metaText}>{data.release_date ? data.release_date.substring(0, 4) : data.first_air_date?.substring(0, 4)}</Text>
            <Text style={styles.metaText}>{data.runtime ? `${data.runtime} min` : (data.number_of_seasons ? `${data.number_of_seasons} Seasons` : '')}</Text>
          </View>

          <View style={styles.genresRow}>
            {data.genres?.map((g: any) => (
              <View key={g.id} style={styles.genreTag}>
                <Text style={styles.genreText}>{g.name}</Text>
              </View>
            ))}
          </View>

          {/* Play Button (Movie only) */}
          {!isTv && (
            <TVTouchable
              hasTVPreferredFocus={true}
              onPress={() => handlePlay()}
              style={styles.playButton}
            >
              <MaterialIcons name="play-arrow" size={28} color="#000" />
              <Text style={styles.playButtonText}>Play</Text>
            </TVTouchable>
          )}

          <Text style={styles.overview}>{data.overview}</Text>

          {director && (
            <Text style={styles.crewText}>
              <Text style={{ fontFamily: 'Inter_Bold', color: '#FFF' }}>Director: </Text>
              {director.name}
            </Text>
          )}

          {/* Cast */}
          {cast.length > 0 && (
            <View style={styles.castSection}>
              <Text style={styles.sectionTitle}>Cast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {cast.map((actor: any) => (
                  <View key={actor.id} style={styles.actorCard}>
                    {actor.profile_path ? (
                      <Image source={{ uri: `${IMAGE_BASE_URL}${actor.profile_path}` }} style={styles.actorImage} />
                    ) : (
                      <View style={[styles.actorImage, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                        <MaterialIcons name="person" size={30} color="#666" />
                      </View>
                    )}
                    <Text style={styles.actorName} numberOfLines={2}>{actor.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* TV Series: Seasons & Episodes */}
          {isTv && seasons.length > 0 && (
            <View style={styles.seasonsSection}>
              <Text style={styles.sectionTitle}>Seasons</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {seasons.map((s: any) => (
                  <TVTouchable
                    key={s.season_number}
                    hasTVPreferredFocus={selectedSeason === s.season_number}
                    style={[styles.seasonChip, selectedSeason === s.season_number && styles.seasonChipActive]}
                    onPress={() => fetchEpisodes(s.season_number)}
                  >
                    <Text style={[styles.seasonChipText, selectedSeason === s.season_number && styles.seasonChipTextActive]}>
                      Season {s.season_number}
                    </Text>
                  </TVTouchable>
                ))}
              </ScrollView>

              {loadingEpisodes ? (
                <ActivityIndicator color={Colors.light.tint} style={{ marginVertical: 20 }} />
              ) : (
                episodes.map((ep: any) => (
                  <TVTouchable
                    key={ep.episode_number}
                    style={styles.episodeCard}
                    onPress={() => handlePlay(selectedSeason, ep.episode_number)}
                  >
                    <View style={styles.episodeLeft}>
                      {ep.still_path ? (
                        <Image source={{ uri: `${IMAGE_BASE_URL}${ep.still_path}` }} style={styles.episodeThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.episodeThumb, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
                          <MaterialIcons name="movie" size={24} color="#555" />
                        </View>
                      )}
                    </View>
                    <View style={styles.episodeRight}>
                      <Text style={styles.episodeTitle} numberOfLines={1}>
                        E{ep.episode_number}. {ep.name}
                      </Text>
                      <Text style={styles.episodeOverview} numberOfLines={2}>
                        {ep.overview || 'No description available.'}
                      </Text>
                    </View>
                    <MaterialIcons name="play-circle-outline" size={28} color={Colors.light.tint} />
                  </TVTouchable>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  loadingContainer: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  heroContainer: { width: '100%', height: height * 0.5, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  backButton: {
    position: 'absolute', left: 20, width: 45, height: 45, borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  favButton: {
    position: 'absolute', right: 20, width: 45, height: 45, borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  contentContainer: { padding: 20, marginTop: -40 },
  title: { fontSize: 32, fontFamily: 'Inter_Bold', color: '#FFF', marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 15 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#CCC', fontSize: 16, fontFamily: 'Inter_Medium' },
  genresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  genreTag: {
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  genreText: { color: '#FFF', fontSize: 12 },
  playButton: {
    backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 10, marginBottom: 25,
  },
  playButtonText: { color: '#000', fontFamily: 'Inter_Bold', fontSize: 20, marginLeft: 8 },
  overview: { color: '#CCC', fontSize: 15, lineHeight: 24, marginBottom: 20 },
  crewText: { color: '#AAA', fontSize: 15, marginBottom: 25 },
  sectionTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Inter_Bold', marginBottom: 15 },
  castSection: { marginTop: 10 },
  actorCard: { width: 90, marginRight: 15, alignItems: 'center' },
  actorImage: { width: 70, height: 70, borderRadius: 35, marginBottom: 8 },
  actorName: { color: '#CCC', fontSize: 12, textAlign: 'center' },
  // Seasons & Episodes
  seasonsSection: { marginTop: 30 },
  seasonChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  seasonChipActive: { backgroundColor: 'rgba(79,70,229,0.3)', borderColor: '#4F46E5' },
  seasonChipText: { color: '#AAA', fontSize: 14, fontFamily: 'Inter_SemiBold' },
  seasonChipTextActive: { color: '#FFF' },
  episodeCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E',
    borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  episodeLeft: { marginRight: 12 },
  episodeThumb: { width: 110, height: 65, borderRadius: 8 },
  episodeRight: { flex: 1, marginRight: 8 },
  episodeTitle: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_Bold', marginBottom: 4 },
  episodeOverview: { color: '#888', fontSize: 12, lineHeight: 18 },
});
