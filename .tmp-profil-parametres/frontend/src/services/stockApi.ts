import { authFetch } from "./auth";
import type {
  Article, Categorie, Emplacement, Fournisseur,
  Demande, Entree, Sortie, Retour, DotationDirecte,
  Inventaire, DashboardStats, JournalAudit,
  NiveauValidation
} from '../types/stock';

const API_BASE_URL = '/api/stock';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
};

const customFetch = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  const response = await authFetch(`${API_BASE_URL}${url}`, { ...options, headers });
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }
  return response.json();
};

export const stockApi = {
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      return await customFetch<DashboardStats>('/dashboard/');
    } catch {
      return {
        total_articles: 142,
        articles_alerte: 8,
        demandes_soumises: 12,
        demandes_en_cours: 5,
        demandes_livrees: 89,
        valeur_totale_stock: 45280000,
        derniers_mouvements: [
          { id: '1', numero: 'SOR-20260920-001', date: '2026-09-20', service: 'Manutention Sacherie' },
          { id: '2', numero: 'SOR-20260919-014', date: '2026-09-19', service: 'Sécurité Portuaire' },
        ]
      };
    }
  },

  // Articles
  getArticles: async (search?: string, catId?: string, enAlerte?: boolean): Promise<Article[]> => {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (catId) queryParams.append('categorie', catId);
      if (enAlerte) queryParams.append('en_alerte', 'true');
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      return await customFetch<Article[]>(`/articles/${queryString}`);
    } catch {
      return [
        { art_code_article: 'ART-001', art_designation: 'Papier A4 80g Ramette', art_categorie: 'BUREAU', cat_nom: 'Fournitures de bureau', art_unite: 'Ramette', art_prix_unitaire: 25000, art_quantite_stock: 45, art_seuil_min: 10, emp_code: 'RACK01', art_etat: 'actif', est_en_alerte: false },
        { art_code_article: 'ART-002', art_designation: 'Gants de manutention renforcés', art_categorie: 'EPI', cat_nom: 'Équipements de sécurité (EPI)', art_unite: 'Paire', art_prix_unitaire: 18000, art_quantite_stock: 4, art_seuil_min: 20, emp_code: 'RACK12', art_etat: 'actif', est_en_alerte: true },
        { art_code_article: 'ART-003', art_designation: 'Bottes de sécurité T42', art_categorie: 'EPI', cat_nom: 'Équipements de sécurité (EPI)', art_unite: 'Paire', art_prix_unitaire: 120000, art_quantite_stock: 12, art_seuil_min: 15, emp_code: 'RACK12', art_etat: 'actif', est_en_alerte: true },
        { art_code_article: 'ART-004', art_designation: 'Stylo à bille bleu (Boîte de 50)', art_categorie: 'BUREAU', cat_nom: 'Fournitures de bureau', art_unite: 'Boîte', art_prix_unitaire: 15000, art_quantite_stock: 30, art_seuil_min: 5, emp_code: 'RACK02', art_etat: 'actif', est_en_alerte: false },
      ];
    }
  },

  createArticle: async (article: Partial<Article>): Promise<Article> => {
    return customFetch<Article>('/articles/', {
      method: 'POST',
      body: JSON.stringify(article),
    });
  },

  // Referentiels
  getCategories: async (): Promise<Categorie[]> => {
    try {
      return await customFetch<Categorie[]>('/categories/');
    } catch {
      return [
        { cat_id: '1', cat_nom: 'Fournitures de bureau', nombre_articles: 58 },
        { cat_id: '2', cat_nom: 'Équipements de sécurité (EPI)', nombre_articles: 34 },
        { cat_id: '3', cat_nom: 'Consommables informatiques', nombre_articles: 25 },
        { cat_id: '4', cat_nom: 'Matériel d\'entretien & pièces', nombre_articles: 25 },
      ];
    }
  },

  getEmplacements: async (): Promise<Emplacement[]> => {
    try {
      return await customFetch<Emplacement[]>('/emplacements/');
    } catch {
      return [
        { emp_id: '1', emp_code: 'RACK01', emp_description: 'Rayon Fournitures Bureau A1', nombre_articles: 20 },
        { emp_id: '2', emp_code: 'RACK02', emp_description: 'Rayon Fournitures Bureau A2', nombre_articles: 38 },
        { emp_id: '3', emp_code: 'RACK12', emp_description: 'Zone Matériel Sécurité EPI', nombre_articles: 34 },
        { emp_id: '4', emp_code: 'RACK74', emp_description: 'Consommables & Pièces Réserve', nombre_articles: 50 },
      ];
    }
  },

  getFournisseurs: async (): Promise<Fournisseur[]> => {
    try {
      return await customFetch<Fournisseur[]>('/fournisseurs/');
    } catch {
      return [
        { frn_id: '1', frn_code: 'FRN-001', frn_nom: 'Bazarikely Paper Madagascar', frn_contact: 'M. Solo', frn_telephone: '+261 34 00 123 45', frn_email: 'contact@bazarikely.mg' },
        { frn_id: '2', frn_code: 'FRN-002', frn_nom: 'Sécurité Portuaire & Matériel', frn_contact: 'Mme Rasoa', frn_telephone: '+261 32 11 987 65', frn_email: 'ventes@secuport.mg' },
      ];
    }
  },

  // Demandes
  getDemandes: async (statut?: string, type?: string): Promise<Demande[]> => {
    try {
      const queryParams = new URLSearchParams();
      if (statut) queryParams.append('statut', statut);
      if (type) queryParams.append('type', type);
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      return await customFetch<Demande[]>(`/demandes/${queryString}`);
    } catch {
      return [
        {
          dem_id: 'd1',
          dem_numero: 'R17-2026-001',
          dem_centre_responsabilite: 'CR-SAC',
          service_nom: 'Service Sacherie & Manutention',
          service_code: 'SAC',
          dem_demandeur: 'p1',
          demandeur_nom: 'Jean RAKOTO',
          dem_date: '2026-09-18T10:30:00Z',
          dem_type: 'normale',
          dem_statut: 'soumise',
          statut_display: 'Soumise (En attente Chef Dept Demandeur)',
          dem_motif: 'Renouvellement du matériel de protection pour le débarquement sacherie.',
          lignes: [
            { ldem_id: 'l1', ldem_article: 'ART-002', art_code: 'ART-002', art_designation: 'Gants de manutention renforcés', art_unite: 'Paire', art_stock_actuel: 4, ldem_quantite_demandee: 15, ldem_quantite_accordee: 0 },
            { ldem_id: 'l2', ldem_article: 'ART-003', art_code: 'ART-003', art_designation: 'Bottes de sécurité T42', art_unite: 'Paire', art_stock_actuel: 12, ldem_quantite_demandee: 5, ldem_quantite_accordee: 0 }
          ],
          validations: []
        },
        {
          dem_id: 'd2',
          dem_numero: 'R17-2026-002',
          dem_centre_responsabilite: 'CR-INF',
          service_nom: 'Service Informatique & Telecom',
          service_code: 'INF',
          dem_demandeur: 'p2',
          demandeur_nom: 'Marie RABAO',
          dem_date: '2026-09-19T08:15:00Z',
          dem_type: 'urgence',
          dem_statut: 'en_cours',
          statut_display: 'En cours de validation (Niveau 2 Responsable Stock)',
          dem_motif: 'URGENCE: Remplacement imprimante bureau d\'enregistrement navire suite à sinistre/panne.',
          lignes: [
            { ldem_id: 'l3', ldem_article: 'ART-001', art_code: 'ART-001', art_designation: 'Papier A4 80g Ramette', art_unite: 'Ramette', art_stock_actuel: 45, ldem_quantite_demandee: 5, ldem_quantite_accordee: 5 }
          ],
          validations: [
            { val_id: 'v1', val_demande: 'd2', val_niveau: 'dept_demandeur', niveau_display: 'Chef de département (demandeur)', val_statut: 'validee', statut_display: 'Validée', val_validateur: 'v1', validateur_nom: 'Directeur Systèmes d\'Information', val_date: '2026-09-19T09:00:00Z', val_commentaire: 'Approuvé pour urgence opérationnelle.' }
          ]
        }
      ];
    }
  },

  createDemande: async (demandeData: Partial<Demande>): Promise<Demande> => {
    return customFetch<Demande>('/demandes/', {
      method: 'POST',
      body: JSON.stringify(demandeData),
    });
  },

  validerDemande: async (demandeId: string, niveau: NiveauValidation, commentaire: string, lignesAccordees?: { ldem_id: string; quantite_accordee: number }[]): Promise<Demande> => {
    return customFetch<Demande>(`/demandes/${demandeId}/valider/`, {
      method: 'POST',
      body: JSON.stringify({ niveau, commentaire, lignes_accordees: lignesAccordees }),
    });
  },

  refuserDemande: async (demandeId: string, niveau: NiveauValidation, commentaire: string): Promise<Demande> => {
    return customFetch<Demande>(`/demandes/${demandeId}/refuser/`, {
      method: 'POST',
      body: JSON.stringify({ niveau, commentaire }),
    });
  },

  livrerDemande: async (demandeId: string): Promise<Demande> => {
    return customFetch<Demande>(`/demandes/${demandeId}/livrer/`, {
      method: 'POST',
    });
  },

  // Mouvements
  getEntrees: async (): Promise<Entree[]> => {
    return customFetch<Entree[]>('/entrees/');
  },
  createEntree: async (data: Partial<Entree>): Promise<Entree> => {
    return customFetch<Entree>('/entrees/', { method: 'POST', body: JSON.stringify(data) });
  },

  getSorties: async (): Promise<Sortie[]> => {
    return customFetch<Sortie[]>('/sorties/');
  },
  createSortie: async (data: Partial<Sortie>): Promise<Sortie> => {
    return customFetch<Sortie>('/sorties/', { method: 'POST', body: JSON.stringify(data) });
  },

  getRetours: async (): Promise<Retour[]> => {
    return customFetch<Retour[]>('/retours/');
  },
  createRetour: async (data: Partial<Retour>): Promise<Retour> => {
    return customFetch<Retour>('/retours/', { method: 'POST', body: JSON.stringify(data) });
  },

  getDotations: async (): Promise<DotationDirecte[]> => {
    return customFetch<DotationDirecte[]>('/dotations/');
  },
  createDotation: async (data: Partial<DotationDirecte>): Promise<DotationDirecte> => {
    return customFetch<DotationDirecte>('/dotations/', { method: 'POST', body: JSON.stringify(data) });
  },

  // Inventaire
  getInventaires: async (): Promise<Inventaire[]> => {
    return customFetch<Inventaire[]>('/inventaires/');
  },
  createInventaire: async (data: Partial<Inventaire>): Promise<Inventaire> => {
    return customFetch<Inventaire>('/inventaires/', { method: 'POST', body: JSON.stringify(data) });
  },
  enregistrerComptageInventaire: async (invId: string, comptages: { linv_id: string; quantite_reelle: number; note?: string }[]): Promise<Inventaire> => {
    return customFetch<Inventaire>(`/inventaires/${invId}/enregistrer_comptage/`, {
      method: 'POST',
      body: JSON.stringify({ comptages })
    });
  },
  ajusterInventaire: async (invId: string): Promise<Inventaire> => {
    return customFetch<Inventaire>(`/inventaires/${invId}/ajuster/`, { method: 'POST' });
  },

  // Audit
  getJournalAudit: async (): Promise<JournalAudit[]> => {
    return customFetch<JournalAudit[]>('/audit/');
  }
};
const API_URL = "/api";

/* =========================================================
   TYPES INVENTAIRE
========================================================= */

export interface InventairePayload {
  numero_inventaire: string;
  date_inventaire: string;
  id_emplacement?: number | null;
  observation?: string | null;
}

export interface InventaireDetailPayload {
  stock_physique: number;
  observation?: string | null;
}

/* =========================================================
   HELPER API
========================================================= */

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await authFetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Erreur HTTP ${response.status}`;

    try {
      const data = await response.json();

      if (data?.detail) {
        message = data.detail;
      } else if (data?.message) {
        message = data.message;
      } else if (data?.error) {
        message = data.error;
      }
    } catch {
      // réponse non JSON
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/* =========================================================
   INVENTAIRES
========================================================= */

export async function getInventaires() {
  return request<any[]>("/inventaires");
}

/* =========================================================
   DETAIL D'UN INVENTAIRE
========================================================= */

export async function getInventaireDetails(idInventaire: number) {
  return request<any[]>(
    `/inventaires/${idInventaire}/details`
  );
}

/* =========================================================
   CREER UN INVENTAIRE
========================================================= */

export async function createInventaire(
  payload: InventairePayload
) {
  return request<any>("/inventaires", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* =========================================================
   MODIFIER LE COMPTAGE D'UN ARTICLE
========================================================= */

export async function updateInventaireDetail(
  idDetail: number,
  payload: InventaireDetailPayload
) {
  return request<any>(
    `/inventaire-details/${idDetail}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

/* =========================================================
   TERMINER UN INVENTAIRE
========================================================= */

export async function terminerInventaire(
  idInventaire: number
) {
  return request<any>(
    `/inventaires/${idInventaire}/terminer`,
    {
      method: "PATCH",
    }
  );
}

/* =========================================================
   ANNULER UN INVENTAIRE
========================================================= */

export async function annulerInventaire(
  idInventaire: number
) {
  return request<any>(
    `/inventaires/${idInventaire}/annuler`,
    {
      method: "PATCH",
    }
  );
}