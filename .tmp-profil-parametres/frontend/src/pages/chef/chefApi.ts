import { authFetch } from '../../services/auth';
export type Line = { id: string; article: string; quantite_demandee: number; quantite_accordee: number };
export type Validation = { niveau: string; statut: string; date: string; validateur: string; commentaire: string | null };
export type DemandeChef = { id: string; numero: string; date: string; type: string; statut: string; motif: string | null; direction: string | null; centre: string; demandeur: string; prochaine_etape: string | null; peut_decider: boolean; lignes: Line[]; validations: Validation[] };
export type ChefData = { profil: { nom: string; matricule: string; departement: string; approvisionnement: boolean }; stats: { total: number; a_valider: number; validees: number; refusees: number }; demandes: DemandeChef[] };
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await authFetch(`/api/stock/chef/${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const body = await response.json().catch(() => null) as T & { detail?: string; action?: string[]; commentaire?: string[] };
  if (!response.ok) throw new Error(body?.detail || body?.commentaire?.[0] || body?.action?.[0] || `Erreur HTTP ${response.status}`);
  return body;
}
export const chefApi = {
  dashboard: () => request<ChefData>('tableau-de-bord/'),
  decision: (id: string, action: 'valider' | 'refuser', commentaire: string) => request<DemandeChef>(`demandes/${id}/decision/`, { method:'POST', body: JSON.stringify({ action, commentaire }) }),
};
