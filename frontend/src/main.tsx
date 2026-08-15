import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PostHogProvider } from "@posthog/react";
import "./index.css";
import App from "./App.tsx";
import { preconnectCriticalOrigins } from "./lib/preconnect";
import {
  initializeAnalytics,
  posthog,
} from "./lib/analytics/posthog";

preconnectCriticalOrigins();
initializeAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <App />
    </PostHogProvider>
  </StrictMode>
);
