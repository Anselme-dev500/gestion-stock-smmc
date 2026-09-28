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

// Browser translators/extensions sometimes wrap or remove text nodes.  That
// conflicts with React's DOM reconciliation and produces removeChild errors.
// This application is already French, so keep the root outside translation.
const root = document.getElementById("root")!;
root.setAttribute("translate", "no");
root.classList.add("notranslate");
ReactDOM.createRoot(root).render(<App />);
