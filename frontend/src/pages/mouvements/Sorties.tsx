import { authFetch } from "../../services/auth";
import React, { useEffect, useMemo, useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";

interface Sortie {
  id: number;
  reference: string;
  date: string;
  article: string;
  code?: string;
  quantite: number;
  unite?: string;
  service?: string;
  demandeur?: string;
  motif?: string;
  statut?: string;
}

interface Article {
  id: number;
  code: string;
  designation: string;
  unite: string;
  stock: number;
}

const API_URL =
  import.meta.env.VITE_API_URL || "/api/stock";

const mockArticles: Article[] = [
  {
    id: 1,
    code: "ART-001",
    designation: "Stylo bleu",
    unite: "Unité",
    stock: 150,
  },
  {
    id: 2,
    code: "ART-002",
    designation: "Cahier 200 pages",
    unite: "Unité",
    stock: 80,
  },
  {
    id: 3,
    code: "ART-003",
    designation: "Enveloppe",
    unite: "Paquet",
    stock: 40,
  },
];

const mockSorties: Sortie[] = [
  {
    id: 1,
    reference: "SOR-001",
    date: "2026-09-21T09:15:00",
    article: "Cahier 200 pages",
    code: "ART-002",
    quantite: 20,
    unite: "Unité",
    service: "Service administratif",
    demandeur: "Chef de service",
    motif: "Demande de fourniture",
    statut: "VALIDEE",
  },
  {
    id: 2,
    reference: "SOR-002",
    date: "2026-09-20T11:30:00",
    article: "Stylo bleu",
    code: "ART-001",
    quantite: 15,
    unite: "Unité",
    service: "Service informatique",
    demandeur: "Responsable informatique",
    motif: "Besoin du service",
    statut: "VALIDEE",
  },
];

function Sorties() {
  const [sorties, setSorties] =
    useState<Sortie[]>([]);

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
    demandeur: "",
    motif: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      const [sortiesResponse, articlesResponse] =
        await Promise.all([
          authFetch(`${API_URL}/sorties`),
          authFetch(`${API_URL}/articles`),
        ]);

      if (!sortiesResponse.ok) {
        throw new Error(
          "Impossible de charger les sorties."
        );
      }

      const sortiesData =
        await sortiesResponse.json();

      const articlesData =
        articlesResponse.ok
          ? await articlesResponse.json()
          : [];

      setSorties(
        Array.isArray(sortiesData)
          ? sortiesData
          : sortiesData.sorties ||
              sortiesData.data ||
              []
      );

      const articleList =
        Array.isArray(articlesData)
          ? articlesData
          : articlesData.articles ||
            articlesData.data ||
            [];

      setArticles(articleList);
    } catch (err) {
      console.warn(err);

      setError(
        "Le serveur est indisponible. Les données de démonstration sont affichées."
      );

      setSorties(mockSorties);
      setArticles(mockArticles);
    } finally {
      setLoading(false);
    }
  };

  const filteredSorties = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return sorties;
    }

    return sorties.filter((sortie) =>
      [
        sortie.reference,
        sortie.article,
        sortie.code,
        sortie.service,
        sortie.demandeur,
        sortie.motif,
      ]
        .filter(Boolean)
        .some((field) =>
          field!.toLowerCase().includes(value)
        )
    );
  }, [sorties, search]);

  const totalQuantite = useMemo(
    () =>
      sorties.reduce(
        (total, sortie) =>
          total + Number(sortie.quantite || 0),
        0
      ),
    [sorties]
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

    const selectedArticle = articles.find(
      (article) =>
        String(article.id) === form.article_id
    );

    if (
      selectedArticle &&
      Number(form.quantite) >
        Number(selectedArticle.stock)
    ) {
      setError(
        "La quantité demandée dépasse le stock disponible."
      );

      return;
    }

    setSaving(true);

    const payload = {
      article_id: Number(form.article_id),
      quantite: Number(form.quantite),
      service: form.service,
      demandeur: form.demandeur,
      motif: form.motif,
    };

    try {
      const response = await authFetch(
        `${API_URL}/sorties`,
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
          "Impossible d'enregistrer la sortie."
        );
      }

      await loadData();

      setForm({
        article_id: "",
        quantite: "",
        service: "",
        demandeur: "",
        motif: "",
      });

      setShowForm(false);
    } catch (err) {
      console.warn(err);

      setError(
        "Impossible d'enregistrer la sortie. Vérifiez que le backend est démarré."
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
            Sorties
          </div>

          <h1>
            Sorties de stock
          </h1>

          <p>
            Enregistrez et consultez les sorties de
            matériel destinées aux différents services.
          </p>

        </div>

        <button
          className="movement-primary-btn"
          onClick={() =>
            setShowForm((previous) => !previous)
          }
        >
          <i className="bi bi-plus-lg" />

          Nouvelle sortie
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

          <div className="movement-stat-icon blue">
            <i className="bi bi-receipt" />
          </div>

          <div>
            <span>Total sorties</span>
            <strong>{sorties.length}</strong>
          </div>

        </div>

        <div className="movement-stat-card">

          <div className="movement-stat-icon orange">
            <i className="bi bi-box-arrow-up" />
          </div>

          <div>
            <span>Articles sortis</span>
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
                Nouvelle sortie
              </h2>

              <p>
                Renseignez les informations de la sortie.
              </p>

            </div>

            <button
              className="movement-close-btn"
              onClick={() => setShowForm(false)}
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
                      {article.designation}{" "}
                      ({article.stock}{" "}
                      {article.unite})
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
                  placeholder="Ex. 10"
                  required
                />

              </div>

              <div className="movement-field">

                <label>
                  Service bénéficiaire *
                </label>

                <input
                  type="text"
                  name="service"
                  value={form.service}
                  onChange={handleChange}
                  placeholder="Ex. Service administratif"
                  required
                />

              </div>

              <div className="movement-field">

                <label>
                  Demandeur
                </label>

                <input
                  type="text"
                  name="demandeur"
                  value={form.demandeur}
                  onChange={handleChange}
                  placeholder="Nom du demandeur"
                />

              </div>

              <div className="movement-field full">

                <label>
                  Motif
                </label>

                <textarea
                  name="motif"
                  value={form.motif}
                  onChange={handleChange}
                  placeholder="Motif de la sortie..."
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
                    Enregistrer la sortie
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
              Liste des sorties
            </h2>

            <p>
              {filteredSorties.length} sortie(s)
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
                <th>Demandeur</th>
                <th>Motif</th>
                <th>Statut</th>
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
              ) : filteredSorties.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="movement-empty"
                  >
                    <i className="bi bi-inbox" />

                    <strong>
                      Aucune sortie
                    </strong>

                    <span>
                      Aucune sortie ne correspond
                      à votre recherche.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredSorties.map((sortie) => (
                  <tr key={sortie.id}>

                    <td>
                      <strong className="movement-reference">
                        {sortie.reference}
                      </strong>
                    </td>

                    <td>
                      {formatDate(sortie.date)}
                    </td>

                    <td>

                      <div className="movement-article">

                        <div className="movement-article-icon">
                          <i className="bi bi-box" />
                        </div>

                        <div>
                          <strong>
                            {sortie.article}
                          </strong>

                          <small>
                            {sortie.code || "-"}
                          </small>
                        </div>

                      </div>

                    </td>

                    <td>
                      <strong>
                        {sortie.quantite}
                      </strong>{" "}
                      {sortie.unite}
                    </td>

                    <td>
                      {sortie.service || "-"}
                    </td>

                    <td>
                      {sortie.demandeur || "-"}
                    </td>

                    <td>
                      {sortie.motif || "-"}
                    </td>

                    <td>

                      <span className="movement-status success">
                        <i className="bi bi-check-circle" />
                        {sortie.statut || "VALIDEE"}
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

export default Sorties;
