import { router } from "expo-router";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../theme";

const links = [
  { title: "About", path: "/about" },
  { title: "Contact", path: "/contact" },
  { title: "Guides", path: "/guides" },
  { title: "How SaveKaro Works", path: "/how-savekaro-works" },
  { title: "How Deals Are Verified", path: "/how-savekaro-verifies-deals" },
  { title: "Privacy Policy", path: "/privacy-policy" },
  { title: "Terms & Conditions", path: "/terms-and-conditions" },
  { title: "Affiliate Disclosure", path: "/affiliate-disclosure" },
] as const;

function openPath(path: (typeof links)[number]["path"]) {
  if (path === "/guides") {
    router.push("/guides");
    return;
  }
  void Linking.openURL(`https://savekaro.online${path}`).catch(() =>
    Alert.alert("Could not open page"),
  );
}

export default function SiteFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.links}>
        {links.map(({ title, path }) => (
          <Pressable
            key={path}
            accessibilityRole="link"
            onPress={() => openPath(path)}
            style={styles.link}
          >
            <Text style={styles.linkText}>{title}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.disclaimer}>
        SaveKaro is an independent deal discovery platform built and operated
        by Rudraksh Roy. We are not affiliated with, endorsed by, or connected
        to any retailer listed on this site. All trademarks belong to their
        respective owners.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: "center", gap: 16, marginTop: 48, paddingVertical: 28 },
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  link: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(244,244,245,0.42)",
  },
  linkText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  disclaimer: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
});
