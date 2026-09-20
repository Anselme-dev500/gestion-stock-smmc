import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLayout from "./components/layout/AdminLayout";

/* =========================
   DASHBOARD
========================= */

import DashboardResponsableStock from "./pages/stock/DashboardResponsableStock";

/* =========================
   STOCK
========================= */

import Articles from "./pages/stock/Articles";
import Categories from "./pages/stock/Categories";
import EtatStock from "./pages/stock/EtatStock";

/* =========================
   APPROVISIONNEMENT
========================= */

import Fournisseurs from "./pages/approvisionnement/Fournisseurs";
import Entrees from "./pages/approvisionnement/Entrees";

/* =========================
   DEMANDES
========================= */

import Demandes from "./pages/demandes/Demandes";
import NouvelleDemande from "./pages/demandes/NouvelleDemande";
import Validations from "./pages/demandes/Validations";

/* =========================
   MOUVEMENTS
========================= */

import Mouvements from "./pages/mouvements/Mouvements";
import Sorties from "./pages/mouvements/Sorties";
import Retours from "./pages/mouvements/Retours";

/* =========================
   INVENTAIRE
========================= */

import Inventaire from "./pages/inventaire/Inventaire";

/* =========================
   RAPPORTS
========================= */

import Rapports from "./pages/rapports/Rapports";

/* =========================
   PROFIL
========================= */

import Profil from "./pages/Profil";


function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =========================
            TABLEAU DE BORD
        ========================= */}

        <Route
          path="/"
          element={
            <AdminLayout>
              <DashboardResponsableStock />
            </AdminLayout>
          }
        />

        {/* =========================
            STOCK
        ========================= */}

        <Route
          path="/articles"
          element={
            <AdminLayout>
              <Articles />
            </AdminLayout>
          }
        />

        <Route
          path="/categories"
          element={
            <AdminLayout>
              <Categories />
            </AdminLayout>
          }
        />

        <Route
          path="/etat-stock"
          element={
            <AdminLayout>
              <EtatStock />
            </AdminLayout>
          }
        />

        {/* =========================
            APPROVISIONNEMENT
        ========================= */}

        <Route
          path="/fournisseurs"
          element={
            <AdminLayout>
              <Fournisseurs />
            </AdminLayout>
          }
        />

        <Route
          path="/entrees"
          element={
            <AdminLayout>
              <Entrees />
            </AdminLayout>
          }
        />

        {/* =========================
            DEMANDES
        ========================= */}

        <Route
          path="/demandes"
          element={
            <AdminLayout>
              <Demandes />
            </AdminLayout>
          }
        />

        <Route
          path="/nouvelle-demande"
          element={
            <AdminLayout>
              <NouvelleDemande />
            </AdminLayout>
          }
        />

        <Route
          path="/validations"
          element={
            <AdminLayout>
              <Validations />
            </AdminLayout>
          }
        />

        {/* =========================
            MOUVEMENTS
        ========================= */}

        <Route
          path="/mouvements"
          element={
            <AdminLayout>
              <Mouvements />
            </AdminLayout>
          }
        />

        <Route
          path="/sorties"
          element={
            <AdminLayout>
              <Sorties />
            </AdminLayout>
          }
        />

        <Route
          path="/retours"
          element={
            <AdminLayout>
              <Retours />
            </AdminLayout>
          }
        />

        {/* =========================
            INVENTAIRE
        ========================= */}

        <Route
          path="/inventaire"
          element={
            <AdminLayout>
              <Inventaire />
            </AdminLayout>
          }
        />

        {/* =========================
            RAPPORTS
        ========================= */}

        <Route
          path="/rapports"
          element={
            <AdminLayout>
              <Rapports />
            </AdminLayout>
          }
        />

        {/* =========================
            PROFIL
        ========================= */}

        <Route
          path="/profil"
          element={
            <AdminLayout>
              <Profil />
            </AdminLayout>
          }
        />

        {/* =========================
            PAGE 404
        ========================= */}

        <Route
          path="*"
          element={
            <AdminLayout>
              <div className="text-center py-5">
                <h1 className="display-4">
                  404
                </h1>

                <h3>
                  Page introuvable
                </h3>

                <p className="text-muted">
                  La page que vous recherchez n'existe pas.
                </p>
              </div>
            </AdminLayout>
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;