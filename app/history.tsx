import Text from '../components/Text';
import { TVTouchable, TVFlatList } from '../components/tv';

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface HistoryItem {
  url: string;
  name?: string;
  logo?: string;
  group?: string;
  cookie?: string;
  referer?: string;
  origin?: string;
  userAgent?: string;
  drmUrl?: string;
  drmScheme?: string;
  streamFormat?: string;
  tokenUrl?: string;
  tokenMatch?: string;
  tokenReplace?: string;
  tokenId?: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const data = await AsyncStorage.getItem('streamHistory');
      if (data) {
        setHistory(JSON.parse(data));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const deleteItem = async (url: string) => {
    Alert.alert(
      'Delete',
      'Remove this item from history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const newHistory = history.filter(item => item.url !== url);
              setHistory(newHistory);
              await AsyncStorage.setItem('streamHistory', JSON.stringify(newHistory));
            } catch (e) {
              console.error('Failed to delete history item', e);
            }
          }
        }
      ]
    );
  };

  const playItem = (item: HistoryItem) => {
    router.push({
      pathname: '/player',
      params: { 
        mediaUrl: item.url, 
        cookie: item.cookie || '',
        referer: item.referer || '',
        origin: item.origin || '',
        userAgent: item.userAgent || 'Default',
        drmUrl: item.drmUrl || '',
        drmScheme: item.drmScheme || 'clearkey',
        streamFormat: item.streamFormat || 'auto',
        channelName: item.name,
        channelLogo: item.logo,
        channelGroup: item.group,
        tokenUrl: item.tokenUrl || '',
        tokenMatch: item.tokenMatch || '',
        tokenReplace: item.tokenReplace || '',
        tokenId: item.tokenId || '',
        fromHome: 'false'
      }
    });
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <View style={styles.historyCard}>
      <TVTouchable style={styles.historyUrlBtn} onPress={() => playItem(item)}>
        <Text style={styles.historyText} numberOfLines={2} ellipsizeMode="tail">
          {item.url}
        </Text>
      </TVTouchable>
      <TVTouchable style={styles.deleteBtn} onPress={() => deleteItem(item.url)}>
        <MaterialIcons name="delete" size={24} color="#ccc" />
      </TVTouchable>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TVTouchable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TVTouchable>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      <TVFlatList
        data={history}
        keyExtractor={(item) => item.url}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No playback history found.</Text>
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
  backBtn: {
    padding: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_Bold',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 40,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    marginBottom: 15,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  historyUrlBtn: {
    flex: 1,
    marginRight: 10,
  },
  historyText: {
    color: '#8a8aa3',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_Medium',
  },
  deleteBtn: {
    padding: 5,
  },
  emptyText: {
    color: '#8a8aa3',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    fontFamily: 'Inter_Medium',
  },
});
