import { authFetch } from "../../services/auth";
import { useEffect, useMemo, useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";

interface Mouvement {
  id: number;
  date: string;
  type: "ENTREE" | "SORTIE" | "RETOUR";
  article: string;
  code?: string;
  quantite: number;
  unite?: string;
  service?: string;
  responsable?: string;
  reference?: string;
  motif?: string;
}

const API_URL =
  import.meta.env.VITE_API_URL || "/api/stock";

const mockMouvements: Mouvement[] = [
  {
    id: 1,
    date: "2026-09-21T08:30:00",
    type: "ENTREE",
    article: "Stylo bleu",
    code: "ART-001",
    quantite: 100,
    unite: "Unité",
    service: "Stock central",
    responsable: "Responsable stock",
    reference: "ENT-001",
    motif: "Approvisionnement",
  },
  {
    id: 2,
    date: "2026-09-21T09:15:00",
    type: "SORTIE",
    article: "Cahier 200 pages",
    code: "ART-002",
    quantite: 20,
    unite: "Unité",
    service: "Service administratif",
    responsable: "Chef de service",
    reference: "SOR-001",
    motif: "Demande de fourniture",
  },
  {
    id: 3,
    date: "2026-09-20T14:20:00",
    type: "RETOUR",
    article: "Casque de sécurité",
    code: "ART-003",
    quantite: 5,
    unite: "Unité",
    service: "Service sécurité",
    responsable: "Agent magasin",
    reference: "RET-001",
    motif: "Retour matériel",
  },
];

function Mouvements() {
  const [mouvements, setMouvements] =
    useState<Mouvement[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] =
    useState<"TOUS" | "ENTREE" | "SORTIE" | "RETOUR">("TOUS");

  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    loadMouvements();
  }, []);

  const loadMouvements = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authFetch(`${API_URL}/mouvements`);

      if (!response.ok) {
        throw new Error("Impossible de charger les mouvements.");
      }

      const data = await response.json();

      const result = Array.isArray(data)
        ? data
        : data.mouvements || data.data || [];

      setMouvements(result);
    } catch (err) {
      console.warn("API mouvements indisponible :", err);

      setError(
        "Le serveur est actuellement indisponible. Les données de démonstration sont affichées."
      );

      setMouvements(mockMouvements);
    } finally {
      setLoading(false);
    }
  };

  const filteredMouvements = useMemo(() => {
    const value = search.trim().toLowerCase();

    return mouvements.filter((mouvement) => {
      const matchesSearch =
        !value ||
        mouvement.article?.toLowerCase().includes(value) ||
        mouvement.code?.toLowerCase().includes(value) ||
        mouvement.service?.toLowerCase().includes(value) ||
        mouvement.reference?.toLowerCase().includes(value) ||
        mouvement.responsable?.toLowerCase().includes(value);

      const matchesType =
        typeFilter === "TOUS" ||
        mouvement.type === typeFilter;

      const matchesDate =
        !dateFilter ||
        mouvement.date?.substring(0, 10) === dateFilter;

      return matchesSearch && matchesType && matchesDate;
    });
  }, [mouvements, search, typeFilter, dateFilter]);

  const statistiques = useMemo(() => {
    return {
      total: mouvements.length,

      entrees: mouvements.filter(
        (m) => m.type === "ENTREE"
      ).length,

      sorties: mouvements.filter(
        (m) => m.type === "SORTIE"
      ).length,

      retours: mouvements.filter(
        (m) => m.type === "RETOUR"
      ).length,
    };
  }, [mouvements]);

  const formatDate = (date: string) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeClass = (type: Mouvement["type"]) => {
    switch (type) {
      case "ENTREE":
        return "movement-badge movement-badge-entry";

      case "SORTIE":
        return "movement-badge movement-badge-exit";

      case "RETOUR":
        return "movement-badge movement-badge-return";

      default:
        return "movement-badge";
    }
  };

  const getTypeIcon = (type: Mouvement["type"]) => {
    switch (type) {
      case "ENTREE":
        return "bi-box-arrow-in-down";

      case "SORTIE":
        return "bi-box-arrow-up";

      case "RETOUR":
        return "bi-arrow-counterclockwise";

      default:
        return "bi-arrow-left-right";
    }
  };

  return (
    <div className="movement-page">

      {/* HEADER */}
      <div className="movement-header">

        <div>
          <div className="movement-breadcrumb">
            Gestion du stock
            <i className="bi bi-chevron-right" />
            Mouvements
          </div>

          <h1>
            Mouvements du stock
          </h1>

          <p>
            Consultez l'historique des entrées, sorties et retours
            de matériel.
          </p>
        </div>

        <button
          className="movement-refresh-btn"
          onClick={loadMouvements}
        >
          <i className="bi bi-arrow-clockwise" />
          Actualiser
        </button>

      </div>

      {/* ERREUR */}
      {error && (
        <div className="movement-alert">
          <i className="bi bi-info-circle" />
          <span>{error}</span>
        </div>
      )}

      {/* STATISTIQUES */}
      <div className="movement-stat-grid">

        <div className="movement-stat-card">

          <div className="movement-stat-icon blue">
            <i className="bi bi-arrow-left-right" />
          </div>

          <div>
            <span>Total mouvements</span>
            <strong>{statistiques.total}</strong>
          </div>

        </div>

        <div className="movement-stat-card">

          <div className="movement-stat-icon green">
            <i className="bi bi-box-arrow-in-down" />
          </div>

          <div>
            <span>Entrées</span>
            <strong>{statistiques.entrees}</strong>
          </div>

        </div>

        <div className="movement-stat-card">

          <div className="movement-stat-icon orange">
            <i className="bi bi-box-arrow-up" />
          </div>

          <div>
            <span>Sorties</span>
            <strong>{statistiques.sorties}</strong>
          </div>

        </div>

        <div className="movement-stat-card">

          <div className="movement-stat-icon purple">
            <i className="bi bi-arrow-counterclockwise" />
          </div>

          <div>
            <span>Retours</span>
            <strong>{statistiques.retours}</strong>
          </div>

        </div>

      </div>

      {/* TABLEAU */}
      <div className="movement-card">

        <div className="movement-card-header">

          <div>
            <h2>
              Historique des mouvements
            </h2>

            <p>
              {filteredMouvements.length} mouvement(s)
              affiché(s)
            </p>
          </div>

        </div>

        {/* FILTRES */}
        <div className="movement-filters">

          <div className="movement-search">

            <i className="bi bi-search" />

            <input
              type="text"
              placeholder="Rechercher un article, service..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(
                e.target.value as
                  | "TOUS"
                  | "ENTREE"
                  | "SORTIE"
                  | "RETOUR"
              )
            }
          >
            <option value="TOUS">
              Tous les mouvements
            </option>

            <option value="ENTREE">
              Entrées
            </option>

            <option value="SORTIE">
              Sorties
            </option>

            <option value="RETOUR">
              Retours
            </option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) =>
              setDateFilter(e.target.value)
            }
          />

          {(search || dateFilter || typeFilter !== "TOUS") && (
            <button
              className="movement-clear-btn"
              onClick={() => {
                setSearch("");
                setDateFilter("");
                setTypeFilter("TOUS");
              }}
            >
              Réinitialiser
            </button>
          )}

        </div>

        {/* TABLE */}
        <div className="movement-table-wrapper">

          <table className="movement-table">

            <thead>
              <tr>
                <th>Référence</th>
                <th>Date</th>
                <th>Type</th>
                <th>Article</th>
                <th>Quantité</th>
                <th>Service</th>
                <th>Responsable</th>
                <th>Motif</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="movement-empty"
                  >
                    <div className="movement-loading">
                      <span />
                      Chargement des mouvements...
                    </div>
                  </td>
                </tr>
              ) : filteredMouvements.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="movement-empty"
                  >
                    <i className="bi bi-inbox" />

                    <strong>
                      Aucun mouvement trouvé
                    </strong>

                    <span>
                      Aucun mouvement ne correspond
                      aux critères sélectionnés.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredMouvements.map((mouvement) => (
                  <tr key={mouvement.id}>

                    <td>
                      <strong className="movement-reference">
                        {mouvement.reference || `#${mouvement.id}`}
                      </strong>
                    </td>

                    <td>
                      {formatDate(mouvement.date)}
                    </td>

                    <td>
                      <span className={getTypeClass(mouvement.type)}>
                        <i
                          className={`bi ${getTypeIcon(
                            mouvement.type
                          )}`}
                        />

                        {mouvement.type}
                      </span>
                    </td>

                    <td>
                      <div className="movement-article">

                        <div className="movement-article-icon">
                          <i className="bi bi-box" />
                        </div>

                        <div>
                          <strong>
                            {mouvement.article}
                          </strong>

                          <small>
                            {mouvement.code || "-"}
                          </small>
                        </div>

                      </div>
                    </td>

                    <td>
                      <strong>
                        {mouvement.quantite}
                      </strong>{" "}
                      {mouvement.unite || ""}
                    </td>

                    <td>
                      {mouvement.service || "-"}
                    </td>

                    <td>
                      {mouvement.responsable || "-"}
                    </td>

                    <td>
                      {mouvement.motif || "-"}
                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

export default Mouvements;
