import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useEffect } from "react";
import { getAccessToken, isAdminSession } from "./services/auth";
import SuperAdminLogin from "./pages/admin/SuperAdminLogin";
import SuperAdminUsers from "./pages/admin/SuperAdminUsers";
import ChefLayout from "./pages/chef/ChefLayout";
import ChefPages from "./pages/chef/ChefPages";
import Login from "./pages/auth/Login";

function ProtectedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const expired = () => navigate("/login", { replace: true, state: { from: location.pathname } });
    window.addEventListener("smmc-session-expired", expired);
    return () => window.removeEventListener("smmc-session-expired", expired);
  }, [navigate, location.pathname]);
  if (isAdminSession()) return <Navigate to="/super-admin" replace />;
  const raw = localStorage.getItem("smmc_user");
  try { if (raw && (JSON.parse(raw) as { role_stock?: string }).role_stock === "chef_departement") return <Navigate to="/chef" replace />; } catch { /* session corrompue */ }
  return getAccessToken() ? <AdminLayout /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
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

import Inventaire
  from "./pages/inventaire/Inventaire";

import Rapports
  from "./pages/rapports/Rapports";

import Profil
  from "./pages/Profil";
import Parametres from "./pages/Parametres";
import AdminSettings from "./pages/admin/AdminSettings";


function SuperAdminOnly() {
  const location = useLocation();
  return isAdminSession() ? <SuperAdminUsers /> : <Navigate to="/super-admin/login" replace state={{ from: location.pathname }} />;
}

function ChefOnly() {
  const location = useLocation();
  if (!getAccessToken() || isAdminSession()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  const raw = localStorage.getItem('smmc_user');
  try {
    const role = raw ? (JSON.parse(raw) as { role_stock?:string }).role_stock : null;
    if (role !== 'chef_departement') return <Navigate to="/" replace />;
  } catch { return <Navigate to="/login" replace />; }
  return <ChefLayout />;
}

function App() {

  return (
    <BrowserRouter>

      <Routes>

        <Route path="/login" element={<Login />} />
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin" element={<SuperAdminOnly />} />
        <Route path="/super-admin/parametres" element={isAdminSession() ? <AdminSettings /> : <Navigate to="/super-admin/login" replace />} />
        <Route element={<ChefOnly />}>
          <Route path="/chef" element={<ChefPages />} />
          <Route path="/chef/demandes" element={<ChefPages />} />
          <Route path="/chef/historique" element={<ChefPages />} />
          <Route path="/chef/profil" element={<Profil />} />
          <Route path="/chef/parametres" element={<Parametres />} />
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
  );
}

export default App;