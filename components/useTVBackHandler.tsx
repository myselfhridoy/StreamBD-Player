import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { isTV } from './useTVDetect';

/**
 * TV Remote Back Button handler
 * TV Box-এ hardwareBackPress সব সময় fire করে আগে
 * তাই TVEventHandler দিয়েও handle করা হয়েছে
 */
export function useTVBackHandler(
  onBack: () => boolean,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    // Standard Android back button (works on most devices)
    const backSub = BackHandler.addEventListener(
      'hardwareBackPress',
      onBack
    );

    // TV-specific: some TV Boxes send ESC or media_back
    // TVEventHandler is only available when Platform.isTV is true
    // For TV Boxes (where Platform.isTV = false), BackHandler is enough
    let tvSub: any = null;
    try {
      // Dynamic import to avoid crash on non-TV builds
      const { default: TVEventHandler } = require('react-native/Libraries/Components/AppleTV/TVEventHandler');
      const handler = new TVEventHandler();
      handler.enable(null, (_: any, event: any) => {
        if (
          event?.eventType === 'back' ||
          event?.eventKeyCode === 27 // ESC key
        ) {
          onBack();
        }
      });
      tvSub = handler;
    } catch (_) {
      // TVEventHandler not available — BackHandler is enough
    }

    return () => {
      backSub.remove();
      if (tvSub) {
        try { tvSub.disable(); } catch (_) {}
      }
    };
  }, [enabled, onBack]);
}
