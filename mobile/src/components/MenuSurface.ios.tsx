import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  StyleSheet,
  View,
  type ViewProps,
} from "react-native";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";

const glassAvailable = isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

export default function MenuSurface({ children, style, ...props }: ViewProps) {
  // Start with the readable fallback until the accessibility preference is known.
  const [reduceTransparency, setReduceTransparency] = useState(true);
  useEffect(() => {
    if (!glassAvailable) return;
    let current = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      (enabled) => {
        preferenceChanged = true;
        setReduceTransparency(enabled);
      },
    );
    void AccessibilityInfo.isReduceTransparencyEnabled().then(
      (enabled) => {
        if (current && !preferenceChanged) setReduceTransparency(enabled);
      },
      () => {}, // Keep the fallback if the preference cannot be read.
    );
    return () => {
      current = false;
      subscription.remove();
    };
  }, []);

  const useGlass = glassAvailable && !reduceTransparency;
  return (
    <View {...props} style={[style, useGlass && styles.glassSurface]}>
      {useGlass && (
        <GlassView
          pointerEvents="none"
          accessible={false}
          colorScheme="light"
          glassEffectStyle="regular"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: StyleSheet.flatten(style)?.borderRadius },
          ]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glassSurface: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    boxShadow: "none",
  },
});
