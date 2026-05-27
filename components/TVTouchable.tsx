import { forwardRef } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { isTV } from './useTVDetect';

interface TVTouchableProps extends Omit<PressableProps, 'style'> {
  style?: PressableProps['style'];
  focusedStyle?: StyleProp<ViewStyle>;
  hasTVPreferredFocus?: boolean;
  activeOpacity?: number;
  // Deprecated props — kept for backward compat, not used
  underlayColor?: string;
  nextFocusUp?: number;
  nextFocusDown?: number;
  nextFocusLeft?: number;
  nextFocusRight?: number;
}

export const TVTouchable = forwardRef<any, TVTouchableProps>(
  (
    {
      style,
      focusedStyle,
      hasTVPreferredFocus,
      activeOpacity = 0.7,
      nextFocusUp,
      nextFocusDown,
      nextFocusLeft,
      nextFocusRight,
      children,
      // Strip underlayColor — not used in Pressable
      underlayColor: _underlayColor,
      ...props
    },
    ref
  ) => {
    const PressableComponent = Pressable as any;

    return (
      <PressableComponent
        ref={ref}
        focusable={true}
        accessible={true}
        // isTVSelectable only on real TV/TV Box
        isTVSelectable={isTV}
        hasTVPreferredFocus={hasTVPreferredFocus}
        // D-Pad navigation — TV Box + Android TV remote
        nextFocusUp={nextFocusUp}
        nextFocusDown={nextFocusDown}
        nextFocusLeft={nextFocusLeft}
        nextFocusRight={nextFocusRight}
        {...props}
        style={(state: any) => {
          const baseStyle =
            typeof style === 'function' ? style(state) : style;

          const focused = state.focused && isTV;

          return [
            baseStyle,
            focused &&
            (focusedStyle ?? {
              borderWidth: 2,
              borderColor: '#E50914',
              transform: [{ scale: 1.05 }],
              backgroundColor: 'rgba(229, 9, 20, 0.1)',
            }),
            state.pressed && { opacity: activeOpacity },
          ];
        }}
      >
        {children}
      </PressableComponent>
    );
  }
);

TVTouchable.displayName = 'TVTouchable';