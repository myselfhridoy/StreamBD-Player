import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Channel } from '../../utils/m3uParser';

interface PlaylistContextType {
  channels: Channel[];
  currentIndex: number;
  setPlaylist: (channels: Channel[], startIndex: number) => void;
  nextChannel: () => Channel | null;
  prevChannel: () => Channel | null;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export const PlaylistProvider = ({ children }: { children: ReactNode }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const setPlaylist = (newChannels: Channel[], startIndex: number) => {
    setChannels(newChannels);
    setCurrentIndex(startIndex);
  };

  const nextChannel = () => {
    if (channels.length === 0 || currentIndex === -1) return null;
    const nextIdx = (currentIndex + 1) % channels.length;
    setCurrentIndex(nextIdx);
    return channels[nextIdx];
  };

  const prevChannel = () => {
    if (channels.length === 0 || currentIndex === -1) return null;
    const prevIdx = currentIndex === 0 ? channels.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIdx);
    return channels[prevIdx];
  };

  return (
    <PlaylistContext.Provider value={{ channels, currentIndex, setPlaylist, nextChannel, prevChannel }}>
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylist = () => {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
};
