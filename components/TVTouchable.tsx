import React, { forwardRef } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, Platform } from 'react-native';

interface TVTouchableProps extends Omit<PressableProps, 'style'> {
  style?: PressableProps['style'];
  focusedStyle?: StyleProp<ViewStyle>;
  hasTVPreferredFocus?: boolean;
  activeOpacity?: number;
  underlayColor?: string;
}

export const TVTouchable = forwardRef<any, TVTouchableProps>(({ style, focusedStyle, hasTVPreferredFocus, children, ...props }, ref) => {
  return (
    <Pressable
      ref={ref}
      hasTVPreferredFocus={hasTVPreferredFocus}
      focusable={true}
      {...props}
      style={(state: any) => [
        typeof style === 'function' ? style(state) : style,
        state.focused && (focusedStyle || { 
          borderWidth: 2, 
          borderColor: '#E50914', 
          transform: [{ scale: 1.05 }],
          backgroundColor: 'rgba(229, 9, 20, 0.1)' 
        }),
        state.pressed && { opacity: 0.7 }
      ]}
    >
      {children}
    </Pressable>
  );
});
