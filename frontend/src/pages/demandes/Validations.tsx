import { useEffect, useMemo, useState } from "react";

import {
  getDemandes,
  validerDemande,
  refuserDemande,
  type Demande,
} from "../../services/demandesApi";

import "../../assets/css/demandes.css";

function Validations() {
  const [demandes, setDemandes] =
    useState<Demande[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selected, setSelected] =
    useState<Demande | null>(null);

  const [processing, setProcessing] =
    useState<number | null>(null);

  const [commentaire, setCommentaire] =
    useState("");

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    getDemandes()
      .then((data) => {

        if (!cancelled) {

          const pending = data.filter(
            (demande) =>
              demande.statut?.toLowerCase() ===
              "en_attente"
          );

          setDemandes(pending);
        }

      })
      .catch((err: unknown) => {

        if (!cancelled) {

          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les demandes."
          );

        }

      })
      .finally(() => {

        if (!cancelled) {
          setLoading(false);
        }

      });

    return () => {
      cancelled = true;
    };

  }, []);

  const filteredDemandes = useMemo(() => {

    const value =
      search.trim().toLowerCase();

    if (!value) {
      return demandes;
    }

    return demandes.filter(
      (demande) =>
        demande.reference
          ?.toLowerCase()
          .includes(value) ||
        demande.service_nom
          ?.toLowerCase()
          .includes(value) ||
        demande.demandeur_nom
          ?.toLowerCase()
          .includes(value)
    );

  }, [demandes, search]);

  function formatDate(date?: string | null) {

    if (!date) {
      return "-";
    }

    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(new Date(date));

  }

  function priorityLabel(
    priority?: string
  ) {

    switch (priority?.toLowerCase()) {

      case "urgente":
        return "Urgente";

      case "haute":
        return "Haute";

      case "basse":
        return "Basse";

      default:
        return "Normale";
    }

  }

  async function handleValidate(
    demande: Demande
  ) {

    setProcessing(demande.id);
    setError("");

    try {

      await validerDemande(
        demande.id,
        commentaire
      );

      setDemandes((previous) =>
        previous.filter(
          (item) =>
            item.id !== demande.id
        )
      );

      setSelected(null);
      setCommentaire("");

    } catch (err: unknown) {

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de valider la demande."
      );

    } finally {

      setProcessing(null);

    }

  }

  async function handleReject(
    demande: Demande
  ) {

    if (!commentaire.trim()) {

      setError(
        "Veuillez saisir un motif avant de refuser la demande."
      );

      return;
    }

    setProcessing(demande.id);
    setError("");

    try {

      await refuserDemande(
        demande.id,
        commentaire
      );

      setDemandes((previous) =>
        previous.filter(
          (item) =>
            item.id !== demande.id
        )
      );

      setSelected(null);
      setCommentaire("");

    } catch (err: unknown) {

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de refuser la demande."
      );

    } finally {

      setProcessing(null);

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

            <strong>Validations</strong>

          </div>

          <h1>Validation des demandes</h1>

          <p>
            Examinez les demandes de fourniture en attente.
          </p>

        </div>

        <div className="validation-counter">

          <i className="bi bi-hourglass-split" />

          <strong>
            {demandes.length}
          </strong>

          <span>
            en attente
          </span>

        </div>

      </div>

      {/* ERROR */}

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

      {/* RECHERCHE */}

      <div className="validation-toolbar">

        <div className="search-modern">

          <i className="bi bi-search" />

          <input
            type="text"
            placeholder="Rechercher une demande..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>

      </div>

      {/* CONTENU */}

      <div className="validation-layout">

        <div className="validation-list">

          {loading ? (

            <div className="empty-state-modern">

              <div className="loading-spinner-modern" />

              <h3>
                Chargement...
              </h3>

            </div>

          ) : filteredDemandes.length === 0 ? (

            <div className="empty-state-modern">

              <div className="empty-icon-modern success">
                <i className="bi bi-check2-all" />
              </div>

              <h3>
                Aucune demande en attente
              </h3>

              <p>
                Toutes les demandes ont été traitées.
              </p>

            </div>

          ) : (

            filteredDemandes.map(
              (demande) => (

                <div
                  className={`validation-card ${
                    selected?.id ===
                    demande.id
                      ? "selected"
                      : ""
                  }`}
                  key={demande.id}
                  onClick={() =>
                    setSelected(demande)
                  }
                >

                  <div className="validation-card-top">

                    <span className="reference-badge">
                      {demande.reference}
                    </span>

                    <span
                      className={`priority-badge priority-${demande.priorite?.toLowerCase()}`}
                    >
                      {priorityLabel(
                        demande.priorite
                      )}
                    </span>

                  </div>

                  <h3>
                    {demande.service_nom ||
                      "Service non défini"}
                  </h3>

                  <p>
                    Demandé par{" "}
                    <strong>
                      {demande.demandeur_nom ||
                        "-"}
                    </strong>
                  </p>

                  <div className="validation-card-bottom">

                    <span>
                      <i className="bi bi-calendar3" />

                      {formatDate(
                        demande.date_demande
                      )}
                    </span>

                    <span>
                      <i className="bi bi-box-seam" />

                      {demande.articles?.length ||
                        0}{" "}
                      article(s)
                    </span>

                  </div>

                </div>

              )
            )

          )}

        </div>

        {/* DETAILS */}

        <div className="validation-detail">

          {!selected ? (

            <div className="detail-placeholder">

              <div className="detail-placeholder-icon">
                <i className="bi bi-file-earmark-check" />
              </div>

              <h3>
                Sélectionnez une demande
              </h3>

              <p>
                Cliquez sur une demande à gauche pour afficher
                les détails et effectuer sa validation.
              </p>

            </div>

          ) : (

            <>

              <div className="validation-detail-header">

                <div>

                  <span>
                    DEMANDE
                  </span>

                  <h2>
                    {selected.reference}
                  </h2>

                </div>

                <span className="status-badge status-en_attente">

                  <span />

                  En attente

                </span>

              </div>

              <div className="validation-detail-content">

                <div className="detail-grid">

                  <div className="detail-item">
                    <span>Service</span>
                    <strong>
                      {selected.service_nom ||
                        "-"}
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>Demandeur</span>
                    <strong>
                      {selected.demandeur_nom ||
                        "-"}
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>Date</span>
                    <strong>
                      {formatDate(
                        selected.date_demande
                      )}
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>Priorité</span>
                    <strong>
                      {priorityLabel(
                        selected.priorite
                      )}
                    </strong>
                  </div>

                </div>

                {selected.motif && (

                  <div className="detail-block">

                    <h3>
                      Motif de la demande
                    </h3>

                    <p>
                      {selected.motif}
                    </p>

                  </div>

                )}

                <div className="detail-block">

                  <h3>
                    Articles demandés
                  </h3>

                  <div className="detail-articles">

                    {selected.articles?.map(
                      (article, index) => (

                        <div
                          className="detail-article"
                          key={`${article.article_id}-${index}`}
                        >

                          <div>

                            <strong>
                              {
                                article.article_designation
                              }
                            </strong>

                            {article.article_code && (
                              <small>
                                {
                                  article.article_code
                                }
                              </small>
                            )}

                          </div>

                          <span>
                            {article.quantite}{" "}
                            {article.unite || ""}
                          </span>

                        </div>

                      )
                    )}

                  </div>

                </div>

                <div className="validation-comment">

                  <label>
                    Commentaire de validation
                  </label>

                  <textarea
                    rows={4}
                    placeholder="Ajoutez une remarque ou un motif de refus..."
                    value={commentaire}
                    onChange={(event) =>
                      setCommentaire(
                        event.target.value
                      )
                    }
                  />

                </div>

              </div>

              <div className="validation-actions">

                <button
                  type="button"
                  className="btn-danger-modern"
                  disabled={
                    processing ===
                    selected.id
                  }
                  onClick={() =>
                    handleReject(selected)
                  }
                >

                  <i className="bi bi-x-lg" />

                  Refuser

                </button>

                <button
                  type="button"
                  className="btn-primary-modern"
                  disabled={
                    processing ===
                    selected.id
                  }
                  onClick={() =>
                    handleValidate(selected)
                  }
                >

                  {processing ===
                  selected.id ? (
                    <>
                      <span className="button-spinner" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg" />
                      Valider la demande
                    </>
                  )}

                </button>

              </div>

            </>

          )}

        </div>

      </div>

    </div>
  );
}

export default Validations;