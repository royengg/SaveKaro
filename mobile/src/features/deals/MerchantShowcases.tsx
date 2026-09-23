import { useQuery } from "@tanstack/react-query";
import type { Deal } from "@savekaro/contracts";
import { ScrollView, View } from "react-native";
import { api } from "../../lib/api";
import DealCard from "../../components/DealCard";
import { Text } from "../../components/ui";

interface HomeData {
  amazonDeals: Deal[];
  myntraDeals: Deal[];
}
export default function MerchantShowcases({ region }: { region: string }) {
  const query = useQuery({
    queryKey: ["home", region],
    queryFn: ({ signal }) =>
      api.request<HomeData>(`/deals/home?region=${region}&limit=20`, {
        signal,
        authenticated: false,
      }),
  });
  if (!query.data) return null;
  return (
    <View style={{ gap: 20 }}>
      {[
        { title: "Amazon deals", deals: query.data.amazonDeals },
        { title: "Best Myntra deals", deals: query.data.myntraDeals },
      ]
        .filter((section) => section.deals.length)
        .map((section) => (
          <View key={section.title} style={{ gap: 12 }}>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 22, fontWeight: "700" }}
            >
              {section.title}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {section.deals.map((deal) => (
                <View key={deal.id} style={{ width: 260 }}>
                  <DealCard deal={deal} />
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
    </View>
  );
}
