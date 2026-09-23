import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAlertSchema } from "@savekaro/contracts";
import { router } from "expo-router";
import { Alert, Pressable, Switch, View } from "react-native";
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
        <Heading>Price Alerts</Heading>
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
      <Heading>Price Alerts</Heading>
      <Button
        title="New Alert"
        onPress={() => edit("new")}
        disabled={mutation.isPending}
      />
      {editor ? (
        <Card>
          <Text style={{ fontWeight: "700" }}>
            {editor === "new" ? "Create alert" : "Edit alert"}
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
      {!query.isPending && !query.isError && !query.data?.length ? (
        <Text>No alerts yet.</Text>
      ) : null}
      {query.data?.map((alert) => (
        <Card key={alert.id}>
          <Text style={{ fontWeight: "700" }}>{alert.keywords}</Text>
          {alert.maxPrice ? <Text>Target: {alert.maxPrice}</Text> : null}
          <Switch
            accessibilityLabel={`Enable alert for ${alert.keywords}`}
            value={alert.isActive}
            disabled={mutation.isPending}
            onValueChange={(isActive) =>
              mutation.mutate({
                path: `/alerts/${alert.id}/active`,
                method: "PUT",
                body: { isActive },
              })
            }
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button title="Edit" secondary onPress={() => edit(alert)} />
            <Button
              title="Delete"
              secondary
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
            />
          </View>
        </Card>
      ))}
      <Text>{query.data?.length ?? 0} / 10 alerts used</Text>
    </Screen>
  );
}
