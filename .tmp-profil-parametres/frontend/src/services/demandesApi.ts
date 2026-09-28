import { authFetch } from "./auth";
// src/services/demandesApi.ts

export interface DemandeArticle {
  article_id: number;
  article_code?: string;
  article_designation: string;
  quantite: number;
  unite?: string;
  commentaire?: string;
}

export interface Demande {
  id: number;
  reference: string;
  service_id?: number;
  service_nom?: string;
  demandeur_id?: number;
  demandeur_nom?: string;
  date_demande: string;
  date_validation?: string | null;
  statut: string;
  priorite?: string;
  motif?: string;
  commentaire?: string;
  articles?: DemandeArticle[];
  created_at?: string;
  updated_at?: string;
}

export interface NouvelleDemandeData {
  service_id?: number;
  demandeur_id?: number;
  priorite: string;
  motif: string;
  commentaire: string;
  articles: {
    article_id: number;
    quantite: number;
    commentaire?: string;
  }[];
}

export interface ArticleOption {
  id: number;
  code: string;
  designation: string;
  unite: string;
  quantite_stock?: number;
}

const API_URL =
  import.meta.env.VITE_API_URL || "/api/stock";

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await authFetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Erreur HTTP ${response.status}`;

    try {
      const data = await response.json();

      if (data?.message) {
        message = data.message;
      } else if (data?.error) {
        message = data.error;
      }
    } catch {
      // Rien à faire si la réponse n'est pas du JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/* =========================================================
   DEMANDES
========================================================= */

export async function getDemandes(): Promise<Demande[]> {
  const data = await request<Demande[] | { data: Demande[] }>(
    "/demandes"
  );

  if (Array.isArray(data)) {
    return data;
  }

  return data.data || [];
}

export async function getDemandeById(
  id: number
): Promise<Demande> {
  return request<Demande>(`/demandes/${id}`);
}

export async function createDemande(
  data: NouvelleDemandeData
): Promise<Demande> {
  return request<Demande>("/demandes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDemande(
  id: number,
  data: Partial<NouvelleDemandeData>
): Promise<Demande> {
  return request<Demande>(`/demandes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteDemande(
  id: number
): Promise<void> {
  await request<void>(`/demandes/${id}`, {
    method: "DELETE",
  });
}

/* =========================================================
   VALIDATION
========================================================= */

export async function validerDemande(
  id: number,
  commentaire = ""
): Promise<Demande> {
  return request<Demande>(`/demandes/${id}/valider`, {
    method: "PATCH",
    body: JSON.stringify({
      commentaire,
    }),
  });
}

export async function refuserDemande(
  id: number,
  commentaire: string
): Promise<Demande> {
  return request<Demande>(`/demandes/${id}/refuser`, {
    method: "PATCH",
    body: JSON.stringify({
      commentaire,
    }),
  });
}

/* =========================================================
   ARTICLES
========================================================= */

export async function getArticlesForDemandes(): Promise<ArticleOption[]> {
  const data = await request<
    ArticleOption[] | { data: ArticleOption[] }
  >("/articles");

  if (Array.isArray(data)) {
    return data;
  }

  return data.data || [];
}
