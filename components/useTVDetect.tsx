import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Android TV OS — Platform.isTV = true (Mi Box S, Nvidia Shield, built-in TV)
// Generic TV Box (H96, X96...) — Platform.isTV = false, regular Android
// Tablet false positive এড়াতে width >= 1280 (ছোট tablet বাদ পড়বে)
export const isTV: boolean =
  Platform.isTV ||
  (Platform.OS === 'android' &&
    width >= 1280 &&       // 960 → 1280: tablet false positive কমায়
    !(Platform as any).isPad);      // iPad/Android tablet বাদ

export const isTVBox: boolean =
  !Platform.isTV &&
  Platform.OS === 'android' &&
  width >= 1280 &&
  !(Platform as any).isPad;

export const isAndroidTV: boolean = Platform.isTV === true;

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
