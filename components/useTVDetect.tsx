import { Dimensions, Platform } from 'react-native';
import * as Device from 'expo-device';

const { width, height } = Dimensions.get('window');
const screenSize = Math.max(width, height);
const minDim = Math.min(width, height);

const isLikelyTV =
  screenSize >= 1280 &&
  minDim >= 600 &&
  (screenSize / minDim) <= 2.0;

export const isTV: boolean =
  Platform.isTV ||
  Device.deviceType === Device.DeviceType.TV ||
  isLikelyTV;

export const isAndroidTV: boolean =
  Platform.isTV === true ||
  (Platform.OS === 'android' && Device.deviceType === Device.DeviceType.TV);

export const isTVBox: boolean =
  !Platform.isTV &&
  Platform.OS === 'android' &&
  (Device.deviceType === Device.DeviceType.TV || isLikelyTV);

export function getTVColumns(defaultColumns?: number): number {
  if (isTV) return 6;
  const { width: w } = Dimensions.get('window');
  return defaultColumns ?? Math.floor(w / 100);
}
