import { useState, type ComponentProps } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAlertSchema } from "@savekaro/contracts";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  Banknote,
  Bell,
  Check,
  Globe,
  Link2,
  Plus,
  Search,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  type LucideIcon,
} from "lucide-react-native";
import {
  Button,
  ErrorState,
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

const REGION_OPTIONS: ReadonlyArray<{
  value: PriceAlert["region"];
  label: string;
}> = [
  { value: null, label: "Any region" },
  { value: "INDIA", label: "🇮🇳 India" },
  { value: "CANADA", label: "🇨🇦 Canada" },
  { value: "WORLD", label: "🌍 World" },
];

type EditorInputProps = Pick<
  ComponentProps<typeof TextInput>,
  | "autoCapitalize"
  | "autoCorrect"
  | "keyboardType"
  | "onChangeText"
  | "placeholder"
  | "value"
>;

function EditorInput({
  label,
  required = false,
  helper,
  icon: Icon,
  ...inputProps
}: EditorInputProps & {
  label: string;
  required?: boolean;
  helper?: string;
  icon: LucideIcon;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={styles.inputFrame}>
        <Icon size={16} color={colors.muted} />
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          placeholderTextColor="#929292"
          style={styles.input}
        />
      </View>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

function EditorSelect({
  label,
  icon: Icon,
  value,
  expanded,
  disabled,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  expanded: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.inputFrame,
          pressed && styles.inputFramePressed,
          disabled && styles.disabled,
        ]}
      >
        <Icon size={16} color={colors.muted} />
        <Text numberOfLines={1} style={styles.selectValue}>
          {value}
        </Text>
      </Pressable>
    </View>
  );
}

export default function AlertsScreen() {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ["alerts", user?.id];
  const [editor, setEditor] = useState<PriceAlert | "new" | null>(null);
  const [mode, setMode] = useState<"KEYWORD" | "URL">("KEYWORD");
  const [keywords, setKeywords] = useState("");
  const [watchUrl, setWatchUrl] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [region, setRegion] = useState<PriceAlert["region"]>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [picker, setPicker] = useState<"category" | "region" | null>(null);
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
      setPicker(null);
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
    setPicker(null);
    setFormError("");
    setMode(alert === "new" ? "KEYWORD" : alert.mode);
    setKeywords(alert === "new" ? "" : alert.keywords);
    setWatchUrl(alert === "new" ? "" : (alert.watchUrl ?? ""));
    setMaxPrice(alert === "new" ? "" : (alert.maxPrice ?? ""));
    setRegion(alert === "new" ? null : alert.region);
    setCategoryId(alert === "new" ? null : alert.categoryId);
  }
  function save() {
    const parsed = createAlertSchema.safeParse({
      mode,
      keywords: mode === "KEYWORD" ? keywords.trim() : undefined,
      watchUrl: mode === "URL" ? watchUrl.trim() : undefined,
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
  const selectedCategory = categories.data?.find(
    (category) => category.id === categoryId,
  );
  const selectedRegion = REGION_OPTIONS.find(
    (option) => option.value === region,
  );
  const pickerOptions =
    picker === "category"
      ? [
          { value: null, label: "Any category" },
          ...(categories.data ?? []).map((category) => ({
            value: category.id,
            label: category.name,
          })),
        ]
      : REGION_OPTIONS;
  const requiredValue = mode === "KEYWORD" ? keywords : watchUrl;

  return (
    <>
      <Screen>
        <PageBackButton />
        <Heading
          icon={Bell}
          action={
            <Pressable
              accessibilityRole="button"
              disabled={mutation.isPending}
              onPress={() => (editor === "new" ? setEditor(null) : edit("new"))}
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
          <View style={styles.editorCard}>
            <Text accessibilityRole="header" style={styles.editorTitle}>
              {editor === "new" ? "Create Alert" : "Edit Alert"}
            </Text>

            <View accessibilityRole="radiogroup" style={styles.modePicker}>
              {(["KEYWORD", "URL"] as const).map((item) => {
                const selected = mode === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    disabled={mutation.isPending}
                    onPress={() => setMode(item)}
                    style={[styles.modeOption, selected && styles.modeSelected]}
                  >
                    <Text
                      style={[
                        styles.modeLabel,
                        !selected && styles.modeLabelInactive,
                      ]}
                    >
                      {item === "KEYWORD" ? "Keyword" : "Product URL"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <EditorInput
              label={mode === "URL" ? "Product URL" : "Keywords"}
              required
              icon={mode === "URL" ? Link2 : Search}
              value={requiredValue}
              onChangeText={mode === "KEYWORD" ? setKeywords : setWatchUrl}
              autoCapitalize={mode === "URL" ? "none" : "sentences"}
              autoCorrect={mode !== "URL"}
              keyboardType={mode === "URL" ? "url" : "default"}
              placeholder={
                mode === "URL"
                  ? "https://www.amazon.in/dp/..."
                  : 'e.g. "PS5", "iPhone 15 Pro", "Nike shoes"'
              }
              helper={
                mode === "URL"
                  ? "Paste a specific HTTPS product link. SaveKaro will watch that item for future matching deals."
                  : "All keywords must appear in the deal title or description"
              }
            />

            <View style={styles.filterFields}>
              <EditorInput
                label="Max Price (optional)"
                icon={Banknote}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="decimal-pad"
                placeholder="e.g. 40000"
              />

              {mode === "KEYWORD" ? (
                <EditorSelect
                  label="Category (optional)"
                  icon={Tag}
                  value={selectedCategory?.name ?? "Any category"}
                  expanded={picker === "category"}
                  disabled={categories.isPending || mutation.isPending}
                  onPress={() => setPicker("category")}
                />
              ) : null}

              <EditorSelect
                label="Region (optional)"
                icon={Globe}
                value={selectedRegion?.label ?? "Any region"}
                expanded={picker === "region"}
                disabled={mutation.isPending}
                onPress={() => setPicker("region")}
              />
            </View>

            {formError ? (
              <Text accessibilityRole="alert" style={styles.formError}>
                {formError}
              </Text>
            ) : null}

            <View style={styles.formActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled: mutation.isPending || !requiredValue.trim(),
                }}
                disabled={mutation.isPending || !requiredValue.trim()}
                onPress={save}
                style={[
                  styles.primaryAction,
                  (mutation.isPending || !requiredValue.trim()) &&
                    styles.disabled,
                ]}
              >
                {mutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.primaryActionText}>
                    {editor === "new" ? "Create Alert" : "Save alert"}
                  </Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: mutation.isPending }}
                disabled={mutation.isPending}
                onPress={() => {
                  setEditor(null);
                  setPicker(null);
                }}
                style={[
                  styles.secondaryAction,
                  mutation.isPending && styles.disabled,
                ]}
              >
                <Text style={styles.secondaryActionText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : null}
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
              <Text style={[styles.meta, styles.usage]}>
                {query.data.length} / 10 alerts used
              </Text>
            ) : null}
          </View>
        )}
      </Screen>
      <Modal
        visible={picker !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPicker(null)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close option picker"
          style={styles.modalOverlay}
          onPress={() => setPicker(null)}
        >
          <View
            accessibilityViewIsModal
            style={styles.modalCard}
            onStartShouldSetResponder={() => true}
          >
            <Text accessibilityRole="header" style={styles.modalTitle}>
              {picker === "category" ? "Select category" : "Select region"}
            </Text>
            <ScrollView
              style={styles.optionList}
              contentContainerStyle={styles.optionListContent}
            >
              {pickerOptions.map((option) => {
                const selected =
                  picker === "category"
                    ? categoryId === option.value
                    : region === option.value;
                return (
                  <Pressable
                    key={option.value ?? "any"}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      if (picker === "category") {
                        setCategoryId(option.value);
                      } else {
                        setRegion(option.value as PriceAlert["region"]);
                      }
                      setPicker(null);
                    }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {selected ? <Check size={17} color={colors.text} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
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
  editorCard: {
    marginTop: 8,
    padding: 20,
    gap: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  editorTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "600",
  },
  modePicker: {
    alignSelf: "flex-start",
    flexDirection: "row",
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: "rgba(244,244,245,0.4)",
  },
  modeOption: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modeSelected: {
    backgroundColor: colors.surface,
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
  },
  modeLabel: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  modeLabelInactive: { color: colors.muted },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  required: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  inputFrame: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  inputFramePressed: { borderColor: "#b5b5b5" },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 22,
  },
  selectValue: { flex: 1, fontSize: 16, lineHeight: 22 },
  helper: {
    marginTop: -2,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  filterFields: { gap: 12 },
  formError: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  formActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
  },
  primaryAction: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  primaryActionText: { color: "white", fontWeight: "500" },
  secondaryAction: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f4f4f5",
  },
  secondaryActionText: { fontWeight: "500" },
  disabled: { opacity: 0.5 },
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
  usage: { textAlign: "center", paddingTop: 8 },
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
    boxShadow: "0 24px 48px -28px rgba(15,23,42,0.45)",
  },
  modalTitle: { fontSize: 19, lineHeight: 25, fontWeight: "600" },
  optionList: { flexGrow: 0 },
  optionListContent: { gap: 6 },
  option: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  optionSelected: { backgroundColor: "#f4f4f5" },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
});
