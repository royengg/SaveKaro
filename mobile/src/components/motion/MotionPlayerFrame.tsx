import { useCallback, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  AppState,
  type AppStateStatus,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useFocusEffect } from "expo-router";
import type { GuideMotionId } from "@savekaro/motion/guide-data";
import SaveKaroMotionPlayer, {
  type SaveKaroMotionKind,
} from "./SaveKaroMotionPlayer.dom";

interface MotionPlayerFrameProps {
  kind: SaveKaroMotionKind;
  guideId?: GuideMotionId;
  active?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  style?: ViewStyle;
}

export default function MotionPlayerFrame({
  kind,
  guideId,
  active = true,
  autoPlay = true,
  loop = true,
  style,
}: MotionPlayerFrameProps) {
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );
  const [screenFocused, setScreenFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, []),
  );

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      "change",
      setAppState,
    );
    const motionSubscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    return () => {
      appStateSubscription.remove();
      motionSubscription.remove();
    };
  }, []);

  const playbackActive =
    active && screenFocused && appState === "active" && !reduceMotion;

  return (
    <View style={[styles.frame, style]}>
      <SaveKaroMotionPlayer
        kind={kind}
        guideId={guideId}
        active={playbackActive}
        autoPlay={autoPlay && !reduceMotion}
        loop={loop && !reduceMotion}
        dom={{
          scrollEnabled: false,
          bounces: false,
          showsHorizontalScrollIndicator: false,
          showsVerticalScrollIndicator: false,
          style: styles.webView,
          containerStyle: styles.webView,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 16 / 9,
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.78)",
    backgroundColor: "#f8f3ec",
    boxShadow: "0 24px 70px rgba(15,23,42,0.12)",
  },
  webView: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
});
