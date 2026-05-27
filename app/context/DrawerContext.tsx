import React, { createContext, useContext, useState, useEffect } from 'react';
import SideDrawer from '../../components/SideDrawer';

interface DrawerContextType {
  openDrawer: () => void;
  closeDrawer: () => void;
  isDrawerOpen: boolean;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let tvEventHandler: any;
    try {
      const { default: TVEventHandler } = require('react-native/Libraries/Components/AppleTV/TVEventHandler');
      tvEventHandler = new TVEventHandler();
      tvEventHandler.enable(null, (cmp: any, evt: any) => {
        if (evt && (evt.eventType === 'menu' || evt.eventKeyCode === 82)) {
          setIsOpen(prev => !prev);
        }
      });
    } catch (e) {
      // TVEventHandler might not be available
    }
    return () => {
      if (tvEventHandler) {
        try { tvEventHandler.disable(); } catch (e) {}
      }
    };
  }, []);

  return (
    <DrawerContext.Provider value={{
      openDrawer: () => setIsOpen(true),
      closeDrawer: () => setIsOpen(false),
      isDrawerOpen: isOpen,
    }}>
      {children}
      <SideDrawer visible={isOpen} onClose={() => setIsOpen(false)} />
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
