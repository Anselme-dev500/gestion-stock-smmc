import { authFetch } from "../../services/auth";
import React, { useEffect, useMemo, useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../assets/css/approvisionnement-pages.css";

const API_URL = "/api/stock";

interface Fournisseur {
  id: number;
  nom: string;
  actif?: boolean;
}

interface Article {
  id: number;
  code: string;
  designation: string;
  unite?: string;
  quantite_stock?: number;
  actif?: boolean;
}

interface Entree {
  id: number;
  reference?: string;
  date_entree?: string;
  fournisseur_id?: number;
  fournisseur_nom?: string;
  article_id?: number;
  article_code?: string;
  article_designation?: string;
  quantite: number;
  prix_unitaire?: number;
  montant?: number;
  observation?: string;
  statut?: string;
  created_at?: string;
}

interface EntreeForm {
  reference: string;
  date_entree: string;
  fournisseur_id: string;
  article_id: string;
  quantite: string;
  prix_unitaire: string;
  observation: string;
}

const initialForm: EntreeForm = {
  reference: "",
  date_entree: new Date().toISOString().split("T")[0],
  fournisseur_id: "",
  article_id: "",
  quantite: "",
  prix_unitaire: "",
  observation: "",
};

function Entrees() {
  const [entrees, setEntrees] = useState<Entree[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState<EntreeForm>(initialForm);

  /* =========================================================
     CHARGER LES DONNÉES
  ========================================================= */

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        entreesResponse,
        fournisseursResponse,
        articlesResponse,
      ] = await Promise.all([
        authFetch(`${API_URL}/entrees`),
        authFetch(`${API_URL}/fournisseurs`),
        authFetch(`${API_URL}/articles`),
      ]);

      if (!entreesResponse.ok) {
        throw new Error(
          "Impossible de charger les entrées."
        );
      }

      const entreesData = await entreesResponse.json();

      const fournisseursData =
        fournisseursResponse.ok
          ? await fournisseursResponse.json()
          : [];

      const articlesData =
        articlesResponse.ok
          ? await articlesResponse.json()
          : [];

      const listeEntrees =
        Array.isArray(entreesData)
          ? entreesData
          : entreesData.data ||
            entreesData.entrees ||
            [];

      const listeFournisseurs =
        Array.isArray(fournisseursData)
          ? fournisseursData
          : fournisseursData.data ||
            fournisseursData.fournisseurs ||
            [];

      const listeArticles =
        Array.isArray(articlesData)
          ? articlesData
          : articlesData.data ||
            articlesData.articles ||
            [];

      setEntrees(listeEntrees);
      setFournisseurs(listeFournisseurs);
      setArticles(listeArticles);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des données."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* =========================================================
     NOTIFICATION
  ========================================================= */

  const showSuccess = (message: string) => {
    setSuccess(message);

    setTimeout(() => {
      setSuccess("");
    }, 3000);
  };

  /* =========================================================
     STATISTIQUES
  ========================================================= */

  const statistiques = useMemo(() => {
    const total = entrees.length;

    const validees = entrees.filter(
      (e) =>
        !e.statut ||
        e.statut.toLowerCase() === "valide" ||
        e.statut.toLowerCase() === "validée" ||
        e.statut.toLowerCase() === "validee"
    ).length;

    const brouillons = entrees.filter(
      (e) =>
        e.statut?.toLowerCase() === "brouillon"
    ).length;

    const quantiteTotale = entrees.reduce(
      (total, entree) =>
        total + Number(entree.quantite || 0),
      0
    );

    return {
      total,
      validees,
      brouillons,
      quantiteTotale,
    };
  }, [entrees]);

  /* =========================================================
     FILTRE
  ========================================================= */

  const entreesFiltrees = useMemo(() => {
    const valeur = search.trim().toLowerCase();

    return entrees.filter((entree) => {
      const correspondRecherche =
        valeur === "" ||
        entree.reference
          ?.toLowerCase()
          .includes(valeur) ||
        entree.fournisseur_nom
          ?.toLowerCase()
          .includes(valeur) ||
        entree.article_code
          ?.toLowerCase()
          .includes(valeur) ||
        entree.article_designation
          ?.toLowerCase()
          .includes(valeur);

      const statut =
        entree.statut?.toLowerCase() || "valide";

      const correspondStatut =
        statusFilter === "tous" ||
        statut === statusFilter;

      return (
        correspondRecherche &&
        correspondStatut
      );
    });
  }, [entrees, search, statusFilter]);

  /* =========================================================
     FORMULAIRE
  ========================================================= */

  const openModal = () => {
    setForm({
      ...initialForm,
      reference: `ENT-${new Date().getFullYear()}-${String(
        entrees.length + 1
      ).padStart(3, "0")}`,
    });

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (!saving) {
      setShowModal(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement |
      HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  };

  /* =========================================================
     MONTANT
  ========================================================= */

  const montant = useMemo(() => {
    const quantite = Number(form.quantite || 0);
    const prix = Number(form.prix_unitaire || 0);

    return quantite * prix;
  }, [form.quantite, form.prix_unitaire]);

  /* =========================================================
     ENREGISTRER
  ========================================================= */

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!form.fournisseur_id) {
      setError("Veuillez sélectionner un fournisseur.");
      return;
    }

    if (!form.article_id) {
      setError("Veuillez sélectionner un article.");
      return;
    }

    if (
      !form.quantite ||
      Number(form.quantite) <= 0
    ) {
      setError("La quantité doit être supérieure à 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        reference: form.reference,
        date_entree: form.date_entree,
        fournisseur_id: Number(form.fournisseur_id),
        article_id: Number(form.article_id),
        quantite: Number(form.quantite),
        prix_unitaire: Number(
          form.prix_unitaire || 0
        ),
        montant,
        observation: form.observation,
      };

      const response = await authFetch(
        `${API_URL}/entrees`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            "Impossible d'enregistrer l'entrée."
        );
      }

      await loadData();

      setShowModal(false);
      setForm(initialForm);

      showSuccess(
        "Entrée de stock enregistrée avec succès."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'enregistrement."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     SUPPRIMER
  ========================================================= */

  const handleDelete = async (id: number) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette entrée ?"
    );

    if (!confirmation) {
      return;
    }

    try {
      const response = await authFetch(
        `${API_URL}/entrees/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Impossible de supprimer cette entrée."
        );
      }

      await loadData();

      showSuccess("Entrée supprimée avec succès.");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la suppression."
      );
    }
  };

  /* =========================================================
     FORMAT MONÉTAIRE
  ========================================================= */

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("fr-FR").format(
      Number(value || 0)
    ) + " Ar";
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (date?: string) => {
    if (!date) return "—";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return date;
    }

    return d.toLocaleDateString("fr-FR");
  };

  /* =========================================================
     RENDU
  ========================================================= */

  return (
    <div className="appro-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="appro-page-header">

        <div>

          <div className="appro-breadcrumb">
            <span>Approvisionnement</span>

            <i className="bi bi-chevron-right"></i>

            <strong>Entrées</strong>
          </div>

          <h1>Entrées de stock</h1>

          <p>
            Enregistrez et suivez les entrées de
            marchandises dans le stock.
          </p>

        </div>

        <button
          className="appro-primary-button"
          onClick={openModal}
        >
          <i className="bi bi-box-arrow-in-down"></i>
          Nouvelle entrée
        </button>

      </div>

      {/* =====================================================
          NOTIFICATIONS
      ===================================================== */}

      {success && (
        <div className="appro-alert appro-alert-success">

          <i className="bi bi-check-circle-fill"></i>

          <span>{success}</span>

          <button onClick={() => setSuccess("")}>
            <i className="bi bi-x"></i>
          </button>

        </div>
      )}

      {error && !showModal && (
        <div className="appro-alert appro-alert-danger">

          <i className="bi bi-exclamation-triangle-fill"></i>

          <span>{error}</span>

          <button onClick={() => setError("")}>
            <i className="bi bi-x"></i>
          </button>

        </div>
      )}

      {/* =====================================================
          STATISTIQUES
      ===================================================== */}

      <div className="appro-stats-grid">

        <div className="appro-stat-card">

          <div className="appro-stat-icon blue">
            <i className="bi bi-box-arrow-in-down"></i>
          </div>

          <div>
            <span>Total des entrées</span>
            <strong>{statistiques.total}</strong>
          </div>

        </div>

        <div className="appro-stat-card">

          <div className="appro-stat-icon green">
            <i className="bi bi-check-circle"></i>
          </div>

          <div>
            <span>Entrées validées</span>
            <strong>{statistiques.validees}</strong>
          </div>

        </div>

        <div className="appro-stat-card">

          <div className="appro-stat-icon orange">
            <i className="bi bi-clock"></i>
          </div>

          <div>
            <span>Brouillons</span>
            <strong>{statistiques.brouillons}</strong>
          </div>

        </div>

        <div className="appro-stat-card">

          <div className="appro-stat-icon purple">
            <i className="bi bi-boxes"></i>
          </div>

          <div>
            <span>Quantité entrée</span>
            <strong>
              {statistiques.quantiteTotale}
            </strong>
          </div>

        </div>

      </div>

      {/* =====================================================
          TABLEAU
      ===================================================== */}

      <div className="appro-card">

        <div className="appro-card-header">

          <div>

            <h2>Historique des entrées</h2>

            <p>
              {entreesFiltrees.length} entrée(s)
              affichée(s)
            </p>

          </div>

          <button
            className="appro-refresh-button"
            onClick={loadData}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise"></i>
            Actualiser
          </button>

        </div>

        {/* FILTRES */}

        <div className="appro-filter-bar">

          <div className="appro-search">

            <i className="bi bi-search"></i>

            <input
              type="text"
              placeholder="Rechercher par référence, fournisseur ou article..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>

          <select
            className="appro-select"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="tous">
              Tous les statuts
            </option>

            <option value="valide">
              Validées
            </option>

            <option value="brouillon">
              Brouillons
            </option>
          </select>

        </div>

        {/* TABLE */}

        <div className="appro-table-container">

          {loading ? (

            <div className="appro-loading">

              <div className="spinner-border text-success"></div>

              <span>
                Chargement des entrées...
              </span>

            </div>

          ) : entreesFiltrees.length === 0 ? (

            <div className="appro-empty">

              <div className="appro-empty-icon">
                <i className="bi bi-box-seam"></i>
              </div>

              <h3>Aucune entrée trouvée</h3>

              <p>
                Aucune entrée de stock n'est
                actuellement enregistrée.
              </p>

              <button
                className="appro-primary-button"
                onClick={openModal}
              >
                <i className="bi bi-plus-lg"></i>
                Nouvelle entrée
              </button>

            </div>

          ) : (

            <table className="appro-table">

              <thead>

                <tr>
                  <th>Référence</th>
                  <th>Date</th>
                  <th>Fournisseur</th>
                  <th>Article</th>
                  <th>Quantité</th>
                  <th>Prix unitaire</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th className="text-end">
                    Actions
                  </th>
                </tr>

              </thead>

              <tbody>

                {entreesFiltrees.map((entree) => {

                  const total =
                    entree.montant ??
                    Number(entree.quantite || 0) *
                      Number(
                        entree.prix_unitaire || 0
                      );

                  const statut =
                    entree.statut?.toLowerCase() ||
                    "valide";

                  return (

                    <tr key={entree.id}>

                      <td>

                        <div className="reference-cell">

                          <div className="reference-icon">
                            <i className="bi bi-receipt"></i>
                          </div>

                          <strong>
                            {entree.reference ||
                              `ENT-${entree.id}`}
                          </strong>

                        </div>

                      </td>

                      <td>
                        {formatDate(
                          entree.date_entree
                        )}
                      </td>

                      <td>
                        {entree.fournisseur_nom ||
                          `Fournisseur #${entree.fournisseur_id}`}
                      </td>

                      <td>

                        <div className="article-cell">

                          <strong>
                            {entree.article_designation ||
                              "Article"}
                          </strong>

                          <small>
                            {entree.article_code ||
                              `#${entree.article_id}`}
                          </small>

                        </div>

                      </td>

                      <td>

                        <span className="quantity-badge">
                          +{entree.quantite}
                        </span>

                      </td>

                      <td>
                        {formatMoney(
                          Number(
                            entree.prix_unitaire || 0
                          )
                        )}
                      </td>

                      <td>

                        <strong className="amount-value">
                          {formatMoney(total)}
                        </strong>

                      </td>

                      <td>

                        {statut === "brouillon" ? (

                          <span className="appro-badge warning">
                            <i className="bi bi-clock-fill"></i>
                            Brouillon
                          </span>

                        ) : (

                          <span className="appro-badge success">
                            <i className="bi bi-check-circle-fill"></i>
                            Validée
                          </span>

                        )}

                      </td>

                      <td>

                        <div className="appro-actions">

                          <button
                            className="appro-action-button view"
                            title="Voir"
                            onClick={() =>
                              alert(
                                `Entrée : ${
                                  entree.reference ||
                                  entree.id
                                }`
                              )
                            }
                          >
                            <i className="bi bi-eye"></i>
                          </button>

                          <button
                            className="appro-action-button delete"
                            title="Supprimer"
                            onClick={() =>
                              handleDelete(
                                entree.id
                              )
                            }
                          >
                            <i className="bi bi-trash3"></i>
                          </button>

                        </div>

                      </td>

                    </tr>

                  );
                })}

              </tbody>

            </table>

          )}

        </div>

      </div>

      {/* =====================================================
          MODAL NOUVELLE ENTRÉE
      ===================================================== */}

      {showModal && (

        <div
          className="appro-modal-overlay"
          onMouseDown={(e) => {

            if (e.target === e.currentTarget) {
              closeModal();
            }

          }}
        >

          <div className="appro-modal">

            <div className="appro-modal-header">

              <div>

                <div className="appro-modal-icon">
                  <i className="bi bi-box-arrow-in-down"></i>
                </div>

                <div>

                  <h2>Nouvelle entrée</h2>

                  <p>
                    Enregistrez une nouvelle entrée
                    dans le stock.
                  </p>

                </div>

              </div>

              <button
                className="appro-modal-close"
                onClick={closeModal}
              >
                <i className="bi bi-x-lg"></i>
              </button>

            </div>

            {error && (

              <div className="appro-alert appro-alert-danger">

                <i className="bi bi-exclamation-triangle-fill"></i>

                {error}

              </div>

            )}

            <form onSubmit={handleSubmit}>

              <div className="appro-form-grid">

                <div className="appro-form-group">

                  <label>
                    Référence *
                  </label>

                  <div className="appro-input-icon">

                    <i className="bi bi-upc-scan"></i>

                    <input
                      name="reference"
                      value={form.reference}
                      onChange={handleChange}
                      placeholder="ENT-2026-001"
                      required
                    />

                  </div>

                </div>

                <div className="appro-form-group">

                  <label>
                    Date d'entrée *
                  </label>

                  <div className="appro-input-icon">

                    <i className="bi bi-calendar3"></i>

                    <input
                      type="date"
                      name="date_entree"
                      value={form.date_entree}
                      onChange={handleChange}
                      required
                    />

                  </div>

                </div>

                <div className="appro-form-group full">

                  <label>
                    Fournisseur *
                  </label>

                  <select
                    name="fournisseur_id"
                    value={form.fournisseur_id}
                    onChange={handleChange}
                    required
                  >

                    <option value="">
                      Sélectionner un fournisseur
                    </option>

                    {fournisseurs
                      .filter(
                        (f) =>
                          f.actif !== false
                      )
                      .map((fournisseur) => (

                        <option
                          key={fournisseur.id}
                          value={fournisseur.id}
                        >
                          {fournisseur.nom}
                        </option>

                      ))}

                  </select>

                </div>

                <div className="appro-form-group full">

                  <label>
                    Article *
                  </label>

                  <select
                    name="article_id"
                    value={form.article_id}
                    onChange={handleChange}
                    required
                  >

                    <option value="">
                      Sélectionner un article
                    </option>

                    {articles
                      .filter(
                        (article) =>
                          article.actif !== false
                      )
                      .map((article) => (

                        <option
                          key={article.id}
                          value={article.id}
                        >
                          {article.code} —{" "}
                          {article.designation}
                        </option>

                      ))}

                  </select>

                </div>

                <div className="appro-form-group">

                  <label>
                    Quantité *
                  </label>

                  <div className="appro-input-icon">

                    <i className="bi bi-boxes"></i>

                    <input
                      type="number"
                      name="quantite"
                      min="1"
                      step="0.01"
                      value={form.quantite}
                      onChange={handleChange}
                      placeholder="0"
                      required
                    />

                  </div>

                </div>

                <div className="appro-form-group">

                  <label>
                    Prix unitaire
                  </label>

                  <div className="appro-input-icon">

                    <i className="bi bi-cash-stack"></i>

                    <input
                      type="number"
                      name="prix_unitaire"
                      min="0"
                      step="0.01"
                      value={form.prix_unitaire}
                      onChange={handleChange}
                      placeholder="0"
                    />

                  </div>

                </div>

                <div className="appro-total-box full">

                  <div>

                    <span>
                      Montant total
                    </span>

                    <strong>
                      {formatMoney(montant)}
                    </strong>

                  </div>

                  <i className="bi bi-calculator"></i>

                </div>

                <div className="appro-form-group full">

                  <label>
                    Observation
                  </label>

                  <textarea
                    name="observation"
                    value={form.observation}
                    onChange={handleChange}
                    placeholder="Ajouter une observation..."
                    rows={4}
                  />

                </div>

              </div>

              <div className="appro-modal-footer">

                <button
                  type="button"
                  className="appro-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="appro-primary-button"
                  disabled={saving}
                >

                  {saving ? (

                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      Enregistrement...
                    </>

                  ) : (

                    <>
                      <i className="bi bi-check-lg"></i>
                      Enregistrer l'entrée
                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Entrees;
