import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDealSchema } from "@savekaro/contracts";
import { router } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";

const fields = [
  { key: "title", label: "Title", required: true },
  { key: "productUrl", label: "Product URL", required: true },
  { key: "description", label: "Description" },
  { key: "store", label: "Store" },
  { key: "originalPrice", label: "Original price" },
  { key: "dealPrice", label: "Deal price" },
  { key: "discountPercent", label: "Discount (%)" },
  { key: "imageUrl", label: "Image URL" },
] as const;
type FieldKey = (typeof fields)[number]["key"];
type Region = "INDIA" | "CANADA" | "WORLD";
interface Category {
  id: string;
  name: string;
}

export default function SubmitDealScreen() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    title: "",
    productUrl: "",
    description: "",
    store: "",
    originalPrice: "",
    dealPrice: "",
    discountPercent: "",
    imageUrl: "",
  });
  const [categoryId, setCategoryId] = useState("");
  const [region, setRegion] = useState<Region>("INDIA");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputs = useRef<Partial<Record<FieldKey, TextInput | null>>>({});
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) =>
      api.request<Category[]>("/categories", { signal, authenticated: false }),
    staleTime: 300_000,
  });
  const submit = useMutation({
    mutationFn: (body: ReturnType<typeof createDealSchema.parse>) =>
      api.request<{ id: string }>("/deals", { method: "POST", body }),
    onSuccess: (deal) => {
      void client.invalidateQueries({ queryKey: ["deals"] });
      void client.invalidateQueries({ queryKey: ["submitted"] });
      router.replace({ pathname: "/deal/[id]", params: { id: deal.id } });
    },
    onError: (error) => Alert.alert("Could not submit deal", error.message),
  });
  if (!user)
    return (
      <View style={styles.content}>
        <Text>Sign in from Settings to submit a deal.</Text>
      </View>
    );

  function onSubmit() {
    const parsed = createDealSchema.safeParse({
      title: values.title.trim(),
      productUrl: values.productUrl.trim(),
      description: values.description.trim() || undefined,
      store: values.store.trim() || undefined,
      imageUrl: values.imageUrl.trim() || undefined,
      originalPrice: values.originalPrice.trim()
        ? Number(values.originalPrice)
        : undefined,
      dealPrice: values.dealPrice.trim() ? Number(values.dealPrice) : undefined,
      discountPercent: values.discountPercent.trim()
        ? Number(values.discountPercent)
        : undefined,
      categoryId,
      region,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      const first = fields.find((field) => next[field.key]);
      if (first) inputs.current[first.key]?.focus();
      return;
    }
    setErrors({});
    submit.mutate(parsed.data);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" style={styles.title}>
          Submit a Deal
        </Text>
        <View style={styles.card}>
          {fields.map((field) => {
            const numeric =
              field.key === "originalPrice" ||
              field.key === "dealPrice" ||
              field.key === "discountPercent";
            return (
              <View key={field.key} style={styles.field}>
                <Text style={styles.label}>
                  {field.label}
                  {"required" in field ? " *" : ""}
                </Text>
                <TextInput
                  ref={(ref) => {
                    inputs.current[field.key] = ref;
                  }}
                  accessibilityLabel={field.label}
                  accessibilityHint={errors[field.key]}
                  style={[
                    styles.input,
                    errors[field.key] ? styles.invalid : undefined,
                  ]}
                  value={values[field.key]}
                  onChangeText={(value) =>
                    setValues((old) => ({ ...old, [field.key]: value }))
                  }
                  autoCapitalize={
                    field.key.endsWith("Url") ? "none" : "sentences"
                  }
                  keyboardType={
                    numeric
                      ? "decimal-pad"
                      : field.key.endsWith("Url")
                        ? "url"
                        : "default"
                  }
                  multiline={field.key === "description"}
                  editable={!submit.isPending}
                />
                {errors[field.key] ? (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {errors[field.key]}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Category *</Text>
          {categories.isError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void categories.refetch()}
            >
              <Text style={styles.error}>
                Could not load categories. Tap to retry.
              </Text>
            </Pressable>
          ) : null}
          <View style={styles.options}>
            {categories.data?.map((category) => (
              <Pressable
                key={category.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: categoryId === category.id }}
                style={[
                  styles.chip,
                  categoryId === category.id && styles.selected,
                ]}
                onPress={() => setCategoryId(category.id)}
              >
                <Text>{category.name}</Text>
              </Pressable>
            ))}
          </View>
          {errors.categoryId ? (
            <Text accessibilityRole="alert" style={styles.error}>
              Choose a category.
            </Text>
          ) : null}
          <Text style={styles.label}>Region</Text>
          <View style={styles.options}>
            {(["INDIA", "CANADA", "WORLD"] as const).map((item) => (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityState={{ checked: region === item }}
                style={[styles.chip, region === item && styles.selected]}
                onPress={() => setRegion(item)}
              >
                <Text>
                  {item === "INDIA"
                    ? "India"
                    : item === "CANADA"
                      ? "Canada"
                      : "World"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={submit.isPending}
          style={styles.submit}
          onPress={onSubmit}
        >
          <Text style={styles.submitText}>
            {submit.isPending ? "Submitting…" : "Submit Deal"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fffafb" },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: "700", color: "#171717" },
  card: {
    padding: 18,
    gap: 16,
    borderRadius: 22,
    backgroundColor: "white",
    borderColor: "#ece7e9",
    borderWidth: 1,
  },
  field: { gap: 8 },
  label: { fontWeight: "600", fontSize: 15, color: "#171717" },
  input: {
    minHeight: 48,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#d3ced1",
    borderRadius: 12,
    color: "#171717",
  },
  invalid: { borderColor: "#bb001e" },
  error: { color: "#bb001e", lineHeight: 20 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d3ced1",
  },
  selected: { backgroundColor: "#ffe5ef", borderColor: "#e60023" },
  submit: {
    padding: 16,
    backgroundColor: "#171717",
    borderRadius: 28,
    alignItems: "center",
  },
  submitText: { color: "white", fontWeight: "700", fontSize: 16 },
});
