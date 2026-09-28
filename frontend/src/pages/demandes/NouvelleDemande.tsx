import {
  useEffect,
  useState,
} from "react";

import {
  createDemande,
  getArticlesForDemandes,
  type ArticleOption,
} from "../../services/demandesApi";

import { useNavigate } from "react-router-dom";

import "../../assets/css/demandes.css";

interface LigneArticle {
  article_id: number | "";
  quantite: number;
  commentaire: string;
}

function NouvelleDemande() {
  const navigate = useNavigate();

  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [loadingArticles, setLoadingArticles] =
    useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [priorite, setPriorite] =
    useState("normale");

  const [motif, setMotif] =
    useState("");

  const [commentaire, setCommentaire] =
    useState("");

  const [lignes, setLignes] =
    useState<LigneArticle[]>([
      {
        article_id: "",
        quantite: 1,
        commentaire: "",
      },
    ]);

  useEffect(() => {
    let cancelled = false;

    getArticlesForDemandes()
      .then((data) => {
        if (!cancelled) {
          setArticles(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les articles."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingArticles(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function addLine() {
    setLignes((previous) => [
      ...previous,
      {
        article_id: "",
        quantite: 1,
        commentaire: "",
      },
    ]);
  }

  function removeLine(index: number) {
    setLignes((previous) =>
      previous.filter((_, current) => current !== index)
    );
  }

  function updateLine(
    index: number,
    field: keyof LigneArticle,
    value: string | number
  ) {
    setLignes((previous) =>
      previous.map((ligne, current) =>
        current === index
          ? {
              ...ligne,
              [field]: value,
            }
          : ligne
      )
    );
  }

  function getSelectedArticle(id: number | "") {
    return articles.find(
      (article) => article.id === Number(id)
    );
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (lignes.length === 0) {
      setError(
        "Ajoutez au moins un article à la demande."
      );
      return;
    }

    const invalidLine = lignes.some(
      (ligne) =>
        !ligne.article_id ||
        Number(ligne.quantite) <= 0
    );

    if (invalidLine) {
      setError(
        "Veuillez sélectionner un article et une quantité valide pour chaque ligne."
      );
      return;
    }

    setSaving(true);

    try {
      await createDemande({
        priorite,
        motif,
        commentaire,

        articles: lignes.map((ligne) => ({
          article_id: Number(ligne.article_id),
          quantite: Number(ligne.quantite),
          commentaire: ligne.commentaire,
        })),
      });

      setSuccess(
        "La demande a été créée avec succès."
      );

      setTimeout(() => {
        navigate("/demandes");
      }, 800);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer la demande."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="demandes-page">

      {/* HEADER */}

      <div className="page-header-modern">

        <div>

          <div className="breadcrumb-modern">

            <span>Gestion du stock</span>

            <i className="bi bi-chevron-right" />

            <span>Demandes</span>

            <i className="bi bi-chevron-right" />

            <strong>Nouvelle demande</strong>

          </div>

          <h1>Nouvelle demande</h1>

          <p>
            Créez une demande de fourniture pour votre service.
          </p>

        </div>

      </div>

      {/* ALERT */}

      {error && (

        <div className="alert-modern alert-danger-modern">

          <i className="bi bi-exclamation-triangle-fill" />

          <div>
            <strong>Attention</strong>
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <i className="bi bi-x-lg" />
          </button>

        </div>

      )}

      {success && (

        <div className="alert-modern alert-success-modern">

          <i className="bi bi-check-circle-fill" />

          <div>
            <strong>Succès</strong>
            <span>{success}</span>
          </div>

        </div>

      )}

      <form
        className="form-layout-modern"
        onSubmit={handleSubmit}
      >

        {/* INFORMATIONS */}

        <div className="form-card-modern">

          <div className="form-card-header-modern">

            <div className="form-section-icon">
              <i className="bi bi-file-earmark-text" />
            </div>

            <div>
              <h2>Informations de la demande</h2>

              <p>
                Renseignez les informations générales.
              </p>
            </div>

          </div>

          <div className="form-grid-modern">

            <div className="form-group-modern">

              <label>
                Priorité
                <span>*</span>
              </label>

              <select
                value={priorite}
                onChange={(event) =>
                  setPriorite(event.target.value)
                }
              >
                <option value="basse">
                  Basse
                </option>

                <option value="normale">
                  Normale
                </option>

                <option value="haute">
                  Haute
                </option>

                <option value="urgente">
                  Urgente
                </option>
              </select>

            </div>

            <div className="form-group-modern">

              <label>Motif</label>

              <input
                type="text"
                placeholder="Ex. Besoin de fournitures de bureau"
                value={motif}
                onChange={(event) =>
                  setMotif(event.target.value)
                }
              />

            </div>

            <div className="form-group-modern full">

              <label>Commentaire</label>

              <textarea
                rows={4}
                placeholder="Ajoutez une remarque concernant cette demande..."
                value={commentaire}
                onChange={(event) =>
                  setCommentaire(event.target.value)
                }
              />

            </div>

          </div>

        </div>

        {/* ARTICLES */}

        <div className="form-card-modern">

          <div className="form-card-header-modern">

            <div className="form-section-icon">
              <i className="bi bi-box-seam" />
            </div>

            <div>

              <h2>Articles demandés</h2>

              <p>
                Sélectionnez les articles et indiquez les quantités.
              </p>

            </div>

          </div>

          {loadingArticles ? (

            <div className="inline-loading-modern">
              <div className="loading-spinner-modern small" />
              Chargement des articles...
            </div>

          ) : (

            <div className="request-lines-modern">

              {lignes.map((ligne, index) => {

                const article =
                  getSelectedArticle(
                    ligne.article_id
                  );

                return (

                  <div
                    className="request-line-modern"
                    key={index}
                  >

                    <div className="line-number-modern">
                      {index + 1}
                    </div>

                    <div className="line-field article-field">

                      <label>Article</label>

                      <select
                        value={ligne.article_id}
                        onChange={(event) =>
                          updateLine(
                            index,
                            "article_id",
                            event.target.value
                              ? Number(
                                  event.target.value
                                )
                              : ""
                          )
                        }
                      >

                        <option value="">
                          Sélectionner un article
                        </option>

                        {articles.map(
                          (item) => (

                            <option
                              key={item.id}
                              value={item.id}
                            >
                              {item.code} —{" "}
                              {item.designation}
                            </option>

                          )
                        )}

                      </select>

                      {article && (
                        <small>
                          Stock disponible :{" "}
                          {article.quantite_stock ??
                            0}{" "}
                          {article.unite}
                        </small>
                      )}

                    </div>

                    <div className="line-field quantity-field">

                      <label>Quantité</label>

                      <input
                        type="number"
                        min="1"
                        value={ligne.quantite}
                        onChange={(event) =>
                          updateLine(
                            index,
                            "quantite",
                            Number(
                              event.target.value
                            )
                          )
                        }
                      />

                    </div>

                    <div className="line-field comment-field">

                      <label>Commentaire</label>

                      <input
                        type="text"
                        placeholder="Optionnel"
                        value={
                          ligne.commentaire
                        }
                        onChange={(event) =>
                          updateLine(
                            index,
                            "commentaire",
                            event.target.value
                          )
                        }
                      />

                    </div>

                    <button
                      type="button"
                      className="remove-line-modern"
                      title="Supprimer"
                      disabled={
                        lignes.length === 1
                      }
                      onClick={() =>
                        removeLine(index)
                      }
                    >
                      <i className="bi bi-trash3" />
                    </button>

                  </div>

                );
              })}

              <button
                type="button"
                className="add-line-modern"
                onClick={addLine}
              >
                <i className="bi bi-plus-circle" />
                Ajouter un article
              </button>

            </div>

          )}

        </div>

        {/* ACTIONS */}

        <div className="form-actions-modern">

          <button
            type="button"
            className="btn-secondary-modern"
            onClick={() => navigate("/demandes")}
          >
            Annuler
          </button>

          <button
            type="submit"
            className="btn-primary-modern"
            disabled={saving}
          >

            {saving ? (
              <>
                <span className="button-spinner" />
                Enregistrement...
              </>
            ) : (
              <>
                <i className="bi bi-send" />
                Envoyer la demande
              </>
            )}

          </button>

        </div>

      </form>

    </div>
  );
}

export default NouvelleDemande;