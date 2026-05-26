import Text from '../../components/Text';
import { TVTouchable } from '../../components/TVTouchable';

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from 'expo-router';
import SideDrawer from '../../components/SideDrawer';

const DATA_URL = 'https://streambd-iptv.netlify.app/playlists/IPTV.json';

interface CategoryItem {
  id: string;
  name: string;
  url: string;
  logo: string;
}

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useFocusEffect(
    React.useCallback(() => {
      if (categories.length === 0) {
        fetchData();
      }
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(DATA_URL);
      const json = await res.json();
      
      const parsedData: CategoryItem[] = [];
      if (json && json.length > 0 && json[0].playlists) {
        const playlistsObj = json[0].playlists;
        Object.keys(playlistsObj).forEach(key => {
          parsedData.push({
            id: key,
            name: key,
            url: playlistsObj[key].url,
            logo: playlistsObj[key].logo
          });
        });
      }
      setCategories(parsedData);
    } catch (e) {
      console.error(e);
      setError('Failed to load categories. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handlePress = (item: CategoryItem) => {
    // Navigate to channel browser, passing the online URL
    router.push({
      pathname: '/channel-browser',
      params: { 
        playlistUrl: item.url, 
        playlistName: item.name,
        isLocal: 'false',
        isLiveEvent: 'true' // All categories are considered Live Events as requested
      }
    });
  };

  const renderItem = ({ item }: { item: CategoryItem }) => (
    <TVTouchable 
      style={styles.card} 
      onPress={() => handlePress(item)}
      underlayColor="#3a3a4c"
      activeOpacity={0.9}
    >
      <View style={styles.cardInner}>
        <View style={styles.logoContainer}>
          <Image source={{ uri: item.logo }} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.cardText} numberOfLines={2}>{item.name}</Text>
      </View>
    </TVTouchable>
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      <SideDrawer visible={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      
      <View style={styles.header}>
        <TVTouchable style={styles.headerIconBtn} onPress={() => setIsDrawerOpen(true)}>
          <MaterialIcons name="menu" size={28} color="#fff" />
        </TVTouchable>
        
        {!isSearchActive ? (
          <Text style={styles.headerTitle}>Categories</Text>
        ) : (
          <View style={styles.searchContainer}>
            <Text style={{display:'none'}}></Text> 
            {/* Using a regular React Native TextInput for search */}
            <React.Fragment>
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories..."
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </React.Fragment>
          </View>
        )}
        
        <TVTouchable 
          style={styles.headerIconBtn} 
          onPress={() => {
            if (isSearchActive) setSearchQuery('');
            setIsSearchActive(!isSearchActive);
          }}
        >
          <MaterialIcons name={isSearchActive ? "close" : "search"} size={26} color="#fff" />
        </TVTouchable>
        
        <TVTouchable style={styles.headerIconBtn} onPress={() => router.push('/favorites')}>
          <MaterialIcons name="star" size={26} color="#fff" />
        </TVTouchable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TVTouchable style={styles.retryBtn} onPress={fetchData}>
            <Text style={styles.retryText}>Retry</Text>
          </TVTouchable>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_Bold',
    marginLeft: 15,
  },
  headerIconBtn: {
    padding: 8,
    borderRadius: 20,
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
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  card: {
    flex: 1,
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    margin: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  cardText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_SemiBold',
    marginLeft: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff4b4b',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontFamily: 'Inter_Bold',
  }
});
