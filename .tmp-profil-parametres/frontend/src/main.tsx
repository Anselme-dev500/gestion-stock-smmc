import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import "./assets/css/app.css";
import "./assets/css/layout.css";
import "./assets/css/smmc-theme.css";
import "./assets/css/stock-pages.css";
import "./assets/css/approvisionnement-pages.css";
import "./index.css";
import "./assets/css/demandes.css";
import "./assets/css/mouvement-pages.css";
import "./assets/css/inventaire.css";
import "./assets/css/ui-polish.css";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
try { const p=JSON.parse(localStorage.getItem("smmc_preferences")||"{}"); if(p.theme === "sombre") document.documentElement.dataset.theme="sombre"; } catch { /* préférences indisponibles */ }
