import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { preconnectCriticalOrigins } from "./lib/preconnect";
import { initializeAnalytics } from "./lib/analytics/posthog";

preconnectCriticalOrigins();
initializeAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
