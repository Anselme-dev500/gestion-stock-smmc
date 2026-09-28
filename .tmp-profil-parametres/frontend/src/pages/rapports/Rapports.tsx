import { authFetch } from "../../services/auth";
import { useEffect, useMemo, useState } from "react";

interface StockArticle {
  id_article: number;
  code: string;
  designation: string;
  categorie: string;
  unite: string;
  emplacement: string | null;
  stock_min: number;
  stock_max: number | null;
  stock_actuel: number;
  etat_stock: "RUPTURE" | "STOCK_FAIBLE" | "STOCK_MAX" | "NORMAL";
}

interface Mouvement {
  id_mouvement: number;
  code_article: string;
  designation: string;
  type_mouvement: "ENTREE" | "SORTIE" | "RETOUR" | "AJUSTEMENT";
  quantite: number;
  date_mouvement: string;
}

interface Demande {
  id_demande: number;
  numero_demande: string;
  service: string | null;
  demandeur: string;
  date_demande: string;
  priorite: string;
  statut: string;
}

interface Approvisionnement {
  id_approvisionnement: number;
  numero: string;
  fournisseur: string;
  date_approvisionnement: string;
  statut: string;
}

interface Inventaire {
  id_inventaire: number;
  numero_inventaire: string;
  date_inventaire: string;
  statut: string;
}

const API_URL = "/api/stock";

export default function Rapports() {
  const [stock, setStock] = useState<StockArticle[]>([]);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [approvisionnements, setApprovisionnements] = useState<
    Approvisionnement[]
  >([]);
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);

  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const [activeTab, setActiveTab] = useState("stock");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    chargerRapports();
  }, []);

  const chargerRapports = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        stockResponse,
        mouvementsResponse,
        demandesResponse,
        approResponse,
        inventairesResponse,
      ] = await Promise.all([
        authFetch(`${API_URL}/rapports/stock`),
        authFetch(`${API_URL}/rapports/mouvements`),
        authFetch(`${API_URL}/rapports/demandes`),
        authFetch(`${API_URL}/rapports/approvisionnements`),
        authFetch(`${API_URL}/rapports/inventaires`),
      ]);

      if (!stockResponse.ok) {
        throw new Error("Impossible de charger le rapport du stock.");
      }

      const stockData = await stockResponse.json();
      const mouvementsData = await mouvementsResponse.json();
      const demandesData = await demandesResponse.json();
      const approData = await approResponse.json();
      const inventairesData = await inventairesResponse.json();

      setStock(stockData);
      setMouvements(mouvementsData);
      setDemandes(demandesData);
      setApprovisionnements(approData);
      setInventaires(inventairesData);
    } catch (err) {
      console.error(err);
      setError(
        "Impossible de récupérer les données. Vérifiez que le serveur backend est démarré."
      );
    } finally {
      setLoading(false);
    }
  };

  const mouvementsFiltres = useMemo(() => {
    return mouvements.filter((mouvement) => {
      const date = mouvement.date_mouvement.substring(0, 10);

      if (dateDebut && date < dateDebut) {
        return false;
      }

      if (dateFin && date > dateFin) {
        return false;
      }

      return true;
    });
  }, [mouvements, dateDebut, dateFin]);

  const demandesFiltres = useMemo(() => {
    return demandes.filter((demande) => {
      const date = demande.date_demande.substring(0, 10);

      if (dateDebut && date < dateDebut) {
        return false;
      }

      if (dateFin && date > dateFin) {
        return false;
      }

      return true;
    });
  }, [demandes, dateDebut, dateFin]);

  const approvisionnementsFiltres = useMemo(() => {
    return approvisionnements.filter((appro) => {
      const date = appro.date_approvisionnement.substring(0, 10);

      if (dateDebut && date < dateDebut) {
        return false;
      }

      if (dateFin && date > dateFin) {
        return false;
      }

      return true;
    });
  }, [approvisionnements, dateDebut, dateFin]);

  const inventairesFiltres = useMemo(() => {
    return inventaires.filter((inventaire) => {
      const date = inventaire.date_inventaire.substring(0, 10);

      if (dateDebut && date < dateDebut) {
        return false;
      }

      if (dateFin && date > dateFin) {
        return false;
      }

      return true;
    });
  }, [inventaires, dateDebut, dateFin]);

  const statistiques = useMemo(() => {
    const totalArticles = stock.length;

    const ruptures = stock.filter(
      (article) => article.etat_stock === "RUPTURE"
    ).length;

    const stocksFaibles = stock.filter(
      (article) => article.etat_stock === "STOCK_FAIBLE"
    ).length;

    const stockNormal = stock.filter(
      (article) => article.etat_stock === "NORMAL"
    ).length;

    const totalStock = stock.reduce(
      (total, article) => total + Number(article.stock_actuel || 0),
      0
    );

    const entrees = mouvementsFiltres
      .filter((m) => m.type_mouvement === "ENTREE")
      .reduce((total, m) => total + Number(m.quantite || 0), 0);

    const sorties = mouvementsFiltres
      .filter((m) => m.type_mouvement === "SORTIE")
      .reduce((total, m) => total + Number(m.quantite || 0), 0);

    const retours = mouvementsFiltres
      .filter((m) => m.type_mouvement === "RETOUR")
      .reduce((total, m) => total + Number(m.quantite || 0), 0);

    const demandesEnAttente = demandesFiltres.filter(
      (d) => d.statut === "EN_ATTENTE"
    ).length;

    const demandesValidees = demandesFiltres.filter(
      (d) => d.statut === "VALIDEE"
    ).length;

    return {
      totalArticles,
      ruptures,
      stocksFaibles,
      stockNormal,
      totalStock,
      entrees,
      sorties,
      retours,
      demandesEnAttente,
      demandesValidees,
    };
  }, [stock, mouvementsFiltres, demandesFiltres]);

  const getEtatClass = (etat: string) => {
    switch (etat) {
      case "RUPTURE":
        return "badge-danger";

      case "STOCK_FAIBLE":
        return "badge-warning";

      case "STOCK_MAX":
        return "badge-info";

      default:
        return "badge-success";
    }
  };

  const getStatutClass = (statut: string) => {
    switch (statut) {
      case "VALIDEE":
      case "VALIDE":
      case "TERMINE":
      case "SERVIE":
        return "badge-success";

      case "EN_ATTENTE":
      case "EN_COURS":
      case "BROUILLON":
        return "badge-warning";

      case "REFUSEE":
      case "ANNULEE":
      case "ANNULE":
        return "badge-danger";

      default:
        return "badge-secondary";
    }
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 3,
    }).format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("fr-FR");
  };

  const exporterCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === "stock") {
      headers = [
        "Code",
        "Article",
        "Catégorie",
        "Unité",
        "Emplacement",
        "Stock actuel",
        "Stock minimum",
        "Stock maximum",
        "État",
      ];

      rows = stock.map((article) => [
        article.code,
        article.designation,
        article.categorie,
        article.unite,
        article.emplacement || "",
        String(article.stock_actuel),
        String(article.stock_min),
        String(article.stock_max ?? ""),
        article.etat_stock,
      ]);
    }

    if (activeTab === "mouvements") {
      headers = [
        "Code article",
        "Article",
        "Type",
        "Quantité",
        "Date",
      ];

      rows = mouvementsFiltres.map((mouvement) => [
        mouvement.code_article,
        mouvement.designation,
        mouvement.type_mouvement,
        String(mouvement.quantite),
        formatDate(mouvement.date_mouvement),
      ]);
    }

    if (activeTab === "demandes") {
      headers = [
        "Numéro",
        "Service",
        "Demandeur",
        "Date",
        "Priorité",
        "Statut",
      ];

      rows = demandesFiltres.map((demande) => [
        demande.numero_demande,
        demande.service || "",
        demande.demandeur,
        formatDate(demande.date_demande),
        demande.priorite,
        demande.statut,
      ]);
    }

    if (activeTab === "approvisionnements") {
      headers = [
        "Numéro",
        "Fournisseur",
        "Date",
        "Statut",
      ];

      rows = approvisionnementsFiltres.map((appro) => [
        appro.numero,
        appro.fournisseur,
        formatDate(appro.date_approvisionnement),
        appro.statut,
      ]);
    }

    if (activeTab === "inventaires") {
      headers = [
        "Numéro inventaire",
        "Date",
        "Statut",
      ];

      rows = inventairesFiltres.map((inventaire) => [
        inventaire.numero_inventaire,
        formatDate(inventaire.date_inventaire),
        inventaire.statut,
      ]);
    }

    const csv = [
      headers.join(";"),
      ...rows.map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport-${activeTab}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const imprimer = () => {
    window.print();
  };

  return (
    <div className="reports-page">

      {/* HEADER */}
      <div className="reports-header">
        <div>
          <h1>Rapports & statistiques</h1>
          <p>
            Analyse de l'activité du stock, des mouvements,
            des demandes et des approvisionnements.
          </p>
        </div>

        <div className="reports-actions">
          <button
            className="btn-report btn-outline-report"
            onClick={exporterCSV}
          >
            <i className="bi bi-download"></i>
            Exporter CSV
          </button>

          <button
            className="btn-report btn-primary-report"
            onClick={imprimer}
          >
            <i className="bi bi-printer"></i>
            Imprimer
          </button>
        </div>
      </div>

      {/* FILTRES */}
      <div className="report-filter-card">
        <div className="filter-title">
          <i className="bi bi-funnel"></i>
          <span>Filtres du rapport</span>
        </div>

        <div className="report-filters">
          <div className="filter-group">
            <label>Date début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Date fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
            />
          </div>

          <button
            className="btn-reset-filter"
            onClick={() => {
              setDateDebut("");
              setDateFin("");
            }}
          >
            <i className="bi bi-arrow-counterclockwise"></i>
            Réinitialiser
          </button>
        </div>
      </div>

      {/* ERREUR */}
      {error && (
        <div className="report-error">
          <i className="bi bi-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* STATISTIQUES */}
      <div className="report-kpis">

        <div className="report-kpi">
          <div className="kpi-icon green">
            <i className="bi bi-box-seam"></i>
          </div>

          <div>
            <span>Total articles</span>
            <strong>{statistiques.totalArticles}</strong>
          </div>
        </div>

        <div className="report-kpi">
          <div className="kpi-icon blue">
            <i className="bi bi-boxes"></i>
          </div>

          <div>
            <span>Stock actuel</span>
            <strong>{formatNumber(statistiques.totalStock)}</strong>
          </div>
        </div>

        <div className="report-kpi">
          <div className="kpi-icon red">
            <i className="bi bi-exclamation-circle"></i>
          </div>

          <div>
            <span>Ruptures</span>
            <strong>{statistiques.ruptures}</strong>
          </div>
        </div>

        <div className="report-kpi">
          <div className="kpi-icon orange">
            <i className="bi bi-exclamation-triangle"></i>
          </div>

          <div>
            <span>Stock faible</span>
            <strong>{statistiques.stocksFaibles}</strong>
          </div>
        </div>

        <div className="report-kpi">
          <div className="kpi-icon purple">
            <i className="bi bi-clipboard-check"></i>
          </div>

          <div>
            <span>Demandes en attente</span>
            <strong>{statistiques.demandesEnAttente}</strong>
          </div>
        </div>

      </div>

      {/* MOUVEMENTS KPI */}
      <div className="movement-summary">

        <div>
          <span>
            <i className="bi bi-box-arrow-in-down"></i>
            Entrées
          </span>
          <strong>{formatNumber(statistiques.entrees)}</strong>
        </div>

        <div>
          <span>
            <i className="bi bi-box-arrow-up"></i>
            Sorties
          </span>
          <strong>{formatNumber(statistiques.sorties)}</strong>
        </div>

        <div>
          <span>
            <i className="bi bi-arrow-return-left"></i>
            Retours
          </span>
          <strong>{formatNumber(statistiques.retours)}</strong>
        </div>

        <div>
          <span>
            <i className="bi bi-check-circle"></i>
            Demandes validées
          </span>
          <strong>{statistiques.demandesValidees}</strong>
        </div>

      </div>

      {/* ONGLETS */}
      <div className="report-tabs">

        <button
          className={activeTab === "stock" ? "active" : ""}
          onClick={() => setActiveTab("stock")}
        >
          <i className="bi bi-box-seam"></i>
          État du stock
        </button>

        <button
          className={activeTab === "mouvements" ? "active" : ""}
          onClick={() => setActiveTab("mouvements")}
        >
          <i className="bi bi-arrow-left-right"></i>
          Mouvements
        </button>

        <button
          className={activeTab === "demandes" ? "active" : ""}
          onClick={() => setActiveTab("demandes")}
        >
          <i className="bi bi-clipboard"></i>
          Demandes
        </button>

        <button
          className={activeTab === "approvisionnements" ? "active" : ""}
          onClick={() => setActiveTab("approvisionnements")}
        >
          <i className="bi bi-truck"></i>
          Approvisionnements
        </button>

        <button
          className={activeTab === "inventaires" ? "active" : ""}
          onClick={() => setActiveTab("inventaires")}
        >
          <i className="bi bi-clipboard-data"></i>
          Inventaires
        </button>

      </div>

      {/* CONTENU */}
      <div className="report-content">

        {loading ? (
          <div className="report-loading">
            <div className="spinner-border"></div>
            <span>Chargement des rapports...</span>
          </div>
        ) : (
          <>
            {/* STOCK */}
            {activeTab === "stock" && (
              <div className="report-table-card">

                <div className="table-header">
                  <div>
                    <h2>État actuel du stock</h2>
                    <p>
                      Données provenant de la vue
                      <strong> vue_etat_stock</strong>.
                    </p>
                  </div>

                  <span className="result-count">
                    {stock.length} article(s)
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Article</th>
                        <th>Catégorie</th>
                        <th>Emplacement</th>
                        <th>Stock actuel</th>
                        <th>Stock min.</th>
                        <th>Stock max.</th>
                        <th>État</th>
                      </tr>
                    </thead>

                    <tbody>
                      {stock.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="empty-table">
                            Aucun article trouvé.
                          </td>
                        </tr>
                      ) : (
                        stock.map((article) => (
                          <tr key={article.id_article}>
                            <td>
                              <strong>{article.code}</strong>
                            </td>

                            <td>
                              <div className="article-name">
                                {article.designation}
                              </div>
                              <small>{article.unite}</small>
                            </td>

                            <td>{article.categorie}</td>

                            <td>
                              {article.emplacement || "-"}
                            </td>

                            <td>
                              <strong>
                                {formatNumber(article.stock_actuel)}
                              </strong>
                            </td>

                            <td>
                              {formatNumber(article.stock_min)}
                            </td>

                            <td>
                              {article.stock_max !== null
                                ? formatNumber(article.stock_max)
                                : "-"}
                            </td>

                            <td>
                              <span
                                className={`status-badge ${getEtatClass(
                                  article.etat_stock
                                )}`}
                              >
                                {article.etat_stock}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* MOUVEMENTS */}
            {activeTab === "mouvements" && (
              <div className="report-table-card">

                <div className="table-header">
                  <div>
                    <h2>Historique des mouvements</h2>
                    <p>
                      Entrées, sorties, retours et ajustements.
                    </p>
                  </div>

                  <span className="result-count">
                    {mouvementsFiltres.length} mouvement(s)
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Article</th>
                        <th>Type</th>
                        <th>Quantité</th>
                      </tr>
                    </thead>

                    <tbody>
                      {mouvementsFiltres.map((mouvement) => (
                        <tr key={mouvement.id_mouvement}>
                          <td>
                            {formatDate(mouvement.date_mouvement)}
                          </td>

                          <td>
                            <strong>{mouvement.code_article}</strong>
                            <div className="article-name">
                              {mouvement.designation}
                            </div>
                          </td>

                          <td>
                            <span className="movement-type">
                              {mouvement.type_mouvement}
                            </span>
                          </td>

                          <td>
                            <strong>
                              {formatNumber(mouvement.quantite)}
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* DEMANDES */}
            {activeTab === "demandes" && (
              <div className="report-table-card">

                <div className="table-header">
                  <div>
                    <h2>Rapport des demandes</h2>
                    <p>
                      Suivi des demandes de fourniture.
                    </p>
                  </div>

                  <span className="result-count">
                    {demandesFiltres.length} demande(s)
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Numéro</th>
                        <th>Service</th>
                        <th>Demandeur</th>
                        <th>Date</th>
                        <th>Priorité</th>
                        <th>Statut</th>
                      </tr>
                    </thead>

                    <tbody>
                      {demandesFiltres.map((demande) => (
                        <tr key={demande.id_demande}>
                          <td>
                            <strong>
                              {demande.numero_demande}
                            </strong>
                          </td>

                          <td>{demande.service || "-"}</td>

                          <td>{demande.demandeur}</td>

                          <td>
                            {formatDate(demande.date_demande)}
                          </td>

                          <td>{demande.priorite}</td>

                          <td>
                            <span
                              className={`status-badge ${getStatutClass(
                                demande.statut
                              )}`}
                            >
                              {demande.statut}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* APPROVISIONNEMENTS */}
            {activeTab === "approvisionnements" && (
              <div className="report-table-card">

                <div className="table-header">
                  <div>
                    <h2>Rapport des approvisionnements</h2>
                    <p>
                      Historique des approvisionnements fournisseurs.
                    </p>
                  </div>

                  <span className="result-count">
                    {approvisionnementsFiltres.length} approvisionnement(s)
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Numéro</th>
                        <th>Fournisseur</th>
                        <th>Date</th>
                        <th>Statut</th>
                      </tr>
                    </thead>

                    <tbody>
                      {approvisionnementsFiltres.map((appro) => (
                        <tr key={appro.id_approvisionnement}>
                          <td>
                            <strong>{appro.numero}</strong>
                          </td>

                          <td>{appro.fournisseur}</td>

                          <td>
                            {formatDate(
                              appro.date_approvisionnement
                            )}
                          </td>

                          <td>
                            <span
                              className={`status-badge ${getStatutClass(
                                appro.statut
                              )}`}
                            >
                              {appro.statut}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* INVENTAIRES */}
            {activeTab === "inventaires" && (
              <div className="report-table-card">

                <div className="table-header">
                  <div>
                    <h2>Rapport des inventaires</h2>
                    <p>
                      Suivi des opérations d'inventaire.
                    </p>
                  </div>

                  <span className="result-count">
                    {inventairesFiltres.length} inventaire(s)
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Numéro</th>
                        <th>Date</th>
                        <th>Statut</th>
                      </tr>
                    </thead>

                    <tbody>
                      {inventairesFiltres.map((inventaire) => (
                        <tr key={inventaire.id_inventaire}>
                          <td>
                            <strong>
                              {inventaire.numero_inventaire}
                            </strong>
                          </td>

                          <td>
                            {formatDate(
                              inventaire.date_inventaire
                            )}
                          </td>

                          <td>
                            <span
                              className={`status-badge ${getStatutClass(
                                inventaire.statut
                              )}`}
                            >
                              {inventaire.statut}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
