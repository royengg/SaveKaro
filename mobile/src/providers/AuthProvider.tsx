import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useIsRestoring } from "@tanstack/react-query";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { ActivityIndicator } from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { User, MobileSession } from "@savekaro/contracts";
import { api, setAccessToken, setRefreshHandler } from "../lib/api";
import { isExpoGo, nativeFeatureMessage } from "../lib/runtime";
import {
  clearPrivateReadCache,
  clearReadCache,
  queryClient,
} from "./QueryProvider";
import {
  registerPushNotifications,
  unregisterPushNotifications,
} from "../lib/notifications";

const refreshKey = "savekaro-refresh";
const identityKey = "savekaro-identity";
function googleSignInModule(): typeof import("@react-native-google-signin/google-signin") {
  if (isExpoGo) throw new Error(nativeFeatureMessage);
  return require("@react-native-google-signin/google-signin");
}
interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signInGoogle: () => Promise<void>;
  signInApple: () => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}

export default function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const sessionGeneration = useRef(0);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const isRestoring = useIsRestoring();
  const serializeWrite = useCallback((write: () => Promise<void>) => {
    const operation = writes.current.then(write, write);
    writes.current = operation.catch(() => undefined);
    return operation;
  }, []);
  useEffect(() => {
    if (!isLoading && user?.preferences?.pushNotifications)
      void registerPushNotifications(false).catch(() => undefined);
  }, [isLoading, user?.id, user?.preferences?.pushNotifications]);
  const clearSession = useCallback(async () => {
    sessionGeneration.current += 1;
    setAccessToken(null);
    setUser(null);
    await serializeWrite(async () => {
      await Promise.all([
        SecureStore.deleteItemAsync(refreshKey),
        AsyncStorage.removeItem(identityKey),
        clearReadCache(),
      ]);
    });
  }, [serializeWrite]);
  const acceptSession = useCallback(
    async (session: MobileSession) => {
      const generation = sessionGeneration.current;
      await serializeWrite(async () => {
        if (generation !== sessionGeneration.current) return;
        if (session.refreshToken)
          await SecureStore.setItemAsync(refreshKey, session.refreshToken);
        await AsyncStorage.setItem(identityKey, JSON.stringify(session.user));
        if (generation !== sessionGeneration.current) return;
        setAccessToken(session.accessToken, session.expiresIn);
        setUser(session.user);
      });
    },
    [serializeWrite],
  );
  useEffect(() => {
    if (isRestoring) return;
    if (isExpoGo) {
      setAccessToken(null);
      setRefreshHandler(async () => null);
      setUser(null);
      void clearPrivateReadCache()
        .catch(() => undefined)
        .finally(() => setLoading(false));
      return;
    }
    const { GoogleSignin } = googleSignInModule();
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
    let pending: Promise<string | null> | null = null;
    const refresh = () => {
      if (pending) return pending;
      pending = (async () => {
        const generation = sessionGeneration.current;
        const refreshToken = await SecureStore.getItemAsync(refreshKey);
        if (!refreshToken) return null;
        try {
          const session = await api.request<MobileSession>(
            "/mobile-auth/refresh",
            { method: "POST", body: { refreshToken }, authenticated: false },
          );
          if (generation !== sessionGeneration.current) return null;
          await acceptSession(session);
          return generation === sessionGeneration.current
            ? session.accessToken
            : null;
        } catch (error) {
          // Preserve cached identity on transient network errors for offline reading.
          if (
            generation === sessionGeneration.current &&
            typeof error === "object" &&
            error &&
            "status" in error &&
            (error.status === 401 || error.status === 403)
          ) {
            await clearSession();
            return null;
          }
          // A temporary failure must not turn an authenticated request into an
          // anonymous one and overwrite its cached saved/vote state.
          throw error;
        }
      })().finally(() => {
        pending = null;
      });
      return pending;
    };
    setRefreshHandler(refresh);
    let wasOffline = false;
    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected !== false && state.isInternetReachable !== false;
      if (online && wasOffline)
        void refresh()
          .then((token) => {
            if (token) void queryClient.invalidateQueries();
          })
          .catch(() => undefined);
      wasOffline = !online;
    });
    void (async () => {
      try {
        const saved = await AsyncStorage.getItem(identityKey);
        const token = await SecureStore.getItemAsync(refreshKey);
        if (saved && token) {
          const identity: unknown = JSON.parse(saved);
          if (
            !identity ||
            typeof identity !== "object" ||
            !("id" in identity) ||
            typeof identity.id !== "string" ||
            !("email" in identity) ||
            typeof identity.email !== "string"
          )
            throw new Error("Invalid cached identity");
          setUser(identity as User);
        } else await clearPrivateReadCache();
        const network = await NetInfo.fetch().catch(() => null);
        if (
          network &&
          network.isConnected !== false &&
          network.isInternetReachable !== false
        )
          await refresh().catch(() => undefined);
      } catch {
        await clearSession();
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      unsubscribeNetwork();
      setRefreshHandler(async () => null);
    };
  }, [acceptSession, clearSession, isRestoring]);
  async function signInGoogle() {
    const { GoogleSignin, isSuccessResponse } = googleSignInModule();
    if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)
      throw new Error("Google sign-in is not configured for this build.");
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    if (!isSuccessResponse(result)) return;
    if (!result.data.idToken)
      throw new Error("Google did not return an identity token.");
    const session = await api.request<MobileSession>("/mobile-auth/google", {
      method: "POST",
      body: { idToken: result.data.idToken },
      authenticated: false,
    });
    sessionGeneration.current += 1;
    await clearReadCache();
    await acceptSession(session);
  }
  async function signInApple() {
    if (isExpoGo) throw new Error(nativeFeatureMessage);
    const nonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonce,
    );
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken)
      throw new Error("Apple did not return an identity token.");
    const session = await api.request<MobileSession>("/mobile-auth/apple", {
      method: "POST",
      body: {
        idToken: credential.identityToken,
        nonce,
        name: credential.fullName
          ? [credential.fullName.givenName, credential.fullName.familyName]
              .filter(Boolean)
              .join(" ")
          : undefined,
      },
      authenticated: false,
    });
    sessionGeneration.current += 1;
    await clearReadCache();
    await acceptSession(session);
  }
  async function signOut() {
    if (isExpoGo) return;
    let remoteError: unknown;
    try {
      // Try both independently: push deregistration failure must not prevent
      // revoking the session, and neither failure should prevent local logout.
      const results = await Promise.allSettled([
        unregisterPushNotifications(),
        (async () => {
          const refreshToken = await SecureStore.getItemAsync(refreshKey);
          if (refreshToken)
            await api.request("/mobile-auth/logout", {
              method: "POST",
              body: { refreshToken },
              authenticated: false,
            });
        })(),
      ]);
      remoteError = results.find((result) => result.status === "rejected");
    } catch (error) {
      remoteError = error;
    } finally {
      await clearSession();
      await googleSignInModule()
        .GoogleSignin.signOut()
        .catch(() => undefined);
    }
    if (remoteError)
      throw new Error(
        "You are signed out on this device. The server could not confirm session or notification cleanup; sign in again when online to manage your account.",
      );
  }
  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  return (
    <AuthContext.Provider
      value={{ user, isLoading, signInGoogle, signInApple, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
