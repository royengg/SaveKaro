import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import {
  dealIdFromNotification,
  registerPushNotifications,
} from "../lib/notifications";
import { useAuth } from "./AuthProvider";

export default function NotificationLinks() {
  const { user } = useAuth();
  useEffect(() => {
    function open(response: Notifications.NotificationResponse) {
      const id = dealIdFromNotification(response);
      if (id) router.push({ pathname: "/deal/[id]", params: { id } });
      else router.push("/notifications");
      void Notifications.clearLastNotificationResponseAsync();
    }
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) open(response);
    });
    const subscription =
      Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const subscription = Notifications.addPushTokenListener(() => {
      if (user?.preferences?.pushNotifications)
        void registerPushNotifications(false).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [user?.id, user?.preferences?.pushNotifications]);
  return null;
}
