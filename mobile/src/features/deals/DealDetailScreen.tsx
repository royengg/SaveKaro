import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Deal, PriceHistoryPoint } from "@savekaro/contracts";
import { ActivityIndicator, Alert, Image, Share, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { api } from "../../lib/api";
import {
  Button,
  Card,
  ErrorState,
  Heading,
  Screen,
  Text,
} from "../../components/ui";
import { formatPrice } from "../../components/DealCard";
import PriceHistory from "../../components/PriceHistory";
import { useAuth } from "../../providers/AuthProvider";
import { useCart } from "../account/CartProvider";
import CommentsSection from "../community/CommentsSection";

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const cart = useCart();
  const client = useQueryClient();
  const history = useQuery({
    queryKey: ["price-history", id],
    queryFn: ({ signal }) =>
      api.request<PriceHistoryPoint[]>(
        `/deals/${encodeURIComponent(id)}/price-history?limit=30`,
        { signal, authenticated: false },
      ),
    enabled: !!id,
  });
  const query = useQuery({
    queryKey: ["deal", id, user?.id],
    queryFn: ({ signal }) =>
      api.request<Deal>(`/deals/${encodeURIComponent(id)}`, { signal }),
    enabled: !!id,
  });
  const action = useMutation({
    mutationFn: ({
      path,
      body,
      method = "POST",
    }: {
      path: string;
      body: unknown;
      method?: "POST" | "PUT";
    }) => api.request(`/deals/${id}/${path}`, { method, body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["deal", id] });
      void client.invalidateQueries({ queryKey: ["deals"] });
      void client.invalidateQueries({ queryKey: ["saved"] });
    },
    onError: (error) => Alert.alert("Could not update deal", error.message),
  });
  if (query.isPending) return <ActivityIndicator style={{ margin: 40 }} />;
  if (!query.data)
    return (
      <Screen>
        <ErrorState retry={() => void query.refetch()} />
      </Screen>
    );
  const deal = query.data;
  function mutate(
    path: string,
    body: unknown,
    method: "POST" | "PUT" = "POST",
  ) {
    if (!user) {
      Alert.alert("Sign in required", "Sign in from Settings to continue.");
      return;
    }
    action.mutate({ path, body, method });
  }
  async function visit() {
    const url = deal.affiliateUrl || deal.productUrl;
    if (!/^https?:\/\//i.test(url)) {
      Alert.alert("Store link unavailable");
      return;
    }
    void api
      .request(`/deals/${id}/click`, { method: "POST", authenticated: false })
      .catch(() => undefined);
    await WebBrowser.openBrowserAsync(url).catch(() =>
      Alert.alert("Could not open store"),
    );
  }
  return (
    <Screen>
      {deal.imageUrl && (
        <Image
          source={{ uri: deal.imageUrl }}
          style={{ height: 260, borderRadius: 24, backgroundColor: "white" }}
          resizeMode="contain"
        />
      )}
      <Heading>{deal.cleanTitle || deal.title}</Heading>
      <Card>
        <Text>
          {deal.store} · {new Date(deal.createdAt).toLocaleDateString()}
        </Text>
        <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: "700" }}>
          {formatPrice(deal.dealPrice, deal.currency) || "View offer"}
        </Text>
        {deal.originalPrice && (
          <Text style={{ textDecorationLine: "line-through" }}>
            {formatPrice(deal.originalPrice, deal.currency)}
          </Text>
        )}
        {deal.discountPercent != null && (
          <Text>{deal.discountPercent}% off</Text>
        )}
        <Button title="Visit store" onPress={() => void visit()} />
        <Text>
          Purchases happen on the merchant website. Some links may earn us a
          commission.
        </Text>
      </Card>
      <View style={{ gap: 10 }}>
        <Button
          title={deal.userSaved ? "Unsave deal" : "Save deal"}
          secondary
          disabled={action.isPending}
          onPress={() => mutate("saved", { saved: !deal.userSaved }, "PUT")}
        />
        <Button
          title={`Upvote · ${deal.upvoteCount}`}
          secondary
          disabled={action.isPending}
          onPress={() =>
            mutate("vote", { value: deal.userUpvote === 1 ? 0 : 1 })
          }
        />
        <Button
          title={deal.userUpvote === -1 ? "Remove downvote" : "Downvote"}
          secondary
          disabled={action.isPending}
          onPress={() =>
            mutate("vote", { value: deal.userUpvote === -1 ? 0 : -1 })
          }
        />
        <Button title="Add to cart" secondary onPress={() => cart.add(deal)} />
        <Button
          title="Share deal"
          secondary
          onPress={() =>
            void Share.share({
              message: `${deal.cleanTitle || deal.title}\nhttps://savekaro.online/deal/${deal.id}`,
            })
          }
        />
      </View>
      {deal.description && (
        <Card>
          <Text>{deal.description}</Text>
        </Card>
      )}
      {history.data?.length ? (
        <Card>
          <PriceHistory points={history.data} currency={deal.currency} />
        </Card>
      ) : null}
      <CommentsSection dealId={id} />
    </Screen>
  );
}
