import { forwardRef, useState, useEffect, useRef, useImperativeHandle } from 'react';
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
    const [isFocusedWeb, setIsFocusedWeb] = useState(false);
    
    // Create an internal ref to handle auto-focus
    const internalRef = useRef<any>(null);
    
    // Merge external ref with internal ref
    useImperativeHandle(ref, () => internalRef.current, []);

    // Polyfill for generic TV boxes: force focus on mount if requested
    useEffect(() => {
      if (hasTVPreferredFocus) {
        const timer = setTimeout(() => {
          internalRef.current?.focus?.();
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [hasTVPreferredFocus]);

    return (
      <PressableComponent
        // @ts-ignore
        tabIndex={0}
        ref={internalRef}
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
        onFocus={(e: any) => {
          setIsFocusedWeb(true);
          if (props.onFocus) props.onFocus(e);
        }}
        onBlur={(e: any) => {
          setIsFocusedWeb(false);
          if (props.onBlur) props.onBlur(e);
        }}
        style={(state: any) => {
          const baseStyle =
            typeof style === 'function' ? style(state) : style;

          // state.focused works on Android TV, isFocusedWeb works on Web browser via Tab key
          const focused = (state.focused || isFocusedWeb) && isTV;

          return [
            // Prevent ugly default browser blue outline on Web
            { outlineStyle: 'none' },
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