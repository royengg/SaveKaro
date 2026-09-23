import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  Switch,
  View,
} from "react-native";
import {
  Button,
  Card,
  ErrorState,
  Field,
  Heading,
  Screen,
  Text,
} from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import {
  registerPushNotifications,
  unregisterPushNotifications,
} from "../../lib/notifications";
import { colors } from "../../theme";

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
  { title: "Your Cart", path: "/cart" },
  { title: "Leaderboard", path: "/leaderboard" },
  { title: "Guides", path: "/guides" },
];

export default function SettingsScreen() {
  const { user, signInGoogle, signInApple, signOut } = useAuth();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [discount, setDiscount] = useState<string | null>(null);
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
      setDiscount(null);
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
      <Heading>Settings</Heading>
      {user ? (
        <Card>
          <Text style={{ fontSize: 20, fontWeight: "700" }}>
            {user.name ?? "Community member"}
          </Text>
          <Text>{user.email}</Text>
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
        </Card>
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
          <Card>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text style={{ flex: 1 }}>Email notifications</Text>
              <Switch
                accessibilityLabel="Email notifications"
                value={prefs.emailNotifications}
                disabled={update.isPending}
                onValueChange={(emailNotifications) =>
                  update.mutate({ emailNotifications })
                }
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text style={{ flex: 1 }}>App notifications</Text>
              <Switch
                accessibilityLabel="App notifications"
                value={prefs.pushNotifications}
                disabled={update.isPending}
                onValueChange={(pushNotifications) =>
                  update.mutate({ pushNotifications })
                }
              />
            </View>
          </Card>
          <Card>
            <Text style={{ fontWeight: "700" }}>Preferred categories</Text>
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
                    style={{
                      padding: 12,
                      borderWidth: 1,
                      borderRadius: 20,
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? colors.pink : colors.surface,
                    }}
                  >
                    <Text>{category.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Field
              label="Minimum discount (%)"
              value={discount ?? String(prefs.minDiscountPercent)}
              onChangeText={setDiscount}
              keyboardType="number-pad"
            />
            <Button
              title="Save discount preference"
              loading={update.isPending}
              onPress={() => {
                const value = Number(discount ?? prefs.minDiscountPercent);
                if (!Number.isInteger(value) || value < 0 || value > 100)
                  return Alert.alert("Enter a discount from 0 to 100.");
                update.mutate({ minDiscountPercent: value });
              }}
            />
          </Card>
        </>
      ) : null}
      <Card>
        {links.map((link) => (
          <Button
            key={link.title}
            title={link.title}
            secondary
            onPress={() => router.push(link.path)}
          />
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
          <Button
            key={link.path}
            title={link.title}
            secondary
            onPress={() =>
              void Linking.openURL(`https://savekaro.online${link.path}`).catch(
                () => Alert.alert("Could not open page"),
              )
            }
          />
        ))}
      </Card>
    </Screen>
  );
}
