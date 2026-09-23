import { useId, type PropsWithChildren, type ReactNode } from "react";
import { router } from "expo-router";
import { ArrowLeft, type LucideIcon } from "lucide-react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, pageHighlights, type PageTone } from "../theme";
import PageSurface from "./PageSurface";

export function Text(props: TextProps) {
  const weight = String(StyleSheet.flatten(props.style)?.fontWeight ?? "400");
  const family =
    {
      "400": "Inter_400Regular",
      "500": "Inter_500Medium",
      "600": "Inter_600SemiBold",
      "700": "Inter_700Bold",
      "800": "Inter_800ExtraBold",
      bold: "Inter_700Bold",
    }[weight] ?? "Inter_400Regular";
  return (
    <NativeText
      {...props}
      style={[
        styles.text,
        props.style,
        { fontFamily: family, fontWeight: "normal" },
      ]}
    />
  );
}
export function Screen({
  children,
  tone,
  contentStyle,
}: PropsWithChildren<{
  tone?: PageTone;
  contentStyle?: StyleProp<ViewStyle>;
}>) {
  return (
    <PageSurface tone={tone}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
    </PageSurface>
  );
}
export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}
export function PageBackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to deals"
      onPress={() => router.navigate("/(tabs)")}
      hitSlop={6}
      style={styles.back}
    >
      <ArrowLeft size={14} color={colors.muted} />
      <Text
        style={{
          fontSize: 13,
          lineHeight: 20,
          fontWeight: "500",
          color: colors.muted,
        }}
      >
        Back
      </Text>
    </Pressable>
  );
}

export function Heading({
  children,
  icon: Icon,
  iconColor,
  badges,
  action,
  variant = "glass",
  tone = "default",
}: PropsWithChildren<{
  icon?: LucideIcon;
  iconColor?: string;
  badges?: (string | { label: string; icon: LucideIcon; color?: string })[];
  action?: ReactNode;
  variant?: "glass" | "plain";
  tone?: PageTone;
}>) {
  const id = useId().replace(/:/g, "");
  const highlight = pageHighlights[tone];
  return (
    <View style={variant === "glass" ? styles.heading : styles.plainHeading}>
      {variant === "glass" && (
        <Svg
          pointerEvents="none"
          width="100%"
          height="100%"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <RadialGradient id={`${id}pink`} cx="0%" cy="0%" r="45%">
              <Stop offset="0" stopColor={highlight[0]} stopOpacity={0.16} />
              <Stop offset="1" stopColor={highlight[0]} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`${id}amber`} cx="100%" cy="100%" r="50%">
              <Stop offset="0" stopColor={highlight[1]} stopOpacity={0.12} />
              <Stop offset="1" stopColor={highlight[1]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id}pink)`} />
          <Rect width="100%" height="100%" fill={`url(#${id}amber)`} />
        </Svg>
      )}
      <View style={styles.headingRow}>
        {Icon && (
          <View
            style={variant === "glass" ? styles.headingIcon : styles.plainIcon}
          >
            <Icon
              size={variant === "glass" ? 18 : 24}
              color={
                iconColor ??
                (variant === "glass" ? colors.accent : colors.primary)
              }
              strokeWidth={2.2}
            />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" style={styles.title}>
            {children}
          </Text>
          {!!badges?.length && (
            <View style={styles.badges}>
              {badges.map((badge) => {
                const label = typeof badge === "string" ? badge : badge.label;
                const BadgeIcon = typeof badge === "string" ? null : badge.icon;
                return (
                  <View
                    key={label}
                    style={[
                      styles.badge,
                      tone === "submission" && {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: "#f3f6fa",
                        borderColor: "#e2e8f0",
                      },
                    ]}
                  >
                    {BadgeIcon && (
                      <BadgeIcon
                        size={12}
                        color={
                          typeof badge === "string"
                            ? colors.text
                            : (badge.color ?? colors.text)
                        }
                      />
                    )}
                    <Text style={styles.badgeText}>{label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
      {action && (
        <View style={{ marginTop: 16, alignSelf: "flex-start" }}>{action}</View>
      )}
    </View>
  );
}
export function Button({
  title,
  onPress,
  disabled,
  loading,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        (disabled || loading) && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.text : colors.surface} />
      ) : (
        <Text
          style={{
            color: secondary ? colors.text : colors.surface,
            fontWeight: "600",
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, props.style]}
      />
    </View>
  );
}
export function ErrorState({
  message = "Could not load this content.",
  retry,
}: {
  message?: string;
  retry?: () => void;
}) {
  return (
    <Card>
      <Text accessibilityRole="alert" style={{ color: colors.danger }}>
        {message}
      </Text>
      {retry && <Button title="Try again" onPress={retry} secondary />}
    </Card>
  );
}
const styles = StyleSheet.create({
  text: { fontSize: 16, color: colors.text, lineHeight: 24 },
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  heading: {
    padding: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: "rgba(255,255,255,0.82)",
    boxShadow: "0 24px 48px -30px rgba(15,23,42,0.32)",
    overflow: "hidden",
  },
  plainHeading: { paddingVertical: 4 },
  plainIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(23,23,23,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headingRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headingIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.58)",
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  badge: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.84)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
  },
  badgeText: { fontSize: 11, lineHeight: 16, fontWeight: "500" },
  back: {
    boxShadow:
      "0 8px 18px -14px rgba(15,23,42,0.34), 0 1px 3px rgba(15,23,42,0.06)",
    alignSelf: "flex-start",
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.78)",
  },
  title: {
    fontSize: 25.6,
    lineHeight: 38.4,
    letterSpacing: -0.768,
    fontWeight: "700",
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.button,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    minHeight: 48,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    fontFamily: "Inter_400Regular",
  },
});
