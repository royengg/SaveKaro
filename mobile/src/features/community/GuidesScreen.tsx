import { guides } from "@savekaro/content";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function GuidesScreen() {
  const [slug, setSlug] = useState<string | null>(null);
  const guide = guides.find((entry) => entry.slug === slug);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {guide ? (
        <>
          <Pressable accessibilityRole="button" onPress={() => setSlug(null)}>
            <Text style={styles.back}>Back to guides</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            {guide.title}
          </Text>
          <Text style={styles.body}>{guide.summary}</Text>
          {guide.sections.map((section) => (
            <View key={section.title} style={styles.card}>
              <Text accessibilityRole="header" style={styles.heading}>
                {section.title}
              </Text>
              <Text style={styles.body}>{section.body}</Text>
            </View>
          ))}
        </>
      ) : (
        <>
          <Text accessibilityRole="header" style={styles.title}>
            SaveKaro Guides
          </Text>
          {guides.map((entry) => (
            <Pressable
              key={entry.slug}
              accessibilityRole="button"
              style={styles.card}
              onPress={() => setSlug(entry.slug)}
            >
              <Text style={styles.heading}>{entry.title}</Text>
              <Text style={styles.body}>{entry.summary}</Text>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fffafb" },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700", color: "#171717" },
  heading: { fontSize: 19, fontWeight: "600", color: "#171717" },
  body: { fontSize: 16, lineHeight: 24, color: "#45414a" },
  card: {
    padding: 18,
    gap: 10,
    borderRadius: 22,
    backgroundColor: "white",
    borderColor: "#ece7e9",
    borderWidth: 1,
  },
  back: { paddingVertical: 12, color: "#bb001e", fontWeight: "600" },
});
