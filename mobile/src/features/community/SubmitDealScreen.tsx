import { useRef, useState, type PropsWithChildren } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDealSchema } from "@savekaro/contracts";
import { router } from "expo-router";
import {
  BadgePercent,
  Banknote,
  Check,
  ChevronDown,
  Globe2,
  ImageIcon,
  Link2,
  ShieldCheck,
  Store,
  Tag,
  Upload,
  type LucideIcon,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import {
  Card,
  Heading,
  PageBackButton,
  Screen,
  Text,
} from "../../components/ui";
import PageSurface from "../../components/PageSurface";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import { colors } from "../../theme";
import { useRegion } from "../../providers/RegionProvider";

const fields = [
  { key: "title", label: "Deal title", required: true },
  { key: "productUrl", label: "Product URL", required: true },
  { key: "description", label: "Description" },
  { key: "store", label: "Store" },
  { key: "originalPrice", label: "Original Price" },
  { key: "dealPrice", label: "Deal Price" },
  { key: "imageUrl", label: "Image URL" },
] as const;
type FieldKey = (typeof fields)[number]["key"];

interface Category {
  id: string;
  name: string;
}

const REGION_META = {
  INDIA: { label: "India", currency: "INR", symbol: "₹" },
  CANADA: { label: "Canada", currency: "CAD", symbol: "CA$" },
  WORLD: { label: "Worldwide", currency: "USD", symbol: "$" },
} as const;

function FormSection({
  icon: Icon,
  title,
  children,
}: PropsWithChildren<{ icon: LucideIcon; title: string }>) {
  return (
    <View style={styles.panel}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Icon size={20} color={colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function FormField({
  label,
  required,
  value,
  error,
  inputRef,
  icon: Icon,
  labelMeta,
  prefix,
  multiline,
  ...inputProps
}: Omit<TextInputProps, "style"> & {
  label: string;
  required?: boolean;
  value: string;
  error?: string;
  inputRef?: (input: TextInput | null) => void;
  icon?: LucideIcon;
  labelMeta?: string;
  prefix?: string;
}) {
  return (
    <View style={styles.fieldCard}>
      <View style={styles.fieldLabelRow}>
        <View style={styles.fieldLabelGroup}>
          {Icon ? <Icon size={16} color={colors.text} /> : null}
          <Text style={styles.label}>
            {label}
            {required ? " *" : ""}
          </Text>
        </View>
        {labelMeta ? <Text style={styles.labelMeta}>{labelMeta}</Text> : null}
      </View>
      <View>
        {prefix ? <Text style={styles.inputPrefix}>{prefix}</Text> : null}
        <TextInput
          {...inputProps}
          ref={inputRef}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor="#64748b"
          value={value}
          multiline={multiline}
          style={[
            styles.input,
            multiline && styles.textarea,
            prefix ? styles.inputWithPrefix : undefined,
            error ? styles.invalid : undefined,
          ]}
        />
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export default function SubmitDealScreen() {
  const { user } = useAuth();
  const { region } = useRegion();
  const submissionMeta = REGION_META[region];
  const client = useQueryClient();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    title: "",
    productUrl: "",
    description: "",
    store: "",
    originalPrice: "",
    dealPrice: "",
    imageUrl: "",
  });
  const [categoryId, setCategoryId] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
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

  if (!user) {
    return (
      <Screen>
        <PageBackButton />
        <Card>
          <View style={styles.signedOut}>
            <Upload size={58} color={colors.muted} strokeWidth={1.6} />
            <Text style={styles.signedOutTitle}>Sign in Required</Text>
            <Text style={styles.signedOutCopy}>
              Sign in from Settings to submit a deal.
            </Text>
          </View>
        </Card>
      </Screen>
    );
  }

  const selectedCategory = categories.data?.find(
    (category) => category.id === categoryId,
  );
  const setField = (key: FieldKey, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };
  const fieldRef = (key: FieldKey) => (input: TextInput | null) => {
    inputs.current[key] = input;
  };

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
      categoryId,
      region,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] ??= issue.message;
      }
      setErrors(next);
      const first = fields.find((field) => next[field.key]);
      if (first) inputs.current[first.key]?.focus();
      return;
    }
    setErrors({});
    submit.mutate(parsed.data);
  }

  return (
    <PageSurface tone="submission">
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <PageBackButton />
          <Heading
            icon={Upload}
            tone="submission"
            badges={[
              {
                label: `Posting to ${submissionMeta.label}`,
                icon: Globe2,
                color: colors.text,
              },
              {
                label: `${submissionMeta.currency} pricing`,
                icon: Banknote,
                color: "#f59e0b",
              },
              {
                label: "Community submission",
                icon: ShieldCheck,
                color: "#059669",
              },
            ]}
          >
            Submit a Deal
          </Heading>

          <View style={styles.firstSection}>
            <FormSection icon={Tag} title="About the deal">
              <FormField
                label="Deal title"
                required
                inputRef={fieldRef("title")}
                value={values.title}
                error={errors.title}
                labelMeta={`${values.title.length}/200`}
                placeholder="e.g. Sony Headphones - 40% Off"
                maxLength={200}
                editable={!submit.isPending}
                onChangeText={(value) => setField("title", value)}
              />
              <FormField
                label="Description"
                inputRef={fieldRef("description")}
                value={values.description}
                error={errors.description}
                placeholder="Add any extra context like coupon details, seller notes, or why this is a standout deal..."
                multiline
                textAlignVertical="top"
                editable={!submit.isPending}
                onChangeText={(value) => setField("description", value)}
              />
            </FormSection>
          </View>

          <FormSection icon={BadgePercent} title="Pricing">
            <FormField
              label="Original Price"
              icon={Banknote}
              inputRef={fieldRef("originalPrice")}
              value={values.originalPrice}
              error={errors.originalPrice}
              labelMeta={submissionMeta.currency}
              prefix={submissionMeta.symbol}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!submit.isPending}
              onChangeText={(value) => setField("originalPrice", value)}
            />
            <FormField
              label="Deal Price"
              icon={Banknote}
              inputRef={fieldRef("dealPrice")}
              value={values.dealPrice}
              error={errors.dealPrice}
              labelMeta={submissionMeta.currency}
              prefix={submissionMeta.symbol}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!submit.isPending}
              onChangeText={(value) => setField("dealPrice", value)}
            />
          </FormSection>

          <FormSection icon={Link2} title="Store and sources">
            <FormField
              label="Product URL"
              required
              icon={Link2}
              inputRef={fieldRef("productUrl")}
              value={values.productUrl}
              error={errors.productUrl}
              placeholder="https://amazon.in/dp/..."
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!submit.isPending}
              onChangeText={(value) => setField("productUrl", value)}
            />
            <FormField
              label="Image URL"
              icon={ImageIcon}
              inputRef={fieldRef("imageUrl")}
              value={values.imageUrl}
              error={errors.imageUrl}
              placeholder="https://example.com/image.jpg"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!submit.isPending}
              onChangeText={(value) => setField("imageUrl", value)}
            />
            <FormField
              label="Store"
              icon={Store}
              inputRef={fieldRef("store")}
              value={values.store}
              error={errors.store}
              placeholder="e.g. Amazon, Myntra"
              editable={!submit.isPending}
              onChangeText={(value) => setField("store", value)}
            />

            <View style={styles.fieldCard}>
              <View style={styles.fieldLabelGroup}>
                <Tag size={16} color={colors.text} />
                <Text style={styles.label}>Category *</Text>
              </View>
              {categories.isPending ? <ActivityIndicator /> : null}
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
              {!categories.isError ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select category"
                  accessibilityState={{ expanded: categoryOpen }}
                  disabled={categories.isPending || submit.isPending}
                  onPress={() => setCategoryOpen(true)}
                  style={[
                    styles.select,
                    errors.categoryId ? styles.invalid : undefined,
                  ]}
                >
                  <Text
                    style={
                      selectedCategory ? styles.selectText : styles.placeholder
                    }
                  >
                    {selectedCategory?.name ?? "Select category"}
                  </Text>
                  <ChevronDown size={17} color={colors.muted} />
                </Pressable>
              ) : null}
              {errors.categoryId ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  Choose a category.
                </Text>
              ) : null}
            </View>
          </FormSection>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: submit.isPending }}
              disabled={submit.isPending}
              style={[styles.submit, submit.isPending && styles.disabled]}
              onPress={onSubmit}
            >
              {submit.isPending ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <View style={styles.submitIcon}>
                  <Upload size={15} color={colors.surface} />
                </View>
              )}
              <Text style={styles.submitText}>
                {submit.isPending ? "Submitting..." : "Submit Deal"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={categoryOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setCategoryOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close category picker"
          style={styles.modalOverlay}
          onPress={() => setCategoryOpen(false)}
        >
          <View
            accessibilityViewIsModal
            style={styles.modalCard}
            onStartShouldSetResponder={() => true}
          >
            <Text accessibilityRole="header" style={styles.modalTitle}>
              Select category
            </Text>
            <ScrollView
              style={styles.categoryList}
              contentContainerStyle={{ gap: 6 }}
            >
              {categories.data?.map((category) => {
                const selected = category.id === categoryId;
                return (
                  <Pressable
                    key={category.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      setCategoryId(category.id);
                      setCategoryOpen(false);
                    }}
                    style={[
                      styles.categoryOption,
                      selected && styles.categoryOptionSelected,
                    ]}
                  >
                    <Text style={styles.categoryOptionText}>
                      {category.name}
                    </Text>
                    {selected ? <Check size={17} color={colors.text} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </PageSurface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 16,
  },
  signedOut: { alignItems: "center", gap: 14, paddingVertical: 24 },
  signedOutTitle: { fontSize: 24, fontWeight: "700" },
  signedOutCopy: { color: colors.muted, textAlign: "center" },
  firstSection: { marginTop: 4 },
  panel: {
    padding: 16,
    gap: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.68)",
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    backgroundColor: "rgba(255,255,255,0.76)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    letterSpacing: -0.36,
  },
  fieldCard: {
    minWidth: 0,
    padding: 16,
    gap: 11,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.82)",
    backgroundColor: "rgba(248,250,252,0.86)",
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fieldLabelGroup: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  labelMeta: { fontSize: 11, lineHeight: 16, color: colors.muted },
  input: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(203,213,225,0.8)",
    borderRadius: 16,
    backgroundColor: "rgba(241,245,249,0.94)",
    color: colors.text,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  inputWithPrefix: { paddingLeft: 34 },
  inputPrefix: {
    position: "absolute",
    left: 14,
    top: 11,
    zIndex: 1,
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  textarea: { minHeight: 112, paddingTop: 12 },
  invalid: { borderColor: colors.danger, backgroundColor: "#fffafa" },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  select: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.62)",
    borderRadius: 16,
    backgroundColor: "rgba(241,245,249,0.94)",
  },
  selectText: { flex: 1, fontSize: 16 },
  placeholder: { flex: 1, color: "#64748b", fontSize: 16 },
  actions: { alignItems: "stretch" },
  submit: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: colors.button,
  },
  submitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: colors.surface, fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.7 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
    backgroundColor: "rgba(15,23,42,0.36)",
  },
  modalCard: {
    maxHeight: "70%",
    padding: 18,
    gap: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
    backgroundColor: "rgba(255,255,255,0.98)",
  },
  modalTitle: { fontSize: 19, lineHeight: 25, fontWeight: "600" },
  categoryList: { flexGrow: 0 },
  categoryOption: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  categoryOptionSelected: { backgroundColor: "#f4f4f5" },
  categoryOptionText: { flex: 1, fontSize: 15, fontWeight: "500" },
});
