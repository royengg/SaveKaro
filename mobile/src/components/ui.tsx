import type { PropsWithChildren } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme";

export function Text(props: TextProps) {
  return <NativeText {...props} style={[styles.text, props.style]} />;
}
export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}
export function Heading({ children }: PropsWithChildren) {
  return (
    <LinearGradient
      colors={[colors.pink, colors.surface, colors.cream]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heading}
    >
      <Text accessibilityRole="header" style={styles.title}>
        {children}
      </Text>
    </LinearGradient>
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
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  heading: {
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  title: { fontSize: 30, lineHeight: 38, fontWeight: "700" },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.text,
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
  },
});
