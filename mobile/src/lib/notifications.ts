import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";

const installationKey = "savekaro:push-installation";
let installationPromise: Promise<string> | null = null;

async function getInstallationId() {
  installationPromise ??= (async () => {
    const stored = await AsyncStorage.getItem(installationKey);
    if (stored) return stored;
    const id = randomUUID();
    await AsyncStorage.setItem(installationKey, id);
    return id;
  })().catch((error: unknown) => {
    installationPromise = null;
    throw error;
  });
  return installationPromise;
}

export async function registerPushNotifications(requestPermission = true) {
  if (Platform.OS !== "android" && Platform.OS !== "ios")
    throw new Error("Push notifications require the Android or iOS app.");
  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== "string" || !projectId)
    throw new Error(
      "Push notifications are not configured for this build yet.",
    );
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("deals", {
      name: "Deal alerts",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    if (!requestPermission) return;
    throw new Error(
      "Allow notifications in your device settings to receive deal alerts.",
    );
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.request("/push-installations", {
    method: "PUT",
    body: {
      expoPushToken: token.data,
      deviceId: await getInstallationId(),
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version,
    },
  });
}

export async function unregisterPushNotifications() {
  const deviceId = await AsyncStorage.getItem(installationKey);
  if (deviceId)
    await api.request(`/push-installations/${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
    });
}

export function dealIdFromNotification(
  response: Notifications.NotificationResponse,
) {
  const dealId: unknown = response.notification.request.content.data?.dealId;
  return typeof dealId === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(dealId)
    ? dealId
    : null;
}
