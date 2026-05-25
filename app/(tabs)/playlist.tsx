import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';

export interface Playlist {
  id: string;
  name: string;
  url: string;
  isLocal: boolean;
}

export default function PlaylistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  // UI States
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  // Form States
  const [playlistName, setPlaylistName] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const data = await AsyncStorage.getItem('playlists');
      if (data) {
        setPlaylists(JSON.parse(data));
      }
    } catch (e) {
      console.error('Failed to load playlists', e);
    }
  };

  const savePlaylists = async (newList: Playlist[]) => {
    try {
      await AsyncStorage.setItem('playlists', JSON.stringify(newList));
      setPlaylists(newList);
    } catch (e) {
      console.error('Failed to save playlists', e);
    }
  };

  const handleAddUrl = () => {
    setShowDropdown(false);
    setEditingPlaylist(null);
    setPlaylistName('');
    setPlaylistUrl('');
    setShowAddModal(true);
  };

  const handleSelectFile = async () => {
    setShowDropdown(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Can restrict to specific extensions if needed, but M3U varies
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const newPlaylist: Playlist = {
          id: Date.now().toString(),
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          url: file.uri,
          isLocal: true,
        };
        savePlaylists([...playlists, newPlaylist]);
      }
    } catch (error) {
      console.error('Error selecting file', error);
    }
  };

  const handleCreateOrUpdate = () => {
    if (!playlistName.trim() || !playlistUrl.trim()) return;

    if (editingPlaylist) {
      const updatedList = playlists.map(p => {
        if (p.id === editingPlaylist.id) {
          return { ...p, name: playlistName, url: playlistUrl };
        }
        return p;
      });
      savePlaylists(updatedList);
    } else {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name: playlistName,
        url: playlistUrl,
        isLocal: false,
      };
      savePlaylists([...playlists, newPlaylist]);
    }
    
    setShowAddModal(false);
  };

  const handleEdit = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setPlaylistName(playlist.name);
    setPlaylistUrl(playlist.url);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    const updatedList = playlists.filter(p => p.id !== id);
    savePlaylists(updatedList);
  };

  const openChannelBrowser = (playlist: Playlist) => {
    // Navigate to channel browser in Phase 2
    // router.push({ pathname: '/channel-browser', params: { playlistUrl: playlist.url, playlistName: playlist.name, isLocal: playlist.isLocal ? 'true' : 'false' } });
    console.log("Opening channel browser for:", playlist);
  };

  const renderItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity 
      style={styles.playlistItem}
      onPress={() => openChannelBrowser(item)}
      onLongPress={() => handleDelete(item.id)}
    >
      <View style={styles.playlistItemContent}>
        <Text style={styles.playlistItemName}>{item.name}</Text>
        <Text style={styles.playlistItemUrl} numberOfLines={1} ellipsizeMode="tail">
          {item.isLocal ? "Local File" : item.url}
        </Text>
      </View>
      <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
        <MaterialIcons name="edit" size={22} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Playlist</Text>
        <TouchableOpacity style={styles.menuIconBtn} onPress={() => setShowDropdown(true)}>
          <MaterialIcons name="more-vert" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {playlists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please use M3U playlist with TV channels</Text>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Dropdown Menu Modal */}
      <Modal visible={showDropdown} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownOverlay} onPress={() => setShowDropdown(false)} activeOpacity={1}>
          <View style={[styles.dropdownMenu, { top: Math.max(insets.top, 20) + 50 }]}>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleAddUrl}>
              <Text style={styles.dropdownItemText}>Add URL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleSelectFile}>
              <Text style={styles.dropdownItemText}>Select File</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Playlist details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter playlist name</Text>
              <TextInput
                style={styles.input}
                value={playlistName}
                onChangeText={setPlaylistName}
                placeholder="My Playlist"
                placeholderTextColor="#666"
              />
            </View>

            <View style={[styles.inputContainer, { marginTop: 15 }]}>
              <Text style={styles.inputLabel}>Enter playlist url</Text>
              <TextInput
                style={styles.input}
                value={playlistUrl}
                onChangeText={setPlaylistUrl}
                placeholder="http://example.com/playlist.m3u"
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalActionBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalActionText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalActionBtn} onPress={handleCreateOrUpdate}>
                <Text style={styles.modalActionText}>{editingPlaylist ? "UPDATE" : "CREATE"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '500',
  },
  menuIconBtn: {
    padding: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#E0E0E0',
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  playlistItem: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playlistItemContent: {
    flex: 1,
    paddingRight: 10,
  },
  playlistItemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  playlistItemUrl: {
    color: '#999',
    fontSize: 12,
  },
  editBtn: {
    padding: 8,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    right: 15,
    backgroundColor: '#252525',
    borderRadius: 6,
    width: 150,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#303030',
    width: '85%',
    borderRadius: 8,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputContainer: {
    position: 'relative',
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 4,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  inputLabel: {
    position: 'absolute',
    top: -10,
    left: 10,
    backgroundColor: '#303030',
    paddingHorizontal: 5,
    color: '#999',
    fontSize: 12,
  },
  input: {
    color: '#fff',
    fontSize: 16,
    padding: 0,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 25,
  },
  modalActionBtn: {
    marginLeft: 30,
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  modalActionText: {
    color: '#4FA5D6',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
