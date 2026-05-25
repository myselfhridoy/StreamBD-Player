import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Settings = {
  autoPiP: boolean;
  skipSilence: boolean;
  landscapeOnly: boolean;
  volumeGesture: boolean;
  brightnessGesture: boolean;
  resumePlay: boolean;
  seekDuration: number;
  preferDecoder: string;
  enableTunneling: boolean;
  dolbyVision: boolean;
};

const defaultSettings: Settings = {
  autoPiP: false,
  skipSilence: false,
  landscapeOnly: false,
  volumeGesture: true,
  brightnessGesture: true,
  resumePlay: false,
  seekDuration: 10,
  preferDecoder: 'Prefer device decoders',
  enableTunneling: false,
  dolbyVision: false,
};

type SettingsContextType = {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSetting: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('appSettings');
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
};
