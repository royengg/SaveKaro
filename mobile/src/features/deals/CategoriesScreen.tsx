import { useQuery } from "@tanstack/react-query";
import type { Category } from "@savekaro/contracts";
import { router } from "expo-router";
import { ActivityIndicator } from "react-native";
import { api } from "../../lib/api";
import {
  Button,
  Card,
  ErrorState,
  Heading,
  Screen,
  Text,
} from "../../components/ui";

export default function CategoriesScreen() {
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) =>
      api.request<Category[]>("/categories", { signal, authenticated: false }),
  });
  return (
    <Screen>
      <Heading>Browse categories</Heading>
      {categories.isPending ? (
        <ActivityIndicator />
      ) : categories.isError ? (
        <ErrorState retry={() => void categories.refetch()} />
      ) : (
        categories.data.map((category) => (
          <Card key={category.id}>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 20, fontWeight: "600" }}
            >
              {category.name}
            </Text>
            <Text>{category.dealCount} deals</Text>
            <Button
              title={`Browse ${category.name}`}
              secondary
              onPress={() =>
                router.push({
                  pathname: "/(tabs)",
                  params: { category: category.slug },
                })
              }
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
