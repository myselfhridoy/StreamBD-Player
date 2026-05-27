import React, { createContext, useContext, useState, useEffect } from 'react';
import SideDrawer from '../../components/SideDrawer';
import { isTV } from '../../components/tv';

import { BackHandler } from 'react-native';

interface DrawerContextType {
  openDrawer: () => void;
  closeDrawer: () => void;
  isDrawerOpen: boolean;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  // Android TV: Back button দিয়ে drawer close
  useEffect(() => {
    if (!isTV || !isOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [isOpen]);

  return (
    <DrawerContext.Provider value={{
      openDrawer: () => { if (!isTV) setIsOpen(true); },
      closeDrawer: () => setIsOpen(false),
      isDrawerOpen: isOpen,
    }}>
      {children}
      {!isTV && <SideDrawer visible={isOpen} onClose={() => setIsOpen(false)} />}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
}
