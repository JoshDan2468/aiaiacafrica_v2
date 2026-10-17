import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// Let the app control scrolling instead of restoring the previous page's position.
window.history.scrollRestoration = "manual";
window.addEventListener("pageshow", () => {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
});

// Browser entry point: place the complete React application inside index.html's #root element.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
