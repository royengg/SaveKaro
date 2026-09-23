import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "SaveKaro",
  slug: "savekaro",
  scheme: "savekaro",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: "online.savekaro.app",
    supportsTablet: true,
    usesAppleSignIn: true,
    associatedDomains: ["applinks:savekaro.online"],
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: "online.savekaro.app",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        category: ["BROWSABLE", "DEFAULT"],
        data: [
          { scheme: "https", host: "savekaro.online", pathPrefix: "/deal/" },
        ],
      },
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-apple-authentication",
    "expo-notifications",
    ...(process.env.GOOGLE_IOS_URL_SCHEME
      ? [
          [
            "@react-native-google-signin/google-signin",
            { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME },
          ] as [string, { iosUrlScheme: string }],
        ]
      : []),
  ],
  extra: {
    eas: {
      projectId:
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
        "785bc7ee-814f-41bd-99b8-ca7197d51344",
    },
  },
};
export default config;
