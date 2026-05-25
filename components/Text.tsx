import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

export default function Text(props: TextProps) {
  // If the font is explicitly bold/medium, we could switch the font family
  // For now we just use the default Inter which supports font-weight if loaded properly,
  // but react-native sometimes needs the specific font family for weights.
  // We'll rely on the default Inter being loaded.
  return (
    <RNText {...props} style={[styles.defaultText, props.style]} />
  );
}

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: 'Inter',
  },
});
