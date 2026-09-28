import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import { getAccessToken, getSessionUser, isAdminSession, logout } from "./services/auth";
import SuperAdminLogin from "./pages/admin/SuperAdminLogin";
import SuperAdminUsers from "./pages/admin/SuperAdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import Login from "./pages/auth/Login";
import ChefLayout from "./pages/chef/ChefLayout";

function ProtectedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const expired = () => navigate("/login", { replace: true, state: { from: location.pathname } });
    window.addEventListener("smmc-session-expired", expired);
    return () => window.removeEventListener("smmc-session-expired", expired);
  }, [navigate, location.pathname]);
  if (isAdminSession()) return <Navigate to="/super-admin" replace />;
  if (!getAccessToken()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (getSessionUser()?.role_stock === "chef_departement") {
    return <Navigate to="/chef" replace />;
  }
  return <AdminLayout />;
}

function ProtectedChefLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const expired = () => navigate("/login", { replace: true, state: { from: location.pathname } });
    window.addEventListener("smmc-session-expired", expired);
    return () => window.removeEventListener("smmc-session-expired", expired);
  }, [navigate, location.pathname]);
  if (!getAccessToken()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (getSessionUser()?.role_stock !== "chef_departement") return <Navigate to="/" replace />;
  return <ChefLayout />;
}

class ApplicationErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur de rendu SMMC", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f4f7f5" }}>
      <section style={{ maxWidth: 520, padding: 28, background: "#fff", borderRadius: 12, boxShadow: "0 8px 28px rgba(16, 24, 40, .12)" }}>
        <h1 style={{ marginTop: 0 }}>Impossible d’afficher la page</h1>
        <p>Une erreur inattendue est survenue après la connexion. Vous pouvez vous reconnecter puis réessayer.</p>
        <button onClick={() => { logout(); window.location.assign("/login"); }}>Retour à la connexion</button>
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "#fff0f1", color: "#9f1239", fontSize: 13 }}>
          <strong>Détail technique :</strong>
          <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{this.state.error.message || "Erreur React sans message."}</pre>
        </div>
      </section>
    </main>;
  }
}

import AdminLayout from "./components/layout/AdminLayout";

import DashboardResponsableStock
  from "./pages/stock/DashboardResponsableStock";

import Articles
  from "./pages/stock/Articles";

import Categories
  from "./pages/stock/Categories";

import EtatStock
  from "./pages/stock/EtatStock";

import Fournisseurs
  from "./pages/approvisionnement/Fournisseurs";

import Entrees
  from "./pages/approvisionnement/Entrees";

import Demandes
  from "./pages/demandes/Demandes";

import NouvelleDemande
  from "./pages/demandes/NouvelleDemande";

import Validations
  from "./pages/demandes/Validations";

import Mouvements
  from "./pages/mouvements/Mouvements";

import Sorties
  from "./pages/mouvements/Sorties";

import Retours
  from "./pages/mouvements/Retours";
import Dotations from "./pages/mouvements/Dotations";

import Inventaire
  from "./pages/inventaire/Inventaire";

import Rapports
  from "./pages/rapports/Rapports";

import Profil
  from "./pages/Profil";
import Parametres from "./pages/Parametres";
import EspaceChefDepartement from "./pages/chef/EspaceChefDepartement";


function SuperAdminOnly() {
  const location = useLocation();
  return isAdminSession() ? <SuperAdminUsers /> : <Navigate to="/super-admin/login" replace state={{ from: location.pathname }} />;
}

function SuperAdminSettingsOnly() {
  return isAdminSession() ? <AdminSettings /> : <Navigate to="/super-admin/login" replace />;
}

function App() {

  return (
    <ApplicationErrorBoundary>
      <BrowserRouter>

        <Routes>

        <Route path="/login" element={<Login />} />
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin" element={<SuperAdminOnly />} />
        <Route path="/super-admin/parametres" element={<SuperAdminSettingsOnly />} />
        <Route element={<ProtectedChefLayout />}>
          <Route path="/chef" element={<EspaceChefDepartement />} />
          <Route path="/chef/demandes" element={<EspaceChefDepartement />} />
          <Route path="/chef/historique" element={<EspaceChefDepartement />} />
          <Route path="/chef/services" element={<EspaceChefDepartement />} />
          <Route path="/chef/profil" element={<EspaceChefDepartement />} />
        </Route>
        <Route element={<ProtectedLayout />}>

          <Route
            path="/"
            element={<DashboardResponsableStock />}
          />

          <Route
            path="/articles"
            element={<Articles />}
          />

          <Route
            path="/categories"
            element={<Categories />}
          />

          <Route
            path="/etat-stock"
            element={<EtatStock />}
          />

          <Route
            path="/fournisseurs"
            element={<Fournisseurs />}
          />

          <Route
            path="/entrees"
            element={<Entrees />}
          />

          {/* =========================
              DEMANDES
          ========================== */}

          <Route
            path="/demandes"
            element={<Demandes />}
          />

          <Route
            path="/nouvelle-demande"
            element={<NouvelleDemande />}
          />

          <Route
            path="/validations"
            element={<Validations />}
          />

          {/* =========================
              MOUVEMENTS
          ========================== */}

          <Route
            path="/mouvements"
            element={<Mouvements />}
          />

          <Route
            path="/sorties"
            element={<Sorties />}
          />

          <Route
            path="/retours"
            element={<Retours />}
          />

          <Route path="/dotations" element={<Dotations />} />

          <Route
            path="/inventaire"
            element={<Inventaire />}
          />

          <Route
            path="/rapports"
            element={<Rapports />}
          />

          <Route
            path="/profil"
            element={<Profil />}
          />
          <Route path="/parametres" element={<Parametres />} />

        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>

      </BrowserRouter>
    </ApplicationErrorBoundary>
  );
}

export default App;
