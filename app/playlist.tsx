import Text from '../components/Text';
import { TVTouchable } from '../components/TVTouchable';

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';;
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import * as DocumentPicker from 'expo-document-picker'; // Requires native rebuild!
import { useRouter, Stack } from 'expo-router';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<{ id: string, name: string } | null>(null);
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
    alert('Select File requires a native rebuild to work. We will enable this later!');
    // try {
    //   const result = await DocumentPicker.getDocumentAsync({
    //     type: '*/*', 
    //     copyToCacheDirectory: true,
    //   });

    //   if (result.canceled === false && result.assets && result.assets.length > 0) {
    //     const file = result.assets[0];
    //     const newPlaylist: Playlist = {
    //       id: Date.now().toString(),
    //       name: file.name.replace(/\.[^/.]+$/, ""), 
    //       url: file.uri,
    //       isLocal: true,
    //     };
    //     savePlaylists([...playlists, newPlaylist]);
    //   }
    // } catch (error) {
    //   console.error('Error selecting file', error);
    // }
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

  const handleDelete = (id: string, name: string) => {
    setPlaylistToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (playlistToDelete) {
      const updatedList = playlists.filter(p => p.id !== playlistToDelete.id);
      savePlaylists(updatedList);
    }
    setShowDeleteModal(false);
    setPlaylistToDelete(null);
  };

  const openChannelBrowser = (playlist: Playlist) => {
    router.push({ 
      pathname: '/channel-browser', 
      params: { 
        playlistUrl: playlist.url, 
        playlistName: playlist.name, 
        isLocal: playlist.isLocal ? 'true' : 'false' 
      } 
    });
  };

  const renderItem = ({ item }: { item: Playlist }) => (
    <TVTouchable 
      style={styles.playlistItem}
      onPress={() => openChannelBrowser(item)}
    >
      <View style={styles.playlistItemContent}>
        <Text style={styles.playlistItemName}>{item.name}</Text>
        <Text style={styles.playlistItemUrl} numberOfLines={1} ellipsizeMode="tail">
          {item.isLocal ? "Local File" : item.url}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TVTouchable style={styles.iconButton} onPress={() => handleEdit(item)}>
          <MaterialIcons name="edit" size={22} color="#fff" />
        </TVTouchable>
        <TVTouchable style={styles.iconButton} onPress={() => handleDelete(item.id, item.name)}>
          <MaterialIcons name="delete" size={22} color="#ff4444" />
        </TVTouchable>
      </View>
    </TVTouchable>
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TVTouchable onPress={() => router.back()} style={{ marginRight: 15, padding: 5 }}>
            <MaterialIcons name="arrow-back" size={26} color="#fff" />
          </TVTouchable>
          <Text style={styles.headerTitle}>Playlist</Text>
        </View>
        <TVTouchable style={styles.menuIconBtn} onPress={() => setShowDropdown(true)}>
          <MaterialIcons name="more-vert" size={28} color="#fff" />
        </TVTouchable>
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
      <Modal 
        visible={showDropdown} 
        transparent 
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TVTouchable style={styles.dropdownOverlay} onPress={() => setShowDropdown(false)} activeOpacity={1}>
          <View style={[styles.dropdownMenu, { top: Math.max(insets.top, 20) + 50 }]}>
            <TVTouchable style={styles.dropdownItem} onPress={handleAddUrl}>
              <Text style={styles.dropdownItemText}>Add URL</Text>
            </TVTouchable>
            <TVTouchable style={styles.dropdownItem} onPress={handleSelectFile}>
              <Text style={styles.dropdownItemText}>Select File</Text>
            </TVTouchable>
          </View>
        </TVTouchable>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal 
        visible={showAddModal} 
        transparent 
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
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
              <TVTouchable style={styles.modalActionBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalActionText}>CANCEL</Text>
              </TVTouchable>
              <TVTouchable style={styles.modalActionBtn} onPress={handleCreateOrUpdate}>
                <Text style={styles.modalActionText}>{editingPlaylist ? "UPDATE" : "CREATE"}</Text>
              </TVTouchable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Premium Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.premiumModalOverlay}>
          <View style={[styles.premiumModalContent, { alignItems: 'center', paddingTop: 30 }]}>
            <View style={styles.deleteIconContainer}>
              <MaterialIcons name="delete-outline" size={40} color="#ff4444" />
            </View>
            <Text style={[styles.premiumModalTitle, { fontSize: 22, textAlign: 'center', marginTop: 15 }]}>Delete Playlist</Text>
            <Text style={styles.deleteModalSubtitle}>
              Are you sure you want to delete "{playlistToDelete?.name}"?
            </Text>
            
            <View style={styles.deleteModalActions}>
              <TVTouchable 
                hasTVPreferredFocus={true} 
                style={[styles.deleteBtn, styles.deleteBtnCancel]} 
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.deleteBtnCancelText}>Cancel</Text>
              </TVTouchable>
              <TVTouchable 
                style={[styles.deleteBtn, styles.deleteBtnConfirm]} 
                onPress={confirmDelete}
              >
                <Text style={styles.deleteBtnConfirmText}>Delete</Text>
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
    backgroundColor: '#0d0d14',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_Bold',
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
    paddingBottom: 100,
  },
  playlistItem: {
    flexDirection: 'row',
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  playlistItemContent: {
    flex: 1,
    paddingRight: 10,
  },
  playlistItemName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_SemiBold',
    marginBottom: 4,
  },
  playlistItemUrl: {
    color: '#8a8aa3',
    fontSize: 12,
    fontFamily: 'Inter_Medium',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 5,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    right: 15,
    backgroundColor: '#1a1a24',
    borderRadius: 8,
    width: 150,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    fontFamily: 'Inter_Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a24',
    width: '85%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    elevation: 10,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter_Bold',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputContainer: {
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  inputLabel: {
    position: 'absolute',
    top: -10,
    left: 10,
    backgroundColor: '#1a1a24',
    paddingHorizontal: 4,
    color: '#8a8aa3',
    fontSize: 12,
    fontFamily: 'Inter_Medium',
  },
  input: {
    color: '#fff',
    fontSize: 16,
    padding: 0,
    fontFamily: 'Inter_Medium',
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
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  premiumModalContent: {
    backgroundColor: '#161622',
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 10,
  },
  premiumModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_Bold',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalSubtitle: {
    color: '#8a8aa3',
    fontSize: 15,
    fontFamily: 'Inter_Medium',
    textAlign: 'center',
    marginBottom: 25,
    marginTop: -5,
  },
  deleteModalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 15,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  deleteBtnCancel: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  deleteBtnConfirm: {
    backgroundColor: '#ff4444',
  },
  deleteBtnCancelText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_SemiBold',
  },
  deleteBtnConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_Bold',
  },
});
