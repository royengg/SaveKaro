import Constants, { ExecutionEnvironment } from "expo-constants";

/** Expo Go cannot load the custom native modules included in our app builds. */
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const nativeFeatureMessage =
  "Sign-in and push notifications require a SaveKaro development build. You can browse public deals in this Expo Go preview.";
