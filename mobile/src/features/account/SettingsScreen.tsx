import { useState, type PropsWithChildren } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  Switch,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  ErrorState,
  Heading,
  PageBackButton,
  Screen,
  Text,
} from "../../components/ui";
import {
  Bell,
  Check,
  Mail,
  Save,
  Settings2,
  Shield,
  Smartphone,
  Tag,
  User,
  type LucideIcon,
} from "lucide-react-native";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import {
  registerPushNotifications,
  unregisterPushNotifications,
} from "../../lib/notifications";
import { colors } from "../../theme";
import { isExpoGo, nativeFeatureMessage } from "../../lib/runtime";

interface Preferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  preferredCategories: string[];
  minDiscountPercent: number;
}

interface PreferenceDraft {
  userId: string;
  value: Preferences;
}

function preferencesEqual(left: Preferences, right: Preferences): boolean {
  return (
    left.emailNotifications === right.emailNotifications &&
    left.pushNotifications === right.pushNotifications &&
    left.minDiscountPercent === right.minDiscountPercent &&
    left.preferredCategories.length === right.preferredCategories.length &&
    left.preferredCategories.every((id) =>
      right.preferredCategories.includes(id),
    )
  );
}

export default function SettingsScreen() {
  const { user, signInGoogle, signInApple, signOut } = useAuth();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<PreferenceDraft | null>(null);
  const key = ["preferences", user?.id];
  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: ({ signal }) =>
      api.request<Preferences>("/users/me/preferences", { signal }),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) =>
      api.request<Array<{ id: string; name: string }>>("/categories", {
        signal,
        authenticated: false,
      }),
    staleTime: 300_000,
  });
  const update = useMutation({
    mutationFn: async (body: Preferences) => {
      const pushSettingChanged =
        body.pushNotifications !== query.data?.pushNotifications;
      if (pushSettingChanged && body.pushNotifications)
        await registerPushNotifications();
      if (pushSettingChanged && !body.pushNotifications)
        await unregisterPushNotifications();
      return api.request<Preferences>("/users/me/preferences", {
        method: "PUT",
        body,
      });
    },
    onSuccess: (preferences) => {
      client.setQueryData(key, preferences);
      setDraft(null);
    },
    onError: (error) =>
      Alert.alert("Could not update preferences", error.message),
  });
  async function authenticate(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      Alert.alert(
        "Sign-in failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (user && query.isPending) {
    return (
      <Screen
        tone="settings"
        contentStyle={styles.loadingContent}
        footer={false}
      >
        <View
          accessible
          accessibilityLabel="Loading settings"
          style={styles.loadingIndicator}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const currentDraft = draft && draft.userId === user?.id ? draft.value : null;
  const prefs = currentDraft ?? query.data;
  const hasChanges = currentDraft !== null;

  function updateField<K extends keyof Preferences>(
    field: K,
    value: Preferences[K],
  ) {
    if (!user || !prefs) return;
    const next = { ...prefs, [field]: value };
    setDraft(
      query.data && preferencesEqual(next, query.data)
        ? null
        : { userId: user.id, value: next },
    );
  }

  return (
    <Screen tone="settings">
      <PageBackButton />
      <Heading
        tone="settings"
        icon={Settings2}
        badgesScrollable
        badges={
          prefs
            ? [
                {
                  label: "Signed-in account",
                  icon: Shield,
                  color: colors.primary,
                },
                `${prefs.preferredCategories.length} categories selected`,
                `${prefs.minDiscountPercent}% minimum discount`,
              ]
            : undefined
        }
        action={
          prefs ? (
            hasChanges ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: update.isPending }}
                disabled={update.isPending}
                onPress={() => update.mutate(prefs)}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && !update.isPending && styles.pressed,
                  update.isPending && styles.disabled,
                ]}
              >
                <View style={styles.saveButtonIcon}>
                  {update.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Save size={14} color="white" />
                  )}
                </View>
                <Text style={styles.saveButtonText}>
                  {update.isPending ? "Saving…" : "Save changes"}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.savedStatus}>
                <Check size={14} color="#059669" />
                <Text style={styles.savedStatusText}>All changes saved</Text>
              </View>
            )
          ) : undefined
        }
      >
        Settings
      </Heading>
      {isExpoGo ? (
        <Card>
          <Text accessibilityRole="header" style={{ fontWeight: "600" }}>
            Expo Go preview
          </Text>
          <Text>{nativeFeatureMessage}</Text>
        </Card>
      ) : user ? (
        <Section first>
          <SectionTitle icon={User} title="Profile" />
          <View style={[styles.nested, styles.profile]}>
            <View style={styles.avatarRing}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={{ fontSize: 18, color: colors.muted }}>
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                numberOfLines={1}
                style={{ fontSize: 18, fontWeight: "600" }}
              >
                {user.name || "Anonymous User"}
              </Text>
              <Text
                numberOfLines={1}
                style={{ fontSize: 14, color: colors.muted }}
              >
                {user.email}
              </Text>
              <View style={styles.accountBadge}>
                <Shield size={14} color={colors.primary} />
                <Text style={{ fontSize: 12 }}>Signed in</Text>
              </View>
            </View>
          </View>
        </Section>
      ) : (
        <Card>
          <Text>Sign in to save deals, post comments and track prices.</Text>
          <Button
            title="Continue with Google"
            onPress={() => void authenticate(signInGoogle)}
            loading={busy}
          />
          {Platform.OS === "ios" ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={24}
              style={{ height: 48 }}
              onPress={() => {
                if (!busy) void authenticate(signInApple);
              }}
            />
          ) : null}
        </Card>
      )}
      {user && query.isError ? (
        <ErrorState retry={() => void query.refetch()} />
      ) : null}
      {user && prefs ? (
        <>
          <Section>
            <SectionTitle icon={Bell} title="Notifications" />
            <View style={[styles.nested, styles.notification]}>
              <View style={styles.controlIcon}>
                <Mail size={20} color={colors.muted} />
              </View>
              <Text style={styles.controlLabel}>Email notifications</Text>
              <Switch
                thumbColor="white"
                accessibilityLabel="Email notifications"
                value={prefs.emailNotifications}
                trackColor={{ false: "#d4d4d8", true: colors.button }}
                disabled={update.isPending}
                onValueChange={(emailNotifications) =>
                  updateField("emailNotifications", emailNotifications)
                }
              />
            </View>
            <View style={[styles.nested, styles.notification]}>
              <View style={styles.controlIcon}>
                <Smartphone size={20} color={colors.muted} />
              </View>
              <Text style={styles.controlLabel}>App notifications</Text>
              <Switch
                thumbColor="white"
                accessibilityLabel="App notifications"
                value={prefs.pushNotifications}
                trackColor={{ false: "#d4d4d8", true: colors.button }}
                disabled={update.isPending}
                onValueChange={(pushNotifications) =>
                  updateField("pushNotifications", pushNotifications)
                }
              />
            </View>
          </Section>
          <Section>
            <SectionTitle icon={Tag} title="Deal Preferences" />
            <View style={styles.nested}>
              <Text style={styles.preferenceLabel}>Minimum discount</Text>
              <View style={styles.chips}>
                {[...new Set([10, 20, 30, 50, 70, prefs.minDiscountPercent])]
                  .sort((a, b) => a - b)
                  .map((value) => {
                    const selected = value === prefs.minDiscountPercent;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityState={{
                          checked: selected,
                          disabled: update.isPending,
                        }}
                        disabled={update.isPending}
                        onPress={() => updateField("minDiscountPercent", value)}
                        style={[styles.chip, selected && styles.selectedChip]}
                      >
                        {selected ? <Check size={14} color="white" /> : null}
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.selectedText,
                          ]}
                        >
                          {value}% OFF
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            </View>
            <View style={styles.nested}>
              <Text style={styles.preferenceLabel}>Preferred categories</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {categories.data?.map((category) => {
                  const selected = prefs.preferredCategories.includes(
                    category.id,
                  );
                  return (
                    <Pressable
                      key={category.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: selected,
                        disabled: update.isPending,
                      }}
                      disabled={update.isPending}
                      onPress={() =>
                        updateField(
                          "preferredCategories",
                          selected
                            ? prefs.preferredCategories.filter(
                                (id) => id !== category.id,
                              )
                            : [...prefs.preferredCategories, category.id],
                        )
                      }
                      style={[styles.chip, selected && styles.selectedChip]}
                    >
                      {selected ? <Check size={14} color="white" /> : null}
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.selectedText,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Section>
          <Section>
            <SectionTitle icon={Shield} title="Account" />
            <View style={styles.nested}>
              <Text style={styles.preferenceLabel}>Data &amp; Privacy</Text>
              <Text style={styles.accountDescription}>
                Review how SaveKaro uses service providers and handles your
                account data.
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() =>
                  void Linking.openURL(
                    "https://savekaro.online/privacy-policy",
                  ).catch(() => Alert.alert("Could not open page"))
                }
              >
                <Text style={styles.privacyLink}>Privacy policy</Text>
              </Pressable>
            </View>
            <View style={styles.nested}>
              <Text style={styles.preferenceLabel}>Member status</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Your SaveKaro account is on free tier.
              </Text>
              <Text style={styles.activeBadge}>Active</Text>
            </View>
            <Button
              title="Sign out"
              secondary
              onPress={() =>
                Alert.alert(
                  "Sign out?",
                  "Cached account data will be removed from this device.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Sign out",
                      onPress: () =>
                        void signOut().catch((error: Error) =>
                          Alert.alert("Sign-out status", error.message),
                        ),
                    },
                  ],
                )
              }
            />
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

function Section({
  children,
  first = false,
}: PropsWithChildren<{ first?: boolean }>) {
  return (
    <View style={[styles.section, first && { marginTop: 4 }]}>{children}</View>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionIcon}>
        <Icon size={20} color={colors.primary} />
      </View>
      <Text
        accessibilityRole="header"
        style={{ fontSize: 18, fontWeight: "600", letterSpacing: -0.36 }}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingIndicator: {
    padding: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.82)",
  },
  saveButton: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: colors.button,
  },
  saveButtonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  saveButtonText: {
    color: "white",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  savedStatus: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    height: 36,
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  savedStatusText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    color: colors.muted,
  },
  section: {
    padding: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "rgba(255,255,255,0.82)",
    gap: 12,
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  nested: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e7ecf2",
    backgroundColor: "#f8fafc",
    gap: 12,
  },
  profile: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarRing: {
    width: 72,
    height: 72,
    padding: 4,
    margin: -4,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  avatarFallback: {
    backgroundColor: "#f4f4f5",
    alignItems: "center",
    justifyContent: "center",
  },
  accountBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 32,
    backgroundColor: "white",
  },
  notification: { flexDirection: "row", alignItems: "center", gap: 12 },
  controlIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f4f5",
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlLabel: { flex: 1, fontWeight: "600", fontSize: 15, lineHeight: 20 },
  preferenceLabel: { fontSize: 15, fontWeight: "600" },
  accountDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  privacyLink: {
    alignSelf: "flex-start",
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f1f5f9",
  },
  selectedChip: { backgroundColor: colors.button, borderColor: colors.button },
  chipText: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  selectedText: { color: "white" },
  activeBadge: {
    backgroundColor: "#059669",
    color: "white",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "500",
  },
});
