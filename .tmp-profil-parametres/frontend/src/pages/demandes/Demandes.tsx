import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDemandes,
  deleteDemande,
  type Demande,
} from "../../services/demandesApi";

import "../../assets/css/demandes.css";

function Demandes() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("tous");
  const [priorite, setPriorite] = useState("toutes");
  const [selected, setSelected] = useState<Demande | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDemandes()
      .then((data) => {
        if (!cancelled) {
          setDemandes(data);
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
    const value = search.trim().toLowerCase();

    return demandes.filter((demande) => {
      const matchesSearch =
        !value ||
        demande.reference?.toLowerCase().includes(value) ||
        demande.service_nom?.toLowerCase().includes(value) ||
        demande.demandeur_nom?.toLowerCase().includes(value);

      const matchesStatus =
        statut === "tous" ||
        demande.statut?.toLowerCase() === statut.toLowerCase();

      const matchesPriority =
        priorite === "toutes" ||
        demande.priorite?.toLowerCase() === priorite.toLowerCase();

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [demandes, search, statut, priorite]);

  const stats = useMemo(() => {
    return {
      total: demandes.length,
      attente: demandes.filter(
        (d) => d.statut?.toLowerCase() === "en_attente"
      ).length,
      validees: demandes.filter(
        (d) => d.statut?.toLowerCase() === "validee"
      ).length,
      refusees: demandes.filter(
        (d) => d.statut?.toLowerCase() === "refusee"
      ).length,
    };
  }, [demandes]);

  async function handleDelete(id: number) {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette demande ?"
    );

    if (!confirmation) {
      return;
    }

    setDeleteLoading(id);

    try {
      await deleteDemande(id);

      setDemandes((previous) =>
        previous.filter((demande) => demande.id !== id)
      );

      if (selected?.id === id) {
        setSelected(null);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de supprimer la demande."
      );
    } finally {
      setDeleteLoading(null);
    }
  }

  function formatDate(date?: string | null) {
    if (!date) return "-";

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  }

  function getStatusLabel(status?: string) {
    switch (status?.toLowerCase()) {
      case "en_attente":
        return "En attente";
      case "validee":
        return "Validée";
      case "refusee":
        return "Refusée";
      case "livree":
        return "Livrée";
      case "annulee":
        return "Annulée";
      default:
        return status || "Inconnu";
    }
  }

  function getPriorityLabel(priority?: string) {
    switch (priority?.toLowerCase()) {
      case "urgente":
        return "Urgente";
      case "haute":
        return "Haute";
      case "normale":
        return "Normale";
      case "basse":
        return "Basse";
      default:
        return priority || "Normale";
    }
  }

  return (
    <div className="demandes-page">

      {/* HEADER */}
      <div className="page-header-modern">

        <div>
          <div className="breadcrumb-modern">
            Gestion du stock
            <i className="bi bi-chevron-right" />
            Demandes
          </div>

          <h1>Demandes de fourniture</h1>

          <p>
            Gérez les demandes de matériel effectuées par les services.
          </p>
        </div>

        <Link
          to="/nouvelle-demande"
          className="btn-primary-modern"
        >
          <i className="bi bi-plus-lg" />
          Nouvelle demande
        </Link>

      </div>

      {/* ERROR */}
      {error && (
        <div className="alert-modern alert-danger-modern">
          <i className="bi bi-exclamation-triangle-fill" />

          <div>
            <strong>Erreur</strong>
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

      {/* STATISTIQUES */}
      <div className="stats-grid-demandes">

        <div className="stat-card-demandes">
          <div className="stat-icon blue">
            <i className="bi bi-file-earmark-text" />
          </div>

          <div>
            <span>Total demandes</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="stat-card-demandes">
          <div className="stat-icon orange">
            <i className="bi bi-hourglass-split" />
          </div>

          <div>
            <span>En attente</span>
            <strong>{stats.attente}</strong>
          </div>
        </div>

        <div className="stat-card-demandes">
          <div className="stat-icon green">
            <i className="bi bi-check-circle" />
          </div>

          <div>
            <span>Validées</span>
            <strong>{stats.validees}</strong>
          </div>
        </div>

        <div className="stat-card-demandes">
          <div className="stat-icon red">
            <i className="bi bi-x-circle" />
          </div>

          <div>
            <span>Refusées</span>
            <strong>{stats.refusees}</strong>
          </div>
        </div>

      </div>

      {/* TABLE */}
      <div className="content-card-modern">

        <div className="content-card-header">

          <div>
            <h2>Liste des demandes</h2>
            <p>
              {filteredDemandes.length} demande(s) affichée(s)
            </p>
          </div>

        </div>

        {/* FILTRES */}
        <div className="filters-modern">

          <div className="search-modern">

            <i className="bi bi-search" />

            <input
              type="text"
              placeholder="Rechercher une référence, un service..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
              >
                <i className="bi bi-x-circle" />
              </button>
            )}

          </div>

          <select
            value={statut}
            onChange={(event) =>
              setStatut(event.target.value)
            }
            className="filter-select-modern"
          >
            <option value="tous">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="validee">Validées</option>
            <option value="refusee">Refusées</option>
            <option value="livree">Livrées</option>
          </select>

          <select
            value={priorite}
            onChange={(event) =>
              setPriorite(event.target.value)
            }
            className="filter-select-modern"
          >
            <option value="toutes">Toutes les priorités</option>
            <option value="urgente">Urgente</option>
            <option value="haute">Haute</option>
            <option value="normale">Normale</option>
            <option value="basse">Basse</option>
          </select>

        </div>

        {loading ? (
          <div className="empty-state-modern">
            <div className="loading-spinner-modern" />
            <h3>Chargement des demandes...</h3>
            <p>Veuillez patienter.</p>
          </div>
        ) : filteredDemandes.length === 0 ? (

          <div className="empty-state-modern">

            <div className="empty-icon-modern">
              <i className="bi bi-inbox" />
            </div>

            <h3>Aucune demande trouvée</h3>

            <p>
              Aucune demande ne correspond aux critères sélectionnés.
            </p>

            <Link
              to="/nouvelle-demande"
              className="btn-primary-modern"
            >
              <i className="bi bi-plus-lg" />
              Créer une demande
            </Link>

          </div>

        ) : (

          <div className="table-wrapper-modern">

            <table className="table-modern">

              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Service</th>
                  <th>Demandeur</th>
                  <th>Date</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredDemandes.map((demande) => (

                  <tr key={demande.id}>

                    <td>
                      <span className="reference-badge">
                        {demande.reference}
                      </span>
                    </td>

                    <td>
                      <div className="table-person">

                        <div className="table-avatar">
                          <i className="bi bi-building" />
                        </div>

                        <div>
                          <strong>
                            {demande.service_nom || "Service non défini"}
                          </strong>
                        </div>

                      </div>
                    </td>

                    <td>
                      {demande.demandeur_nom || "-"}
                    </td>

                    <td>
                      {formatDate(demande.date_demande)}
                    </td>

                    <td>
                      <span
                        className={`priority-badge priority-${demande.priorite?.toLowerCase()}`}
                      >
                        {getPriorityLabel(demande.priorite)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`status-badge status-${demande.statut?.toLowerCase()}`}
                      >
                        <span />
                        {getStatusLabel(demande.statut)}
                      </span>
                    </td>

                    <td>

                      <div className="action-buttons-modern">

                        <button
                          type="button"
                          className="icon-action view"
                          title="Voir"
                          onClick={() =>
                            setSelected(demande)
                          }
                        >
                          <i className="bi bi-eye" />
                        </button>

                        <Link
                          to={`/demandes/${demande.id}/edit`}
                          className="icon-action edit"
                          title="Modifier"
                        >
                          <i className="bi bi-pencil" />
                        </Link>

                        <button
                          type="button"
                          className="icon-action delete"
                          title="Supprimer"
                          disabled={
                            deleteLoading === demande.id
                          }
                          onClick={() =>
                            handleDelete(demande.id)
                          }
                        >
                          <i className="bi bi-trash3" />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* MODAL DETAIL */}
      {selected && (

        <div
          className="modal-overlay-modern"
          onClick={() => setSelected(null)}
        >

          <div
            className="modal-modern"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header-modern">

              <div>
                <span>Détail de la demande</span>

                <h2>{selected.reference}</h2>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
              >
                <i className="bi bi-x-lg" />
              </button>

            </div>

            <div className="modal-body-modern">

              <div className="detail-grid">

                <div className="detail-item">
                  <span>Service</span>
                  <strong>
                    {selected.service_nom || "-"}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Demandeur</span>
                  <strong>
                    {selected.demandeur_nom || "-"}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Date de demande</span>
                  <strong>
                    {formatDate(selected.date_demande)}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Priorité</span>
                  <strong>
                    {getPriorityLabel(selected.priorite)}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Statut</span>

                  <span
                    className={`status-badge status-${selected.statut?.toLowerCase()}`}
                  >
                    <span />
                    {getStatusLabel(selected.statut)}
                  </span>

                </div>

              </div>

              {selected.motif && (
                <div className="detail-block">
                  <h3>Motif</h3>
                  <p>{selected.motif}</p>
                </div>
              )}

              {selected.commentaire && (
                <div className="detail-block">
                  <h3>Commentaire</h3>
                  <p>{selected.commentaire}</p>
                </div>
              )}

              <div className="detail-block">

                <h3>Articles demandés</h3>

                {selected.articles &&
                selected.articles.length > 0 ? (

                  <div className="detail-articles">

                    {selected.articles.map((article, index) => (

                      <div
                        className="detail-article"
                        key={`${article.article_id}-${index}`}
                      >

                        <div>
                          <strong>
                            {article.article_designation}
                          </strong>

                          {article.article_code && (
                            <small>
                              {article.article_code}
                            </small>
                          )}
                        </div>

                        <span>
                          {article.quantite}{" "}
                          {article.unite || ""}
                        </span>

                      </div>

                    ))}

                  </div>

                ) : (
                  <p className="text-muted-modern">
                    Aucun article renseigné.
                  </p>
                )}

              </div>

            </div>

            <div className="modal-footer-modern">

              <button
                type="button"
                className="btn-secondary-modern"
                onClick={() => setSelected(null)}
              >
                Fermer
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Demandes;