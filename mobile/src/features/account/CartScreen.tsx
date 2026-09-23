import { router } from "expo-router";
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCart } from "./CartProvider";

export default function CartScreen() {
  const { items, remove, clear } = useCart();
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(deal) => deal.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Your Cart
          </Text>
          {items.length ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Alert.alert(
                  "Clear your cart?",
                  "This removes every deal from this device's cart.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Clear cart",
                      style: "destructive",
                      onPress: clear,
                    },
                  ],
                )
              }
            >
              <Text style={styles.action}>Clear cart</Text>
            </Pressable>
          ) : null}
        </View>
      }
      ListEmptyComponent={<Text>Your cart is empty.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: "/deal/[id]", params: { id: item.id } })
            }
          >
            <Text style={styles.name}>{item.cleanTitle || item.title}</Text>
          </Pressable>
          <Text>{item.store}</Text>
          {item.dealPrice ? (
            <Text style={styles.price}>
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: item.currency || "INR",
              }).format(Number(item.dealPrice))}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                const url = item.affiliateUrl || item.productUrl;
                if (!/^https:\/\//i.test(url))
                  return Alert.alert("Store link unavailable");
                void Linking.openURL(url).catch(() =>
                  Alert.alert("Could not open store"),
                );
              }}
            >
              <Text style={styles.action}>Visit Store</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.title} from cart`}
              onPress={() => remove(item.id)}
            >
              <Text style={styles.action}>Remove</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fffafb" },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  header: { gap: 8 },
  title: { fontSize: 28, fontWeight: "700", color: "#171717" },
  card: {
    padding: 18,
    gap: 10,
    borderRadius: 22,
    backgroundColor: "white",
    borderColor: "#ece7e9",
    borderWidth: 1,
  },
  name: { fontSize: 18, fontWeight: "600", color: "#171717" },
  price: { fontSize: 20, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 20 },
  action: { paddingVertical: 12, color: "#bb001e", fontWeight: "600" },
});
