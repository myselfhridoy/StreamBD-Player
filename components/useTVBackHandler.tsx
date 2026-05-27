import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * TV Remote Back Button handler
 * BackHandler is sufficient for both TV Boxes and standard Android
 */
export function useTVBackHandler(
  onBack: () => boolean,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    // Standard Android back button (works on most devices and TV remotes)
    const backSub = BackHandler.addEventListener(
      'hardwareBackPress',
      onBack
    );

    return () => {
      backSub.remove();
    };
  }, [enabled, onBack]);
}
