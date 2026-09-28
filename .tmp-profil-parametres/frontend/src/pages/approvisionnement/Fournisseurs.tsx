import { authFetch } from "../../services/auth";
import React, { useEffect, useMemo, useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../assets/css/approvisionnement-pages.css";

const API_URL = "/api/stock";

interface Fournisseur {
  id: number;
  nom: string;
  contact?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  actif: boolean;
  created_at?: string;
}

interface FournisseurForm {
  nom: string;
  contact: string;
  telephone: string;
  email: string;
  adresse: string;
  actif: boolean;
}

const initialForm: FournisseurForm = {
  nom: "",
  contact: "",
  telephone: "",
  email: "",
  adresse: "",
  actif: true,
};

function Fournisseurs() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<FournisseurForm>(initialForm);

  /* =========================================================
     CHARGEMENT
  ========================================================= */

  const loadFournisseurs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await authFetch(`${API_URL}/fournisseurs`);

      if (!response.ok) {
        throw new Error("Impossible de charger les fournisseurs.");
      }

      const data = await response.json();

      /*
       * Accepte plusieurs formats possibles :
       * []
       * { data: [] }
       * { fournisseurs: [] }
       */
      const liste =
        Array.isArray(data)
          ? data
          : data.data || data.fournisseurs || [];

      setFournisseurs(liste);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des fournisseurs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFournisseurs();
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
    const total = fournisseurs.length;

    const actifs = fournisseurs.filter(
      (f) => f.actif === true
    ).length;

    const inactifs = fournisseurs.filter(
      (f) => f.actif === false
    ).length;

    const avecEmail = fournisseurs.filter(
      (f) => f.email && f.email.trim() !== ""
    ).length;

    return {
      total,
      actifs,
      inactifs,
      avecEmail,
    };
  }, [fournisseurs]);

  /* =========================================================
     FILTRE
  ========================================================= */

  const fournisseursFiltres = useMemo(() => {
    const valeur = search.trim().toLowerCase();

    return fournisseurs.filter((fournisseur) => {
      const correspondRecherche =
        valeur === "" ||
        fournisseur.nom?.toLowerCase().includes(valeur) ||
        fournisseur.contact?.toLowerCase().includes(valeur) ||
        fournisseur.telephone?.toLowerCase().includes(valeur) ||
        fournisseur.email?.toLowerCase().includes(valeur);

      const correspondStatut =
        statusFilter === "tous" ||
        (statusFilter === "actif" && fournisseur.actif) ||
        (statusFilter === "inactif" && !fournisseur.actif);

      return correspondRecherche && correspondStatut;
    });
  }, [fournisseurs, search, statusFilter]);

  /* =========================================================
     FORMULAIRE
  ========================================================= */

  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (fournisseur: Fournisseur) => {
    setEditingId(fournisseur.id);

    setForm({
      nom: fournisseur.nom || "",
      contact: fournisseur.contact || "",
      telephone: fournisseur.telephone || "",
      email: fournisseur.email || "",
      adresse: fournisseur.adresse || "",
      actif: fournisseur.actif,
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!form.nom.trim()) {
      setError("Le nom du fournisseur est obligatoire.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const url = editingId
        ? `${API_URL}/fournisseurs/${editingId}`
        : `${API_URL}/fournisseurs`;

      const method = editingId ? "PUT" : "POST";

      const response = await authFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || "Erreur lors de l'enregistrement."
        );
      }

      await loadFournisseurs();

      setShowModal(false);

      showSuccess(
        editingId
          ? "Fournisseur modifié avec succès."
          : "Fournisseur ajouté avec succès."
      );

      setForm(initialForm);
      setEditingId(null);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'enregistrer le fournisseur."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     SUPPRESSION
  ========================================================= */

  const handleDelete = async (id: number) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer ce fournisseur ?"
    );

    if (!confirmation) {
      return;
    }

    try {
      setError("");

      const response = await authFetch(
        `${API_URL}/fournisseurs/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Impossible de supprimer le fournisseur."
        );
      }

      await loadFournisseurs();

      showSuccess("Fournisseur supprimé avec succès.");
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
     RENDU
  ========================================================= */

  return (
    <div className="appro-page">

      {/* =====================================================
          EN-TÊTE
      ===================================================== */}

      <div className="appro-page-header">

        <div>
          <div className="appro-breadcrumb">
            <span>Approvisionnement</span>
            <i className="bi bi-chevron-right"></i>
            <strong>Fournisseurs</strong>
          </div>

          <h1>Fournisseurs</h1>

          <p>
            Gérez les fournisseurs et leurs informations
            de contact.
          </p>
        </div>

        <button
          className="appro-primary-button"
          onClick={openCreateModal}
        >
          <i className="bi bi-plus-lg"></i>
          Nouveau fournisseur
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
            <i className="bi bi-buildings"></i>
          </div>

          <div>
            <span>Total fournisseurs</span>
            <strong>{statistiques.total}</strong>
          </div>
        </div>

        <div className="appro-stat-card">
          <div className="appro-stat-icon green">
            <i className="bi bi-check-circle"></i>
          </div>

          <div>
            <span>Fournisseurs actifs</span>
            <strong>{statistiques.actifs}</strong>
          </div>
        </div>

        <div className="appro-stat-card">
          <div className="appro-stat-icon orange">
            <i className="bi bi-pause-circle"></i>
          </div>

          <div>
            <span>Inactifs</span>
            <strong>{statistiques.inactifs}</strong>
          </div>
        </div>

        <div className="appro-stat-card">
          <div className="appro-stat-icon purple">
            <i className="bi bi-envelope"></i>
          </div>

          <div>
            <span>Avec email</span>
            <strong>{statistiques.avecEmail}</strong>
          </div>
        </div>

      </div>

      {/* =====================================================
          TABLEAU
      ===================================================== */}

      <div className="appro-card">

        <div className="appro-card-header">

          <div>
            <h2>Liste des fournisseurs</h2>

            <p>
              {fournisseursFiltres.length} fournisseur(s)
              affiché(s)
            </p>
          </div>

          <button
            className="appro-refresh-button"
            onClick={loadFournisseurs}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise"></i>
            Actualiser
          </button>

        </div>

        {/* BARRE FILTRE */}

        <div className="appro-filter-bar">

          <div className="appro-search">
            <i className="bi bi-search"></i>

            <input
              type="text"
              placeholder="Rechercher un fournisseur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="appro-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="tous">Tous les statuts</option>
            <option value="actif">Actifs</option>
            <option value="inactif">Inactifs</option>
          </select>

        </div>

        {/* TABLE */}

        <div className="appro-table-container">

          {loading ? (
            <div className="appro-loading">
              <div className="spinner-border text-success"></div>
              <span>Chargement des fournisseurs...</span>
            </div>
          ) : fournisseursFiltres.length === 0 ? (

            <div className="appro-empty">

              <div className="appro-empty-icon">
                <i className="bi bi-buildings"></i>
              </div>

              <h3>Aucun fournisseur trouvé</h3>

              <p>
                Aucun fournisseur ne correspond aux
                critères de recherche.
              </p>

              <button
                className="appro-primary-button"
                onClick={openCreateModal}
              >
                <i className="bi bi-plus-lg"></i>
                Ajouter un fournisseur
              </button>

            </div>

          ) : (

            <table className="appro-table">

              <thead>
                <tr>
                  <th>Fournisseur</th>
                  <th>Contact</th>
                  <th>Téléphone</th>
                  <th>Email</th>
                  <th>Adresse</th>
                  <th>Statut</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>

              <tbody>

                {fournisseursFiltres.map((fournisseur) => (

                  <tr key={fournisseur.id}>

                    <td>
                      <div className="supplier-cell">

                        <div className="supplier-avatar">
                          {fournisseur.nom
                            ?.charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {fournisseur.nom}
                          </strong>

                          <small>
                            #{fournisseur.id}
                          </small>
                        </div>

                      </div>
                    </td>

                    <td>
                      {fournisseur.contact || (
                        <span className="text-muted">
                          —
                        </span>
                      )}
                    </td>

                    <td>
                      {fournisseur.telephone || (
                        <span className="text-muted">
                          —
                        </span>
                      )}
                    </td>

                    <td>
                      {fournisseur.email || (
                        <span className="text-muted">
                          —
                        </span>
                      )}
                    </td>

                    <td>
                      {fournisseur.adresse || (
                        <span className="text-muted">
                          —
                        </span>
                      )}
                    </td>

                    <td>

                      {fournisseur.actif ? (
                        <span className="appro-badge success">
                          <i className="bi bi-check-circle-fill"></i>
                          Actif
                        </span>
                      ) : (
                        <span className="appro-badge muted">
                          <i className="bi bi-dash-circle-fill"></i>
                          Inactif
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
                              `Fournisseur : ${fournisseur.nom}`
                            )
                          }
                        >
                          <i className="bi bi-eye"></i>
                        </button>

                        <button
                          className="appro-action-button edit"
                          title="Modifier"
                          onClick={() =>
                            openEditModal(fournisseur)
                          }
                        >
                          <i className="bi bi-pencil"></i>
                        </button>

                        <button
                          className="appro-action-button delete"
                          title="Supprimer"
                          onClick={() =>
                            handleDelete(fournisseur.id)
                          }
                        >
                          <i className="bi bi-trash3"></i>
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </div>

      {/* =====================================================
          MODAL FOURNISSEUR
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
                  <i className="bi bi-building-add"></i>
                </div>

                <div>
                  <h2>
                    {editingId
                      ? "Modifier le fournisseur"
                      : "Nouveau fournisseur"}
                  </h2>

                  <p>
                    Renseignez les informations du
                    fournisseur.
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

                <div className="appro-form-group full">
                  <label>
                    Nom du fournisseur *
                  </label>

                  <div className="appro-input-icon">
                    <i className="bi bi-building"></i>

                    <input
                      name="nom"
                      value={form.nom}
                      onChange={handleChange}
                      placeholder="Ex. Fournitures Générales"
                      required
                    />
                  </div>
                </div>

                <div className="appro-form-group">
                  <label>Personne de contact</label>

                  <div className="appro-input-icon">
                    <i className="bi bi-person"></i>

                    <input
                      name="contact"
                      value={form.contact}
                      onChange={handleChange}
                      placeholder="Nom du contact"
                    />
                  </div>
                </div>

                <div className="appro-form-group">
                  <label>Téléphone</label>

                  <div className="appro-input-icon">
                    <i className="bi bi-telephone"></i>

                    <input
                      name="telephone"
                      value={form.telephone}
                      onChange={handleChange}
                      placeholder="+261..."
                    />
                  </div>
                </div>

                <div className="appro-form-group">
                  <label>Email</label>

                  <div className="appro-input-icon">
                    <i className="bi bi-envelope"></i>

                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="contact@entreprise.mg"
                    />
                  </div>
                </div>

                <div className="appro-form-group">
                  <label>Statut</label>

                  <select
                    name="actif"
                    value={form.actif ? "true" : "false"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        actif: e.target.value === "true",
                      })
                    }
                  >
                    <option value="true">Actif</option>
                    <option value="false">Inactif</option>
                  </select>
                </div>

                <div className="appro-form-group full">
                  <label>Adresse</label>

                  <textarea
                    name="adresse"
                    value={form.adresse}
                    onChange={handleChange}
                    placeholder="Adresse du fournisseur..."
                    rows={3}
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
                      {editingId
                        ? "Enregistrer les modifications"
                        : "Créer le fournisseur"}
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

export default Fournisseurs;
