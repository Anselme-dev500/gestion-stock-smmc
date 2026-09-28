import { authFetch } from "../../services/auth";
import React, { useEffect, useMemo, useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";

interface Retour {
  id: number;
  reference: string;
  date: string;
  article: string;
  code?: string;
  quantite: number;
  unite?: string;
  service?: string;
  responsable?: string;
  motif?: string;
  etat?: string;
}

interface Article {
  id: number;
  code: string;
  designation: string;
  unite: string;
}

const API_URL =
  import.meta.env.VITE_API_URL || "/api/stock";

const mockArticles: Article[] = [
  {
    id: 1,
    code: "ART-001",
    designation: "Stylo bleu",
    unite: "Unité",
  },
  {
    id: 2,
    code: "ART-002",
    designation: "Cahier",
    unite: "Unité",
  },
  {
    id: 3,
    code: "ART-003",
    designation: "Casque de sécurité",
    unite: "Unité",
  },
];

const mockRetours: Retour[] = [
  {
    id: 1,
    reference: "RET-001",
    date: "2026-09-21T10:30:00",
    article: "Casque de sécurité",
    code: "ART-003",
    quantite: 5,
    unite: "Unité",
    service: "Service sécurité",
    responsable: "Agent magasin",
    motif: "Fin d'utilisation",
    etat: "BON",
  },
  {
    id: 2,
    reference: "RET-002",
    date: "2026-09-20T15:10:00",
    article: "Cahier",
    code: "ART-002",
    quantite: 3,
    unite: "Unité",
    service: "Service administratif",
    responsable: "Chef de service",
    motif: "Retour matériel",
    etat: "BON",
  },
];

function Retours() {
  const [retours, setRetours] =
    useState<Retour[]>([]);

  const [articles, setArticles] =
    useState<Article[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [form, setForm] = useState({
    article_id: "",
    quantite: "",
    service: "",
    responsable: "",
    motif: "",
    etat: "BON",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      const [
        retoursResponse,
        articlesResponse,
      ] = await Promise.all([
        authFetch(`${API_URL}/retours`),
        authFetch(`${API_URL}/articles`),
      ]);

      if (!retoursResponse.ok) {
        throw new Error(
          "Impossible de charger les retours."
        );
      }

      const retoursData =
        await retoursResponse.json();

      const articlesData =
        articlesResponse.ok
          ? await articlesResponse.json()
          : [];

      const retourList =
        Array.isArray(retoursData)
          ? retoursData
          : retoursData.retours ||
            retoursData.data ||
            [];

      const articleList =
        Array.isArray(articlesData)
          ? articlesData
          : articlesData.articles ||
            articlesData.data ||
            [];

      setRetours(retourList);
      setArticles(articleList);
    } catch (err) {
      console.warn(err);

      setError(
        "Le serveur est indisponible. Les données de démonstration sont affichées."
      );

      setRetours(mockRetours);
      setArticles(mockArticles);
    } finally {
      setLoading(false);
    }
  };

  const filteredRetours = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return retours;
    }

    return retours.filter((retour) =>
      [
        retour.reference,
        retour.article,
        retour.code,
        retour.service,
        retour.responsable,
        retour.motif,
        retour.etat,
      ]
        .filter(Boolean)
        .some((field) =>
          field!.toLowerCase().includes(value)
        )
    );
  }, [retours, search]);

  const totalQuantite = useMemo(
    () =>
      retours.reduce(
        (total, retour) =>
          total + Number(retour.quantite || 0),
        0
      ),
    [retours]
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    if (
      !form.article_id ||
      !form.quantite ||
      !form.service
    ) {
      setError(
        "Veuillez remplir les champs obligatoires."
      );

      return;
    }

    setSaving(true);

    const payload = {
      article_id: Number(form.article_id),
      quantite: Number(form.quantite),
      service: form.service,
      responsable: form.responsable,
      motif: form.motif,
      etat: form.etat,
    };

    try {
      const response = await authFetch(
        `${API_URL}/retours`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Impossible d'enregistrer le retour."
        );
      }

      await loadData();

      setForm({
        article_id: "",
        quantite: "",
        service: "",
        responsable: "",
        motif: "",
        etat: "BON",
      });

      setShowForm(false);
    } catch (err) {
      console.warn(err);

      setError(
        "Impossible d'enregistrer le retour. Vérifiez que le backend est démarré."
      );
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getEtatClass = (etat?: string) => {
    switch (etat) {
      case "BON":
        return "movement-status success";

      case "ENDOMMAGE":
        return "movement-status warning";

      case "HORS_SERVICE":
        return "movement-status danger";

      default:
        return "movement-status";
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

            <i className="bi bi-chevron-right" />

            Retours

          </div>

          <h1>
            Retours de matériel
          </h1>

          <p>
            Gérez les matériels retournés par les
            différents services.
          </p>

        </div>

        <button
          className="movement-primary-btn"
          onClick={() =>
            setShowForm((previous) => !previous)
          }
        >

          <i className="bi bi-plus-lg" />

          Nouveau retour

        </button>

      </div>

      {/* ERROR */}

      {error && (
        <div className="movement-alert">

          <i className="bi bi-exclamation-circle" />

          <span>{error}</span>

        </div>
      )}

      {/* STATS */}

      <div className="movement-stat-grid">

        <div className="movement-stat-card">

          <div className="movement-stat-icon purple">
            <i className="bi bi-arrow-counterclockwise" />
          </div>

          <div>
            <span>Total retours</span>
            <strong>{retours.length}</strong>
          </div>

        </div>

        <div className="movement-stat-card">

          <div className="movement-stat-icon green">
            <i className="bi bi-box-seam" />
          </div>

          <div>
            <span>Articles retournés</span>
            <strong>{totalQuantite}</strong>
          </div>

        </div>

      </div>

      {/* FORMULAIRE */}

      {showForm && (
        <div className="movement-form-card">

          <div className="movement-card-header">

            <div>

              <h2>
                Nouveau retour
              </h2>

              <p>
                Enregistrez le retour d'un matériel.
              </p>

            </div>

            <button
              className="movement-close-btn"
              onClick={() =>
                setShowForm(false)
              }
            >
              <i className="bi bi-x-lg" />
            </button>

          </div>

          <form onSubmit={handleSubmit}>

            <div className="movement-form-grid">

              <div className="movement-field">

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

                  {articles.map((article) => (
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

              <div className="movement-field">

                <label>
                  Quantité *
                </label>

                <input
                  type="number"
                  min="1"
                  name="quantite"
                  value={form.quantite}
                  onChange={handleChange}
                  placeholder="Ex. 5"
                  required
                />

              </div>

              <div className="movement-field">

                <label>
                  Service *
                </label>

                <input
                  type="text"
                  name="service"
                  value={form.service}
                  onChange={handleChange}
                  placeholder="Ex. Service sécurité"
                  required
                />

              </div>

              <div className="movement-field">

                <label>
                  Responsable
                </label>

                <input
                  type="text"
                  name="responsable"
                  value={form.responsable}
                  onChange={handleChange}
                  placeholder="Nom du responsable"
                />

              </div>

              <div className="movement-field">

                <label>
                  État du matériel
                </label>

                <select
                  name="etat"
                  value={form.etat}
                  onChange={handleChange}
                >

                  <option value="BON">
                    Bon état
                  </option>

                  <option value="ENDOMMAGE">
                    Endommagé
                  </option>

                  <option value="HORS_SERVICE">
                    Hors service
                  </option>

                </select>

              </div>

              <div className="movement-field full">

                <label>
                  Motif du retour
                </label>

                <textarea
                  name="motif"
                  value={form.motif}
                  onChange={handleChange}
                  placeholder="Motif du retour..."
                  rows={3}
                />

              </div>

            </div>

            <div className="movement-form-actions">

              <button
                type="button"
                className="movement-secondary-btn"
                onClick={() =>
                  setShowForm(false)
                }
              >
                Annuler
              </button>

              <button
                type="submit"
                className="movement-primary-btn"
                disabled={saving}
              >

                {saving ? (
                  <>
                    <span className="movement-spinner" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg" />
                    Enregistrer le retour
                  </>
                )}

              </button>

            </div>

          </form>

        </div>
      )}

      {/* LISTE */}

      <div className="movement-card">

        <div className="movement-card-header">

          <div>

            <h2>
              Liste des retours
            </h2>

            <p>
              {filteredRetours.length} retour(s)
            </p>

          </div>

          <div className="movement-search">

            <i className="bi bi-search" />

            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>

        </div>

        <div className="movement-table-wrapper">

          <table className="movement-table">

            <thead>

              <tr>
                <th>Référence</th>
                <th>Date</th>
                <th>Article</th>
                <th>Quantité</th>
                <th>Service</th>
                <th>Responsable</th>
                <th>Motif</th>
                <th>État</th>
              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>

                  <td
                    colSpan={8}
                    className="movement-empty"
                  >
                    Chargement...
                  </td>

                </tr>

              ) : filteredRetours.length === 0 ? (

                <tr>

                  <td
                    colSpan={8}
                    className="movement-empty"
                  >

                    <i className="bi bi-inbox" />

                    <strong>
                      Aucun retour
                    </strong>

                    <span>
                      Aucun retour ne correspond
                      à votre recherche.
                    </span>

                  </td>

                </tr>

              ) : (

                filteredRetours.map((retour) => (

                  <tr key={retour.id}>

                    <td>

                      <strong className="movement-reference">
                        {retour.reference}
                      </strong>

                    </td>

                    <td>
                      {formatDate(retour.date)}
                    </td>

                    <td>

                      <div className="movement-article">

                        <div className="movement-article-icon">
                          <i className="bi bi-box" />
                        </div>

                        <div>

                          <strong>
                            {retour.article}
                          </strong>

                          <small>
                            {retour.code || "-"}
                          </small>

                        </div>

                      </div>

                    </td>

                    <td>

                      <strong>
                        {retour.quantite}
                      </strong>{" "}

                      {retour.unite}

                    </td>

                    <td>
                      {retour.service || "-"}
                    </td>

                    <td>
                      {retour.responsable || "-"}
                    </td>

                    <td>
                      {retour.motif || "-"}
                    </td>

                    <td>

                      <span
                        className={getEtatClass(
                          retour.etat
                        )}
                      >

                        <i className="bi bi-check-circle" />

                        {retour.etat || "BON"}

                      </span>

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

export default Retours;
