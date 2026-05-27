import { Dimensions, Platform } from 'react-native';
import * as Device from 'expo-device';

const { width, height } = Dimensions.get('window');
const screenSize = Math.max(width, height);
const aspectRatio = screenSize / Math.min(width, height);

// Android TV OS — Platform.isTV = true (Mi Box S, Nvidia Shield, built-in TV)
// Generic TV Box (H96, X96...) — Platform.isTV = false, regular Android
// Tablet false positive এড়াতে width >= 1280 (ছোট tablet বাদ পড়বে)
export const isTVBox: boolean =
  !Platform.isTV &&
  Platform.OS === 'android' &&
  (Device.deviceType === Device.DeviceType.TV || 
   (screenSize >= 800 && aspectRatio > 1.5) || 
   width >= 1280) &&
  !(Platform as any).isPad;

export const isAndroidTV: boolean = Platform.isTV === true || (Platform.OS === 'android' && Device.deviceType === Device.DeviceType.TV);

// True if it's an official TV or a generic TV box
export const isTV: boolean = isAndroidTV || isTVBox;

// TV-aware column count
export function getTVColumns(defaultColumns?: number): number {
  if (isTV) return 6;
  return defaultColumns ?? Math.floor(width / 100);
}

export function useTVDetect() {
  return {
    isTV,
    isTVBox,
    isAndroidTV,
    numColumns: getTVColumns(),
    screenWidth: width,
    screenHeight: height,
  };
}
