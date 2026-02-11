/**
 * Entry point. Envuelve la app con BrowserRouter.
 */

import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<p>Error: no se encontró el elemento #root</p>";
} else {
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>
    );
  } catch (err) {
    rootEl.innerHTML = `<p><strong>Error al iniciar:</strong> ${err instanceof Error ? err.message : String(err)}</p>`;
  }
}
