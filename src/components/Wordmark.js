import React from 'react';
import { Text } from 'react-native';
import { colors } from '../theme';

/**
 * Canonical Findally wordmark: "find" + "ally", with "ally" in brand blue
 * (matches the marketing site and finder pages).
 */
export default function Wordmark({ size = 32, color = colors.ink, accent = colors.primary, style }) {
  return (
    <Text
      style={[{ fontSize: size, fontWeight: '900', letterSpacing: -0.5, color }, style]}
      accessibilityRole="header"
      accessibilityLabel="Findally"
    >
      find<Text style={{ color: accent }}>ally</Text>
    </Text>
  );
}
