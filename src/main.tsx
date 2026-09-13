import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./ui/theme.css";
// Depois do tema de propósito: é a folha que decide a forma deitada.
import "./ui/landscape.css";
import "./render/loadMapArt";
import "./world/selftest";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
