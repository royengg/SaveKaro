import { useEffect } from "react";
import { router } from "expo-router";
import type { NotificationResponse } from "expo-notifications";
import {
  dealIdFromNotification,
  registerPushNotifications,
  getNotifications,
} from "../lib/notifications";
import { useAuth } from "./AuthProvider";

export default function NotificationLinks() {
  const { user } = useAuth();
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications) return;
    function open(response: NotificationResponse) {
      const id = dealIdFromNotification(response);
      if (id) router.push({ pathname: "/deal/[id]", params: { id } });
      else router.push("/notifications");
      void Notifications?.clearLastNotificationResponseAsync();
    }
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) open(response);
    });
    const subscription =
      Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications) return;
    const subscription = Notifications.addPushTokenListener(() => {
      if (user?.preferences?.pushNotifications)
        void registerPushNotifications(false).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [user?.id, user?.preferences?.pushNotifications]);
  return null;
}
