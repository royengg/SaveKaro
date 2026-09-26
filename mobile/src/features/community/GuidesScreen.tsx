import { guides, type Guide } from "@savekaro/content";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CirclePlay } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { GuideMotionId } from "@savekaro/motion/guide-data";
import { PageBackButton, Text } from "../../components/ui";
import SiteFooter from "../../components/SiteFooter";
import MotionPlayerFrame from "../../components/motion/MotionPlayerFrame";
import { colors } from "../../theme";

const LAST_UPDATED = "March 30, 2026";
const PAGE_SUMMARY =
  "A small set of practical guides for people who want to judge deals better, compare stores more clearly, and avoid getting distracted by flashy discount labels.";
const INTRO =
  "These are not daily articles or filler posts. They are simple, permanent guides meant to answer the questions that come up again and again when you are trying to decide whether a deal is actually worth your money.";

const LIST_SUMMARIES: Record<Guide["slug"], string> = {
  "how-to-tell-if-a-discount-is-actually-good":
    "A straightforward way to judge whether a discounted price is genuinely strong or just dressed up to look better than it is.",
  "how-to-compare-coupons-bank-offers-and-cashback":
    "A practical way to compare stacked checkout offers without losing sight of the real payable price.",
  "best-fashion-deal-stores-in-india":
    "A practical look at the stores that are usually worth checking for clothing, shoes, accessories, and sale-season fashion drops.",
};

const QUICK_LINKS: Array<{ slug: Guide["slug"] | null; label: string }> = [
  { slug: null, label: "Guides" },
  {
    slug: "how-to-tell-if-a-discount-is-actually-good",
    label: "Discount Quality",
  },
  {
    slug: "how-to-compare-coupons-bank-offers-and-cashback",
    label: "Offers and Cashback",
  },
  { slug: "best-fashion-deal-stores-in-india", label: "Fashion Stores" },
];

const GUIDE_MOTION_IDS: Record<Guide["slug"], GuideMotionId> = {
  "how-to-tell-if-a-discount-is-actually-good": "discount-quality",
  "how-to-compare-coupons-bank-offers-and-cashback": "offers-and-cashback",
  "best-fashion-deal-stores-in-india": "fashion-stores",
};

function LocalBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      hitSlop={6}
      style={styles.back}
    >
      <ArrowLeft size={14} color={colors.muted} />
      <Text style={styles.backText}>Back</Text>
    </Pressable>
  );
}

function QuickLinks({
  active,
  onSelect,
}: {
  active: Guide["slug"] | null;
  onSelect: (slug: Guide["slug"] | null) => void;
}) {
  const links = active ? QUICK_LINKS : QUICK_LINKS.slice(0, 1);

  return (
    <View style={styles.quickLinksFrame}>
      <View style={styles.quickLinks}>
        {links.map((link) => (
          <Pressable
            key={link.label}
            accessibilityRole="link"
            accessibilityState={{ selected: active === link.slug }}
            onPress={() => onSelect(link.slug)}
            style={[
              styles.quickLink,
              active === link.slug && styles.activeQuickLink,
            ]}
          >
            <Text style={styles.quickLinkText}>{link.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function PageHeader({ title, summary }: { title: string; summary: string }) {
  return (
    <View style={styles.pageHeader}>
      <Text style={styles.eyebrow}>GUIDES</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.summary}>{summary}</Text>
      <Text style={styles.updated}>
        LAST UPDATED: {LAST_UPDATED.toUpperCase()}
      </Text>
    </View>
  );
}

function MotionSummary({ guideId }: { guideId: GuideMotionId }) {
  return (
    <View style={styles.motionCard}>
      <View style={styles.motionBadge}>
        <CirclePlay size={16} color="#3f3f46" />
        <Text style={styles.motionBadgeText}>Motion summary</Text>
      </View>
      <Text style={styles.motionTitle}>Watch the quick version</Text>
      <MotionPlayerFrame
        kind="guide"
        guideId={guideId}
        style={styles.motionPreview}
      />
    </View>
  );
}

export default function GuidesScreen() {
  const [slug, setSlug] = useState<Guide["slug"] | null>(null);
  const guide = guides.find((entry) => entry.slug === slug);

  return (
    <View style={styles.page}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {guide ? (
          <LocalBackButton onPress={() => setSlug(null)} />
        ) : (
          <PageBackButton />
        )}

        <View style={styles.shell}>
          <QuickLinks active={slug} onSelect={setSlug} />
          {guide ? (
            <>
              <PageHeader title={guide.title} summary={guide.summary} />
              <View style={styles.body}>
                <MotionSummary guideId={GUIDE_MOTION_IDS[guide.slug]} />
                {guide.sections.map((section) => (
                  <View key={section.title} style={styles.section}>
                    <Text
                      accessibilityRole="header"
                      style={styles.sectionTitle}
                    >
                      {section.title}
                    </Text>
                    <Text style={styles.bodyText}>{section.body}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <PageHeader title="SaveKaro Guides" summary={PAGE_SUMMARY} />
              <View style={styles.body}>
                <View style={styles.section}>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>
                    Start here
                  </Text>
                  <Text style={styles.bodyText}>{INTRO}</Text>
                </View>
                <View style={styles.guideList}>
                  {guides.map((entry, index) => (
                    <Pressable
                      key={entry.slug}
                      accessibilityRole="link"
                      accessibilityLabel={entry.title}
                      style={styles.guideCard}
                      onPress={() => setSlug(entry.slug)}
                    >
                      <View style={styles.guideMain}>
                        <View style={styles.guideNumber}>
                          <Text style={styles.guideNumberText}>
                            {index + 1}
                          </Text>
                        </View>
                        <Text style={styles.guideTitle}>{entry.title}</Text>
                        <Text style={styles.guideSummary}>
                          {LIST_SUMMARIES[entry.slug]}
                        </Text>
                      </View>
                      <View style={styles.guideArrow}>
                        <ArrowRight size={16} color="#52525b" />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
        <SiteFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: "transparent" },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 24,
  },
  shell: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 20,
  },
  quickLinksFrame: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quickLinks: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickLink: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fafafa",
  },
  activeQuickLink: { backgroundColor: "#fafafa" },
  quickLinkText: { color: "#3f3f46", fontSize: 14, fontWeight: "500" },
  pageHeader: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 2.86,
  },
  title: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "700",
    letterSpacing: -0.72,
  },
  summary: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  updated: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.6,
  },
  body: { paddingTop: 29, gap: 28 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  bodyText: { color: "#27272a", fontSize: 14, lineHeight: 22.75 },
  guideList: { gap: 12 },
  guideCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  guideMain: { flex: 1, minWidth: 0, gap: 8 },
  guideNumber: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#f4f4f5",
  },
  guideNumberText: { color: "#3f3f46", fontSize: 16, fontWeight: "600" },
  guideTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    letterSpacing: -0.36,
  },
  guideSummary: { color: colors.muted, fontSize: 14, lineHeight: 22.75 },
  guideArrow: {
    width: 40,
    height: 40,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  back: {
    alignSelf: "flex-start",
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.78)",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  backText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  motionCard: {
    gap: 8,
    padding: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fcfaf7",
  },
  motionBadge: {
    alignSelf: "flex-start",
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#f4f4f5",
  },
  motionBadgeText: { color: "#3f3f46", fontSize: 14, fontWeight: "500" },
  motionTitle: { fontSize: 17, lineHeight: 23, fontWeight: "600" },
  motionPreview: {
    marginTop: 8,
    borderRadius: 28,
  },
});
