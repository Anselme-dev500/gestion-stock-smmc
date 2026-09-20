import { useEffect, useState } from 'react';
import { stockApi } from '../../services/stockApi';
import type { Entree, Sortie, Retour, DotationDirecte } from '../../types/stock';

export default function Mouvements() {
  const [tab, setTab] = useState<'sorties' | 'entrees' | 'retours' | 'dotations'>('sorties');
  const [sorties, setSorties] = useState<Sortie[]>([]);
  const [entrees, setEntrees] = useState<Entree[]>([]);
  const [retours, setRetours] = useState<Retour[]>([]);
  const [dotations, setDotations] = useState<DotationDirecte[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'sorties') {
        const data = await stockApi.getSorties();
        setSorties(data);
      } else if (tab === 'entrees') {
        const data = await stockApi.getEntrees();
        setEntrees(data);
      } else if (tab === 'retours') {
        const data = await stockApi.getRetours();
        setRetours(data);
      } else if (tab === 'dotations') {
        const data = await stockApi.getDotations();
        setDotations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tab]);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#1B5E20' }}>
            <i className="bi bi-arrow-left-right me-2"></i>Mouvements de Stock
          </h2>
          <p className="text-muted small mb-0">
            Journal complet et traçabilité des Entrées, Sorties sur demande, Retours et Dotations directes
          </p>
        </div>
      </div>

      {/* Nav Tabs */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${tab === 'sorties' ? 'active text-white' : 'bg-light text-dark'}`}
            style={{ backgroundColor: tab === 'sorties' ? '#2E7D32' : undefined }}
            onClick={() => setTab('sorties')}
          >
            <i className="bi bi-box-arrow-up me-2"></i>Sorties de Stock
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${tab === 'entrees' ? 'active text-white' : 'bg-light text-dark'}`}
            style={{ backgroundColor: tab === 'entrees' ? '#2E7D32' : undefined }}
            onClick={() => setTab('entrees')}
          >
            <i className="bi bi-box-arrow-in-down me-2"></i>Entrées Fournisseurs
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${tab === 'retours' ? 'active text-white' : 'bg-light text-dark'}`}
            style={{ backgroundColor: tab === 'retours' ? '#2E7D32' : undefined }}
            onClick={() => setTab('retours')}
          >
            <i className="bi bi-arrow-return-left me-2"></i>Retours de Matériel
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${tab === 'dotations' ? 'active text-white' : 'bg-light text-dark'}`}
            style={{ backgroundColor: tab === 'dotations' ? '#2E7D32' : undefined }}
            onClick={() => setTab('dotations')}
          >
            <i className="bi bi-gift me-2"></i>Dotations Directes
          </button>
        </li>
      </ul>

      {/* Data Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : (
            <div className="table-responsive">
              {tab === 'sorties' && (
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr className="small text-muted text-uppercase">
                      <th>N° Mouvement</th>
                      <th>Date</th>
                      <th>N° Demande liée</th>
                      <th>Service Destinataire</th>
                      <th>Magasinier / Responsable</th>
                      <th>Articles Sortis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorties.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-4 text-muted">Aucune sortie enregistrée.</td></tr>
                    ) : (
                      sorties.map((s) => (
                        <tr key={s.sor_id}>
                          <td className="fw-bold text-dark">{s.sor_numero}</td>
                          <td className="small text-muted">{new Date(s.sor_date).toLocaleDateString('fr-FR')}</td>
                          <td><span className="badge bg-light text-dark border">{s.demande_numero || 'Directe'}</span></td>
                          <td className="fw-semibold">{s.service_nom}</td>
                          <td>{s.responsable_nom || 'Magasinier'}</td>
                          <td>
                            <span className="badge bg-secondary">{s.lignes?.length || 0} référence(s)</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'entrees' && (
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr className="small text-muted text-uppercase">
                      <th>N° Réception</th>
                      <th>Date</th>
                      <th>Fournisseur</th>
                      <th>Réf BL / Facture</th>
                      <th>Responsable Réception</th>
                      <th>Articles Reçus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entrees.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-4 text-muted">Aucune entrée enregistrée.</td></tr>
                    ) : (
                      entrees.map((e) => (
                        <tr key={e.ent_id}>
                          <td className="fw-bold text-dark">{e.ent_numero}</td>
                          <td className="small text-muted">{new Date(e.ent_date).toLocaleDateString('fr-FR')}</td>
                          <td className="fw-semibold">{e.fournisseur_nom || 'N/A'}</td>
                          <td><span className="badge bg-light text-dark border">{e.ent_bl_reference || 'N/A'}</span></td>
                          <td>{e.responsable_nom || 'Magasinier'}</td>
                          <td><span className="badge bg-success">{e.lignes?.length || 0} référence(s)</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'retours' && (
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr className="small text-muted text-uppercase">
                      <th>N° Retour</th>
                      <th>Date</th>
                      <th>Service Origine</th>
                      <th>Responsable</th>
                      <th>Articles Retournés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retours.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-4 text-muted">Aucun retour enregistré.</td></tr>
                    ) : (
                      retours.map((r) => (
                        <tr key={r.ret_id}>
                          <td className="fw-bold text-dark">{r.ret_numero}</td>
                          <td className="small text-muted">{new Date(r.ret_date).toLocaleDateString('fr-FR')}</td>
                          <td className="fw-semibold">{r.service_nom}</td>
                          <td>{r.ret_responsable || 'Personnel'}</td>
                          <td><span className="badge bg-warning text-dark">{r.lignes?.length || 0} référence(s)</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'dotations' && (
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr className="small text-muted text-uppercase">
                      <th>N° Dotation</th>
                      <th>Date</th>
                      <th>Service Bénéficiaire</th>
                      <th>Justification</th>
                      <th>Articles Alloués</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dotations.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-4 text-muted">Aucune dotation directe enregistrée.</td></tr>
                    ) : (
                      dotations.map((d) => (
                        <tr key={d.dot_id}>
                          <td className="fw-bold text-dark">{d.dot_numero}</td>
                          <td className="small text-muted">{new Date(d.dot_date).toLocaleDateString('fr-FR')}</td>
                          <td className="fw-semibold">{d.service_nom}</td>
                          <td className="small text-muted">{d.dot_justification}</td>
                          <td><span className="badge bg-info text-dark">{d.lignes?.length || 0} référence(s)</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}