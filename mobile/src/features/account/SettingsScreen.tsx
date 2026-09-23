import { useState, type PropsWithChildren } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import {
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
  ChevronRight,
  Mail,
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
const links: Array<{ title: string; path: Href }> = [
  { title: "My profile", path: "/profile" },
  { title: "Categories", path: "/categories" },
  { title: "My submissions", path: "/submitted" },
  { title: "Submit a Deal", path: "/submit" },
  { title: "Notifications", path: "/notifications" },
  { title: "Price Alerts", path: "/(tabs)/alerts" },
  { title: "Your Cart", path: "/cart" },
  { title: "Leaderboard", path: "/leaderboard" },
  { title: "Guides", path: "/guides" },
];

export default function SettingsScreen() {
  const { user, signInGoogle, signInApple, signOut } = useAuth();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
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
    mutationFn: async (body: Partial<Preferences>) => {
      if (body.pushNotifications === true) await registerPushNotifications();
      if (body.pushNotifications === false) await unregisterPushNotifications();
      return api.request<Preferences>("/users/me/preferences", {
        method: "PUT",
        body,
      });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: key });
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

  const prefs = query.data;
  return (
    <Screen>
      <PageBackButton />
      <Heading
        icon={Settings2}
        badges={
          prefs
            ? [
                `${prefs.preferredCategories.length} categories selected`,
                `${prefs.minDiscountPercent}% minimum discount`,
              ]
            : undefined
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
        <Section>
          <SectionTitle icon={User} title="Profile" />
          <View style={[styles.nested, styles.profile]}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={{ fontSize: 22 }}>
                  {user.name?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
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
                accessibilityLabel="Email notifications"
                value={prefs.emailNotifications}
                trackColor={{ false: "#d4d4d8", true: colors.button }}
                disabled={update.isPending}
                onValueChange={(emailNotifications) =>
                  update.mutate({ emailNotifications })
                }
              />
            </View>
            <View style={[styles.nested, styles.notification]}>
              <View style={styles.controlIcon}>
                <Smartphone size={20} color={colors.muted} />
              </View>
              <Text style={styles.controlLabel}>App notifications</Text>
              <Switch
                accessibilityLabel="App notifications"
                value={prefs.pushNotifications}
                trackColor={{ false: "#d4d4d8", true: colors.button }}
                disabled={update.isPending}
                onValueChange={(pushNotifications) =>
                  update.mutate({ pushNotifications })
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
                        onPress={() =>
                          update.mutate({ minDiscountPercent: value })
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
                        update.mutate({
                          preferredCategories: selected
                            ? prefs.preferredCategories.filter(
                                (id) => id !== category.id,
                              )
                            : [...prefs.preferredCategories, category.id],
                        })
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
              <Pressable
                accessibilityRole="link"
                onPress={() =>
                  void Linking.openURL(
                    "https://savekaro.online/privacy-policy",
                  ).catch(() => Alert.alert("Could not open page"))
                }
              >
                <Text style={{ color: colors.primary, fontSize: 14 }}>
                  Privacy policy
                </Text>
              </Pressable>
            </View>
            <View style={styles.nested}>
              <Text style={styles.preferenceLabel}>Member status</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Your SaveKaro account is on free tier.
              </Text>
              <Text style={styles.activeBadge}>Active</Text>
            </View>
          </Section>
        </>
      ) : null}
      <Card>
        {links.map((link) => (
          <Pressable
            key={link.title}
            accessibilityRole="button"
            style={styles.linkRow}
            onPress={() => router.push(link.path)}
          >
            <Text>{link.title}</Text>
            <ChevronRight size={18} color={colors.muted} />
          </Pressable>
        ))}
      </Card>
      <Card>
        {[
          { title: "About SaveKaro", path: "/about" },
          { title: "How it works", path: "/how-savekaro-works" },
          {
            title: "How we verify deals",
            path: "/how-savekaro-verifies-deals",
          },
          { title: "Privacy policy", path: "/privacy-policy" },
          { title: "Terms", path: "/terms-and-conditions" },
          { title: "Affiliate disclosure", path: "/affiliate-disclosure" },
          { title: "Contact", path: "/contact" },
        ].map((link) => (
          <Pressable
            key={link.path}
            accessibilityRole="link"
            style={styles.linkRow}
            onPress={() =>
              void Linking.openURL(`https://savekaro.online${link.path}`).catch(
                () => Alert.alert("Could not open page"),
              )
            }
          >
            <Text style={{ fontSize: 14 }}>{link.title}</Text>
            <ChevronRight size={16} color={colors.muted} />
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

function Section({ children }: PropsWithChildren) {
  return <View style={styles.section}>{children}</View>;
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
    backgroundColor: "#fafafa",
    borderColor: "white",
    borderWidth: 1,
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
    borderWidth: 4,
    borderColor: "white",
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
    paddingHorizontal: 10,
    minHeight: 28,
    backgroundColor: "white",
  },
  notification: { flexDirection: "row", alignItems: "center", gap: 12 },
  controlIcon: {
    width: 40,
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
  linkRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
