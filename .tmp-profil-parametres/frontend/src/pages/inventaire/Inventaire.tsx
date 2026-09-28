import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createInventaire,
  getInventaires,
  getInventaireDetails,
  updateInventaireDetail,
  terminerInventaire,
  annulerInventaire,
} from "../../services/stockApi";

interface Inventaire {
  id_inventaire: number;
  id_emplacement?: number | null;
  emplacement_nom?: string | null;
  emplacement_code?: string | null;
  id_utilisateur?: number | null;
  utilisateur_nom?: string | null;
  numero_inventaire: string;
  date_inventaire: string;
  statut: "EN_COURS" | "TERMINE" | "ANNULE";
  observation?: string | null;
  created_at?: string;
}

interface InventaireDetail {
  id_detail: number;
  id_inventaire: number;
  id_article: number;
  code: string;
  designation: string;
  unite?: string | null;
  stock_theorique: number;
  stock_physique: number;
  ecart: number;
  observation?: string | null;
}

interface CreateInventaireForm {
  numero_inventaire: string;
  date_inventaire: string;
  id_emplacement: string;
  observation: string;
}

function formatNumber(value: number | string | null | undefined) {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 3,
  }).format(number);
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("fr-FR");
}

function getStatusLabel(statut: Inventaire["statut"]) {
  switch (statut) {
    case "EN_COURS":
      return "En cours";

    case "TERMINE":
      return "Terminé";

    case "ANNULE":
      return "Annulé";

    default:
      return statut;
  }
}

function getStatusClass(statut: Inventaire["statut"]) {
  switch (statut) {
    case "EN_COURS":
      return "inventaire-status inventaire-status-progress";

    case "TERMINE":
      return "inventaire-status inventaire-status-success";

    case "ANNULE":
      return "inventaire-status inventaire-status-danger";

    default:
      return "inventaire-status";
  }
}

export default function Inventaire() {
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [details, setDetails] = useState<InventaireDetail[]>([]);

  const [selectedInventaire, setSelectedInventaire] =
    useState<Inventaire | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TOUS");

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [form, setForm] = useState<CreateInventaireForm>({
    numero_inventaire: "",
    date_inventaire: new Date().toISOString().split("T")[0],
    id_emplacement: "",
    observation: "",
  });

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadInventaires = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getInventaires();

      setInventaires(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les inventaires."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetails = useCallback(async (id: number) => {
    try {
      setDetailsLoading(true);
      setError("");

      const data = await getInventaireDetails(id);

      setDetails(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les détails de l'inventaire."
      );
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInventaires();
  }, [loadInventaires]);

  const filteredInventaires = useMemo(() => {
    const value = search.trim().toLowerCase();

    return inventaires.filter((inventaire) => {
      const matchesSearch =
        !value ||
        inventaire.numero_inventaire.toLowerCase().includes(value) ||
        (inventaire.emplacement_nom ?? "").toLowerCase().includes(value) ||
        (inventaire.emplacement_code ?? "").toLowerCase().includes(value) ||
        (inventaire.utilisateur_nom ?? "").toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "TOUS" || inventaire.statut === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inventaires, search, statusFilter]);

  const stats = useMemo(() => {
    const total = inventaires.length;

    const enCours = inventaires.filter(
      (item) => item.statut === "EN_COURS"
    ).length;

    const termines = inventaires.filter(
      (item) => item.statut === "TERMINE"
    ).length;

    const annules = inventaires.filter(
      (item) => item.statut === "ANNULE"
    ).length;

    return {
      total,
      enCours,
      termines,
      annules,
    };
  }, [inventaires]);

  const detailStats = useMemo(() => {
    const totalArticles = details.length;

    const articlesAvecEcart = details.filter(
      (detail) => Number(detail.ecart) !== 0
    ).length;

    const ecartsPositifs = details.filter(
      (detail) => Number(detail.ecart) > 0
    ).length;

    const ecartsNegatifs = details.filter(
      (detail) => Number(detail.ecart) < 0
    ).length;

    return {
      totalArticles,
      articlesAvecEcart,
      ecartsPositifs,
      ecartsNegatifs,
    };
  }, [details]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setError("");
      setSuccess("");

      if (!form.numero_inventaire.trim()) {
        setError("Le numéro d'inventaire est obligatoire.");
        return;
      }

      if (!form.date_inventaire) {
        setError("La date de l'inventaire est obligatoire.");
        return;
      }

      await createInventaire({
        numero_inventaire: form.numero_inventaire.trim(),
        date_inventaire: form.date_inventaire,
        id_emplacement: form.id_emplacement
          ? Number(form.id_emplacement)
          : null,
        observation: form.observation.trim() || null,
      });

      setSuccess("L'inventaire a été créé avec succès.");

      setForm({
        numero_inventaire: "",
        date_inventaire: new Date().toISOString().split("T")[0],
        id_emplacement: "",
        observation: "",
      });

      setShowCreateForm(false);

      await loadInventaires();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer l'inventaire."
      );
    }
  };

  const handleSelectInventaire = async (inventaire: Inventaire) => {
    setSelectedInventaire(inventaire);
    await loadDetails(inventaire.id_inventaire);
  };

  const handlePhysicalQuantityChange = (
    idDetail: number,
    value: string
  ) => {
    const quantity = Number(value);

    if (Number.isNaN(quantity) || quantity < 0) {
      return;
    }

    setDetails((current) =>
      current.map((detail) => {
        if (detail.id_detail !== idDetail) {
          return detail;
        }

        return {
          ...detail,
          stock_physique: quantity,
          ecart: quantity - Number(detail.stock_theorique),
        };
      })
    );
  };

  const handleObservationChange = (
    idDetail: number,
    value: string
  ) => {
    setDetails((current) =>
      current.map((detail) =>
        detail.id_detail === idDetail
          ? {
              ...detail,
              observation: value,
            }
          : detail
      )
    );
  };

  const handleSaveDetail = async (detail: InventaireDetail) => {
    try {
      setError("");
      setSuccess("");

      await updateInventaireDetail(detail.id_detail, {
        stock_physique: Number(detail.stock_physique),
        observation: detail.observation ?? null,
      });

      setSuccess("Le comptage de l'article a été enregistré.");

      if (selectedInventaire) {
        await loadDetails(selectedInventaire.id_inventaire);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'enregistrer le comptage."
      );
    }
  };

  const handleTerminer = async () => {
    if (!selectedInventaire) return;

    const confirmed = window.confirm(
      "Voulez-vous vraiment terminer cet inventaire ?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await terminerInventaire(selectedInventaire.id_inventaire);

      setSuccess("L'inventaire a été terminé.");

      setSelectedInventaire({
        ...selectedInventaire,
        statut: "TERMINE",
      });

      await loadInventaires();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de terminer l'inventaire."
      );
    }
  };

  const handleAnnuler = async () => {
    if (!selectedInventaire) return;

    const confirmed = window.confirm(
      "Voulez-vous vraiment annuler cet inventaire ?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await annulerInventaire(selectedInventaire.id_inventaire);

      setSuccess("L'inventaire a été annulé.");

      setSelectedInventaire({
        ...selectedInventaire,
        statut: "ANNULE",
      });

      await loadInventaires();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'annuler l'inventaire."
      );
    }
  };

  return (
    <div className="inventaire-page">
      {/* HEADER */}
      <div className="inventaire-page-header">
        <div>
          <div className="inventaire-breadcrumb">
            Gestion du stock <span>/</span> Inventaire
          </div>

          <h1>Inventaire</h1>

          <p>
            Contrôle du stock théorique et du stock physique des articles.
          </p>
        </div>

        <button
          type="button"
          className="inventaire-primary-button"
          onClick={() => setShowCreateForm((value) => !value)}
        >
          <i className="bi bi-clipboard-plus" />
          Nouvel inventaire
        </button>
      </div>

      {/* ALERTES */}
      {error && (
        <div className="inventaire-alert inventaire-alert-danger">
          <i className="bi bi-exclamation-triangle-fill" />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="inventaire-alert inventaire-alert-success">
          <i className="bi bi-check-circle-fill" />
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {/* STATISTIQUES */}
      <div className="inventaire-stats">
        <div className="inventaire-stat-card">
          <div className="inventaire-stat-icon green">
            <i className="bi bi-clipboard-data" />
          </div>

          <div>
            <span>Total inventaires</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="inventaire-stat-card">
          <div className="inventaire-stat-icon orange">
            <i className="bi bi-clock-history" />
          </div>

          <div>
            <span>En cours</span>
            <strong>{stats.enCours}</strong>
          </div>
        </div>

        <div className="inventaire-stat-card">
          <div className="inventaire-stat-icon blue">
            <i className="bi bi-check2-circle" />
          </div>

          <div>
            <span>Terminés</span>
            <strong>{stats.termines}</strong>
          </div>
        </div>

        <div className="inventaire-stat-card">
          <div className="inventaire-stat-icon red">
            <i className="bi bi-x-circle" />
          </div>

          <div>
            <span>Annulés</span>
            <strong>{stats.annules}</strong>
          </div>
        </div>
      </div>

      {/* CREATION */}
      {showCreateForm && (
        <div className="inventaire-card inventaire-create-card">
          <div className="inventaire-card-header">
            <div>
              <h2>Nouvel inventaire</h2>
              <p>
                Créer une nouvelle session de comptage du stock.
              </p>
            </div>

            <button
              type="button"
              className="inventaire-close-button"
              onClick={() => setShowCreateForm(false)}
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>

          <form onSubmit={handleCreate}>
            <div className="inventaire-form-grid">
              <div className="inventaire-field">
                <label htmlFor="numero_inventaire">
                  Numéro d'inventaire *
                </label>

                <input
                  id="numero_inventaire"
                  type="text"
                  value={form.numero_inventaire}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      numero_inventaire: event.target.value,
                    })
                  }
                  placeholder="Ex : INV-2026-001"
                />
              </div>

              <div className="inventaire-field">
                <label htmlFor="date_inventaire">
                  Date *
                </label>

                <input
                  id="date_inventaire"
                  type="date"
                  value={form.date_inventaire}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      date_inventaire: event.target.value,
                    })
                  }
                />
              </div>

              <div className="inventaire-field">
                <label htmlFor="id_emplacement">
                  Emplacement
                </label>

                <input
                  id="id_emplacement"
                  type="number"
                  value={form.id_emplacement}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      id_emplacement: event.target.value,
                    })
                  }
                  placeholder="ID emplacement"
                />
              </div>

              <div className="inventaire-field inventaire-field-full">
                <label htmlFor="observation">
                  Observation
                </label>

                <textarea
                  id="observation"
                  value={form.observation}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      observation: event.target.value,
                    })
                  }
                  placeholder="Observation générale..."
                  rows={3}
                />
              </div>
            </div>

            <div className="inventaire-form-actions">
              <button
                type="button"
                className="inventaire-secondary-button"
                onClick={() => setShowCreateForm(false)}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="inventaire-primary-button"
              >
                <i className="bi bi-check-lg" />
                Créer l'inventaire
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTE */}
      <div className="inventaire-card">
        <div className="inventaire-card-header">
          <div>
            <h2>Sessions d'inventaire</h2>

            <p>
              {filteredInventaires.length} inventaire(s) affiché(s)
            </p>
          </div>

          <button
            type="button"
            className="inventaire-refresh-button"
            onClick={() => void loadInventaires()}
            disabled={loading}
          >
            <i
              className={`bi ${
                loading ? "bi-arrow-repeat inventaire-spin" : "bi-arrow-clockwise"
              }`}
            />
            Actualiser
          </button>
        </div>

        {/* FILTRES */}
        <div className="inventaire-toolbar">
          <div className="inventaire-search">
            <i className="bi bi-search" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un inventaire..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="inventaire-select"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="EN_COURS">En cours</option>
            <option value="TERMINE">Terminés</option>
            <option value="ANNULE">Annulés</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="inventaire-table-container">
          <table className="inventaire-table">
            <thead>
              <tr>
                <th>N° inventaire</th>
                <th>Date</th>
                <th>Emplacement</th>
                <th>Responsable</th>
                <th>Statut</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="inventaire-loading">
                      <span className="inventaire-loader" />
                      Chargement des inventaires...
                    </div>
                  </td>
                </tr>
              ) : filteredInventaires.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="inventaire-empty">
                      <div className="inventaire-empty-icon">
                        <i className="bi bi-clipboard-x" />
                      </div>

                      <strong>Aucun inventaire trouvé</strong>

                      <span>
                        Aucun inventaire ne correspond aux critères.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInventaires.map((inventaire) => (
                  <tr key={inventaire.id_inventaire}>
                    <td>
                      <div className="inventaire-number">
                        <div className="inventaire-row-icon">
                          <i className="bi bi-clipboard-check" />
                        </div>

                        <div>
                          <strong>
                            {inventaire.numero_inventaire}
                          </strong>

                          <small>
                            ID #{inventaire.id_inventaire}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>{formatDate(inventaire.date_inventaire)}</td>

                    <td>
                      {inventaire.emplacement_nom ||
                      inventaire.emplacement_code ? (
                        <div className="inventaire-location">
                          <i className="bi bi-geo-alt" />

                          <span>
                            {inventaire.emplacement_nom ||
                              inventaire.emplacement_code}
                          </span>
                        </div>
                      ) : (
                        <span className="inventaire-muted">
                          Tous les emplacements
                        </span>
                      )}
                    </td>

                    <td>
                      {inventaire.utilisateur_nom || (
                        <span className="inventaire-muted">
                          Non renseigné
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={getStatusClass(inventaire.statut)}>
                        <span />
                        {getStatusLabel(inventaire.statut)}
                      </span>
                    </td>

                    <td className="text-end">
                      <button
                        type="button"
                        className="inventaire-action-button"
                        onClick={() =>
                          void handleSelectInventaire(inventaire)
                        }
                      >
                        <i className="bi bi-eye" />
                        Consulter
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL */}
      {selectedInventaire && (
        <div className="inventaire-card inventaire-details-card">
          <div className="inventaire-card-header">
            <div>
              <div className="inventaire-details-title">
                <div className="inventaire-big-icon">
                  <i className="bi bi-clipboard-check" />
                </div>

                <div>
                  <h2>
                    {selectedInventaire.numero_inventaire}
                  </h2>

                  <p>
                    Inventaire du{" "}
                    {formatDate(selectedInventaire.date_inventaire)}
                  </p>
                </div>
              </div>
            </div>

            <div className="inventaire-detail-actions">
              {selectedInventaire.statut === "EN_COURS" && (
                <>
                  <button
                    type="button"
                    className="inventaire-danger-button"
                    onClick={() => void handleAnnuler()}
                  >
                    <i className="bi bi-x-circle" />
                    Annuler
                  </button>

                  <button
                    type="button"
                    className="inventaire-primary-button"
                    onClick={() => void handleTerminer()}
                  >
                    <i className="bi bi-check-circle" />
                    Terminer
                  </button>
                </>
              )}

              <button
                type="button"
                className="inventaire-secondary-button"
                onClick={() => {
                  setSelectedInventaire(null);
                  setDetails([]);
                }}
              >
                Fermer
              </button>
            </div>
          </div>

          {/* DETAIL STATS */}
          <div className="inventaire-detail-stats">
            <div>
              <span>Articles comptés</span>
              <strong>{detailStats.totalArticles}</strong>
            </div>

            <div>
              <span>Avec écart</span>
              <strong>{detailStats.articlesAvecEcart}</strong>
            </div>

            <div>
              <span>Excédents</span>
              <strong className="positive">
                {detailStats.ecartsPositifs}
              </strong>
            </div>

            <div>
              <span>Manquants</span>
              <strong className="negative">
                {detailStats.ecartsNegatifs}
              </strong>
            </div>
          </div>

          {/* DETAILS TABLE */}
          <div className="inventaire-table-container">
            <table className="inventaire-table inventaire-detail-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Unité</th>
                  <th>Stock théorique</th>
                  <th>Stock physique</th>
                  <th>Écart</th>
                  <th>Observation</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {detailsLoading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="inventaire-loading">
                        <span className="inventaire-loader" />
                        Chargement des articles...
                      </div>
                    </td>
                  </tr>
                ) : details.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="inventaire-empty">
                        <div className="inventaire-empty-icon">
                          <i className="bi bi-box-seam" />
                        </div>

                        <strong>
                          Aucun article dans cet inventaire
                        </strong>

                        <span>
                          Les détails de comptage seront affichés ici.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  details.map((detail) => {
                    const ecart = Number(detail.ecart);

                    return (
                      <tr key={detail.id_detail}>
                        <td>
                          <div className="inventaire-article">
                            <div className="inventaire-article-icon">
                              <i className="bi bi-box" />
                            </div>

                            <div>
                              <strong>{detail.designation}</strong>

                              <small>{detail.code}</small>
                            </div>
                          </div>
                        </td>

                        <td>{detail.unite || "-"}</td>

                        <td>
                          <strong>
                            {formatNumber(detail.stock_theorique)}
                          </strong>
                        </td>

                        <td>
                          <input
                            className="inventaire-quantity-input"
                            type="number"
                            min="0"
                            step="0.001"
                            value={detail.stock_physique}
                            disabled={
                              selectedInventaire.statut !== "EN_COURS"
                            }
                            onChange={(event) =>
                              handlePhysicalQuantityChange(
                                detail.id_detail,
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          {ecart === 0 ? (
                            <span className="inventaire-ecart normal">
                              0
                            </span>
                          ) : ecart > 0 ? (
                            <span className="inventaire-ecart positive">
                              +{formatNumber(ecart)}
                            </span>
                          ) : (
                            <span className="inventaire-ecart negative">
                              {formatNumber(ecart)}
                            </span>
                          )}
                        </td>

                        <td>
                          <input
                            className="inventaire-observation-input"
                            type="text"
                            value={detail.observation ?? ""}
                            disabled={
                              selectedInventaire.statut !== "EN_COURS"
                            }
                            placeholder="Observation..."
                            onChange={(event) =>
                              handleObservationChange(
                                detail.id_detail,
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          {selectedInventaire.statut === "EN_COURS" && (
                            <button
                              type="button"
                              className="inventaire-save-button"
                              onClick={() =>
                                void handleSaveDetail(detail)
                              }
                              title="Enregistrer"
                            >
                              <i className="bi bi-save" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}