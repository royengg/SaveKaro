import { useCallback, useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Check, X } from "lucide-react-native";
import { Text } from "../../components/ui";
import { colors } from "../../theme";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "popular", label: "Most Popular" },
  { value: "discount", label: "Highest Discount" },
] as const;
const DISCOUNTS = ["30", "50", "70"];
const STORES = ["Amazon", "Myntra", "Ajio", "Nykaa", "Croma"];

interface Props {
  mode: "filters" | "store";
  sortBy: string;
  minDiscount: string;
  store: string;
  activeCount: number;
  onSort: (value: string) => void;
  onDiscount: (value: string) => void;
  onStore: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function FeedFilters(props: Props) {
  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={props.onClose}
    >
      {/* A full-screen modal must not inherit the native tab bar's safe area. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <FilterPanel {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function FilterPanel({
  mode,
  sortBy,
  minDiscount,
  store,
  activeCount,
  onSort,
  onDiscount,
  onStore,
  onClear,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(true);
  const closing = useRef(false);
  const isStore = mode === "store";

  useEffect(() => {
    let mounted = true;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        reduceMotion.current = enabled;
        if (enabled && !closing.current) {
          progress.stopAnimation();
          progress.setValue(1);
        }
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (!mounted || closing.current) return;
        reduceMotion.current = enabled;
        Animated.timing(progress, {
          toValue: 1,
          duration: enabled ? 0 : 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      },
      () => {
        if (mounted) progress.setValue(1);
      },
    );
    return () => {
      mounted = false;
      subscription.remove();
      progress.stopAnimation();
    };
  }, [progress]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: reduceMotion.current ? 0 : 170,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [onClose, progress]);

  return (
    <View style={[styles.overlay, isStore && styles.centered]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        {Platform.OS !== "android" && (
          <BlurView
            pointerEvents="none"
            intensity={6}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isStore ? "Close platform selection" : "Close filters"
          }
          onPress={close}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        onAccessibilityEscape={close}
        style={[
          styles.panel,
          isStore && styles.storePanel,
          {
            maxHeight: Math.min(height * 0.82, height - insets.top - 8),
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [isStore ? 16 : 64, 0],
                }),
              },
            ],
            opacity: progress,
          },
        ]}
      >
        {Platform.OS !== "android" && (
          <BlurView
            pointerEvents="none"
            intensity={40}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.panelContent}>
          {!isStore && (
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>
          )}
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              {isStore ? "Platform" : "Filters"}
            </Text>
            <View style={styles.headingActions}>
              {(isStore ? !!store : activeCount > 0) && (
                <Pressable
                  accessibilityRole="button"
                  onPress={isStore ? () => onStore("") : onClear}
                  style={styles.clear}
                >
                  <Text style={styles.clearText}>
                    {isStore ? "Clear" : "Clear all"}
                  </Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isStore ? "Close platform selection" : "Close filters"
                }
                onPress={close}
                hitSlop={4}
                style={styles.close}
              >
                <X size={16} color={colors.text} />
              </Pressable>
            </View>
          </View>
          <ScrollView
            bounces={false}
            contentInsetAdjustmentBehavior="never"
            style={styles.scroll}
            contentContainerStyle={styles.sections}
          >
            {isStore ? (
              <View style={styles.options}>
                {STORES.map((value) => (
                  <FilterChip
                    key={value}
                    label={value}
                    selected={store.toLowerCase() === value.toLowerCase()}
                    onPress={() => {
                      onStore(
                        store.toLowerCase() === value.toLowerCase()
                          ? ""
                          : value,
                      );
                      close();
                    }}
                  />
                ))}
              </View>
            ) : (
              <>
                <View>
                  <Text style={styles.sectionTitle}>Sort By</Text>
                  <View style={styles.options}>
                    {SORT_OPTIONS.map(({ value, label }) => (
                      <FilterChip
                        key={value}
                        label={label}
                        selected={sortBy === value}
                        onPress={() => onSort(value)}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.discountSection}>
                  <Text style={styles.sectionTitle}>Minimum Discount</Text>
                  <View style={styles.options}>
                    {DISCOUNTS.map((value) => (
                      <FilterChip
                        key={value}
                        label={`${value}% OFF`}
                        selected={minDiscount === value}
                        onPress={() =>
                          onDiscount(minDiscount === value ? "" : value)
                        }
                      />
                    ))}
                  </View>
                </View>
              </>
            )}
          </ScrollView>
          {!isStore && (
            <View
              style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}
            >
              <Pressable
                accessibilityRole="button"
                onPress={close}
                style={({ pressed }) => [
                  styles.results,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.resultsText}>Show Results</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selectedChip,
        pressed && styles.pressed,
      ]}
    >
      {selected && <Check size={12} color="white" style={{ marginRight: 4 }} />}
      <Text style={[styles.chipText, selected && styles.selectedText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  centered: { justifyContent: "center", alignItems: "center", padding: 16 },
  backdrop: { backgroundColor: "rgba(0,0,0,0.35)" },
  panel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.92)",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
  storePanel: {
    width: "100%",
    maxWidth: 384,
    borderRadius: 24,
    borderWidth: 1,
  },
  panelContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexShrink: 1,
    backgroundColor:
      Platform.OS === "android" ? "rgba(255,255,255,0.98)" : "transparent",
  },
  handleRow: { alignItems: "center", marginBottom: 12 },
  handle: { width: 48, height: 6, borderRadius: 3, backgroundColor: "#f5f5f5" },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  title: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  headingActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  close: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  clear: { minHeight: 32, justifyContent: "center", paddingHorizontal: 12 },
  clearText: { fontSize: 13, fontWeight: "500" },
  scroll: { flexShrink: 1 },
  sections: { paddingBottom: 16, gap: 20 },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 12,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: "rgba(23,23,23,0.3)",
  },
  chipText: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  selectedText: { color: "white" },
  discountSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  results: {
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  resultsText: {
    color: "white",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  pressed: { transform: [{ scale: 0.97 }] },
});
