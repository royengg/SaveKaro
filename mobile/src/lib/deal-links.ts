import type { Deal } from "@savekaro/contracts";
import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";
import { api } from "./api";

type DealLink = Pick<Deal, "id" | "affiliateUrl" | "productUrl">;

export async function openDealStore(deal: DealLink) {
  const url = deal.affiliateUrl || deal.productUrl;
  if (!/^https?:\/\//i.test(url)) {
    Alert.alert("Store link unavailable");
    return;
  }

  void api
    .request(`/deals/${encodeURIComponent(deal.id)}/click`, {
      method: "POST",
      authenticated: false,
    })
    .catch(() => undefined);
  await WebBrowser.openBrowserAsync(url).catch(() =>
    Alert.alert("Could not open store"),
  );
}
