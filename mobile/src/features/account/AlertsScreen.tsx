import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAlertSchema } from "@savekaro/contracts";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  Bell,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react-native";
import {
  Button,
  Card,
  ErrorState,
  Field,
  Heading,
  PageBackButton,
  Screen,
  Text,
} from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import { colors } from "../../theme";

interface PriceAlert {
  id: string;
  mode: "KEYWORD" | "URL";
  keywords: string;
  watchUrl: string | null;
  maxPrice: string | null;
  isActive: boolean;
  region: "INDIA" | "CANADA" | "WORLD" | null;
  categoryId: string | null;
  createdAt?: string;
  lastTriggeredAt?: string | null;
}

export default function AlertsScreen() {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ["alerts", user?.id];
  const [editor, setEditor] = useState<PriceAlert | "new" | null>(null);
  const [mode, setMode] = useState<"KEYWORD" | "URL">("KEYWORD");
  const [value, setValue] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [region, setRegion] = useState<PriceAlert["region"]>("INDIA");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: ({ signal }) => api.request<PriceAlert[]>("/alerts", { signal }),
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
  const mutation = useMutation({
    mutationFn: (input: {
      path: string;
      method: "POST" | "PUT" | "DELETE";
      body?: unknown;
    }) => api.request(input.path, input),
    onSuccess: () => {
      setEditor(null);
      void client.invalidateQueries({ queryKey: key });
    },
    onError: (error) => {
      setFormError(error.message);
      Alert.alert("Could not update alert", error.message);
    },
  });
  if (!user)
    return (
      <Screen>
        <PageBackButton />
        <Heading icon={Bell}>Price Alerts</Heading>
        <Text>Sign in to track prices.</Text>
        <Button
          title="Sign in"
          onPress={() => router.push("/(tabs)/settings")}
        />
      </Screen>
    );

  function edit(alert: PriceAlert | "new") {
    setEditor(alert);
    setFormError("");
    setMode(alert === "new" ? "KEYWORD" : alert.mode);
    setValue(
      alert === "new"
        ? ""
        : alert.mode === "URL"
          ? (alert.watchUrl ?? "")
          : alert.keywords,
    );
    setMaxPrice(alert === "new" ? "" : (alert.maxPrice ?? ""));
    setRegion(alert === "new" ? "INDIA" : alert.region);
    setCategoryId(alert === "new" ? null : alert.categoryId);
  }
  function save() {
    const parsed = createAlertSchema.safeParse({
      mode,
      keywords: mode === "KEYWORD" ? value.trim() : undefined,
      watchUrl: mode === "URL" ? value.trim() : undefined,
      maxPrice: maxPrice.trim() ? Number(maxPrice) : undefined,
      region: region ?? undefined,
      categoryId: categoryId ?? undefined,
    });
    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ?? "Check the alert details.",
      );
      return;
    }
    const isEditing = editor && editor !== "new";
    mutation.mutate({
      path: isEditing ? `/alerts/${editor.id}` : "/alerts",
      method: isEditing ? "PUT" : "POST",
      body: isEditing
        ? {
            ...parsed.data,
            maxPrice: parsed.data.maxPrice ?? null,
            region,
            categoryId: mode === "KEYWORD" ? categoryId : null,
          }
        : parsed.data,
    });
  }
  return (
    <Screen>
      <PageBackButton />
      <Heading
        icon={Bell}
        action={
          <Pressable
            accessibilityRole="button"
            disabled={mutation.isPending}
            onPress={() => edit("new")}
            style={styles.newButton}
          >
            <View style={styles.plus}>
              <Plus size={14} color="white" />
            </View>
            <Text style={styles.newLabel}>New Alert</Text>
          </Pressable>
        }
      >
        Price Alerts
      </Heading>
      {editor ? (
        <Card>
          <Text style={{ fontWeight: "700" }}>
            {editor === "new" ? "Create Alert" : "Edit Alert"}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {(["KEYWORD", "URL"] as const).map((item) => (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityState={{ checked: mode === item }}
                onPress={() => setMode(item)}
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderColor: mode === item ? colors.accent : colors.border,
                  borderRadius: 20,
                }}
              >
                <Text>{item === "KEYWORD" ? "Keywords" : "Product URL"}</Text>
              </Pressable>
            ))}
          </View>
          <Field
            label={mode === "URL" ? "Product URL" : "Keywords"}
            value={value}
            onChangeText={setValue}
            autoCapitalize={mode === "URL" ? "none" : "sentences"}
          />
          <Field
            label="Target price (optional)"
            value={maxPrice}
            onChangeText={setMaxPrice}
            keyboardType="decimal-pad"
          />
          <Text>Region</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {([null, "INDIA", "CANADA", "WORLD"] as const).map((item) => (
              <Pressable
                key={item ?? "all"}
                accessibilityRole="radio"
                accessibilityState={{ checked: region === item }}
                onPress={() => setRegion(item)}
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderColor: region === item ? colors.accent : colors.border,
                  borderRadius: 20,
                }}
              >
                <Text>{item ?? "Any"}</Text>
              </Pressable>
            ))}
          </View>
          {mode === "KEYWORD" ? (
            <>
              <Text>Category</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Button
                  title="Any"
                  secondary
                  onPress={() => setCategoryId(null)}
                />
                {categories.data?.map((category) => (
                  <Pressable
                    key={category.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: categoryId === category.id }}
                    onPress={() => setCategoryId(category.id)}
                    style={{
                      padding: 12,
                      borderWidth: 1,
                      borderColor:
                        categoryId === category.id
                          ? colors.accent
                          : colors.border,
                      borderRadius: 20,
                    }}
                  >
                    <Text>{category.name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          {formError ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {formError}
            </Text>
          ) : null}
          <Button
            title="Save alert"
            onPress={save}
            loading={mutation.isPending}
          />
          <Button
            title="Cancel"
            secondary
            onPress={() => setEditor(null)}
            disabled={mutation.isPending}
          />
        </Card>
      ) : null}
      {query.isError ? <ErrorState retry={() => void query.refetch()} /> : null}
      {query.isPending ? <ActivityIndicator color={colors.primary} /> : null}
      {!query.isPending && !query.isError && !query.data?.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>No alerts yet</Text>
          <Text style={styles.emptyCopy}>
            Create your first price alert and we'll notify you when a matching
            deal drops — by email and in-app notification.
          </Text>
        </View>
      ) : null}
      {!!query.data?.length && (
        <View style={styles.alertList}>
          {query.data.map((alert) => (
            <View
              key={alert.id}
              style={[styles.alert, !alert.isActive && { opacity: 0.6 }]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit alert for ${alert.keywords}`}
                onPress={() => edit(alert)}
                style={{ flex: 1, gap: 4 }}
              >
                <View style={styles.badges}>
                  <Text style={{ fontWeight: "600" }}>{alert.keywords}</Text>
                  {alert.mode === "URL" ? (
                    <Text
                      style={[
                        styles.badge,
                        { color: "#c2410c", backgroundColor: "#ffedd5" },
                      ]}
                    >
                      URL watchlist
                    </Text>
                  ) : null}
                  {alert.maxPrice ? (
                    <Text
                      style={[
                        styles.badge,
                        { color: "#15803d", backgroundColor: "#dcfce7" },
                      ]}
                    >
                      ≤{" "}
                      {alert.region === "INDIA"
                        ? "₹"
                        : alert.region === "CANADA"
                          ? "CA$"
                          : ""}
                      {Number(alert.maxPrice).toLocaleString(
                        alert.region === "INDIA" ? "en-IN" : "en-US",
                      )}
                    </Text>
                  ) : null}
                  {alert.region ? (
                    <Text
                      style={[
                        styles.badge,
                        { color: "#1d4ed8", backgroundColor: "#dbeafe" },
                      ]}
                    >
                      {alert.region === "INDIA"
                        ? "🇮🇳 India"
                        : alert.region === "CANADA"
                          ? "🇨🇦 Canada"
                          : "🌐 Worldwide"}
                    </Text>
                  ) : null}
                  {!alert.isActive ? (
                    <Text
                      style={[
                        styles.badge,
                        { color: "#a16207", backgroundColor: "#fef9c3" },
                      ]}
                    >
                      Paused
                    </Text>
                  ) : null}
                </View>
                {alert.watchUrl ? (
                  <Text numberOfLines={1} style={styles.meta}>
                    {alert.watchUrl}
                  </Text>
                ) : null}
                {alert.createdAt ? (
                  <Text style={styles.meta}>
                    Created {new Date(alert.createdAt).toLocaleDateString()}
                    {alert.lastTriggeredAt
                      ? ` · Last triggered ${new Date(alert.lastTriggeredAt).toLocaleDateString()}`
                      : ""}
                  </Text>
                ) : null}
              </Pressable>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{
                    checked: alert.isActive,
                    disabled: mutation.isPending,
                  }}
                  accessibilityLabel={
                    alert.isActive
                      ? `Pause alert for ${alert.keywords}`
                      : `Activate alert for ${alert.keywords}`
                  }
                  style={styles.iconButton}
                  disabled={mutation.isPending}
                  onPress={() =>
                    mutation.mutate({
                      path: `/alerts/${alert.id}/active`,
                      method: "PUT",
                      body: { isActive: !alert.isActive },
                    })
                  }
                >
                  {alert.isActive ? (
                    <ToggleRight size={20} color="#22c55e" />
                  ) : (
                    <ToggleLeft size={20} color={colors.muted} />
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete alert for ${alert.keywords}`}
                  style={[styles.iconButton, { width: 32 }]}
                  hitSlop={6}
                  disabled={mutation.isPending}
                  onPress={() =>
                    Alert.alert("Delete alert?", alert.keywords, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () =>
                          mutation.mutate({
                            path: `/alerts/${alert.id}`,
                            method: "DELETE",
                          }),
                      },
                    ])
                  }
                >
                  <Trash2 size={16} color={colors.accent} />
                </Pressable>
              </View>
            </View>
          ))}
          {query.data?.length ? (
            <Text style={[styles.meta, { textAlign: "center", paddingTop: 8 }]}>
              {query.data.length} / 10 alerts used
            </Text>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  newButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.button,
  },
  newLabel: { color: "white", fontSize: 15, fontWeight: "600" },
  plus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  alert: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  meta: { fontSize: 12, lineHeight: 16, color: colors.muted },
  alertList: { marginTop: 8, gap: 12 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 36,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingVertical: 64, gap: 16 },
  emptyEmoji: { fontSize: 72, lineHeight: 84 },
  emptyTitle: { fontSize: 24, fontWeight: "600", lineHeight: 32 },
  emptyCopy: { textAlign: "center", color: colors.muted },
});
