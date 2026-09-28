import { authFetch } from "./auth";
const API_BASE_URL = "/api";

/* =========================================================
   TYPES
========================================================= */

export interface Categorie {
  id: number;
  code: string;
  nom: string;
  description: string | null;
  actif: boolean;
}

export interface Article {
  id: number;
  code: string;
  designation: string;
  description: string | null;
  categorie_id: number;
  unite: string;
  seuil_alerte: number;
  stock_maximum: number;
  emplacement: string | null;
  actif: boolean;
  created_at?: string;
  updated_at?: string;

  // Peut être fourni par le backend
  categorie?: Categorie;
}

export interface Stock {
  id: number;
  article_id: number;
  quantite: number;
  quantite_reservee: number;
  derniere_entree: string | null;
  derniere_sortie: string | null;
  updated_at?: string;

  article?: Article;
}

export interface EtatStock {
  id?: number;
  article_id: number;
  code: string;
  designation: string;
  categorie: string;
  unite: string;
  quantite: number;
  quantite_reservee: number;
  stock_disponible: number;
  seuil_alerte: number;
  stock_maximum: number;
  emplacement: string | null;
  statut: string;
}

/* =========================================================
   TOKEN
========================================================= */

function getToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

/* =========================================================
   REQUEST
========================================================= */

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>).Authorization =
      `Bearer ${token}`;
  }

  const response = await authFetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  const contentType =
    response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    let message = "Une erreur est survenue.";

    if (typeof data === "object" && data !== null) {
      message =
        data.detail ||
        data.message ||
        Object.values(data)
          .flat()
          .join(" ") ||
        message;
    }

    throw new Error(message);
  }

  return data as T;
}

/* =========================================================
   CATEGORIES
========================================================= */

export const categoriesApi = {
  getAll: () =>
    request<Categorie[]>("/categories/"),

  getOne: (id: number) =>
    request<Categorie>(`/categories/${id}/`),

  create: (data: Omit<Categorie, "id">) =>
    request<Categorie>("/categories/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: number,
    data: Partial<Omit<Categorie, "id">>
  ) =>
    request<Categorie>(`/categories/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/categories/${id}/`, {
      method: "DELETE",
    }),
};

/* =========================================================
   ARTICLES
========================================================= */

export const articlesApi = {
  getAll: () =>
    request<Article[]>("/articles/"),

  getOne: (id: number) =>
    request<Article>(`/articles/${id}/`),

  create: (
    data: Omit<
      Article,
      "id" | "created_at" | "updated_at" | "categorie"
    >
  ) =>
    request<Article>("/articles/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: number,
    data: Partial<
      Omit<
        Article,
        "id" | "created_at" | "updated_at" | "categorie"
      >
    >
  ) =>
    request<Article>(`/articles/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/articles/${id}/`, {
      method: "DELETE",
    }),
};

/* =========================================================
   STOCK
========================================================= */

export const stockApi = {
  getAll: () =>
    request<Stock[]>("/stock/"),

  getOne: (id: number) =>
    request<Stock>(`/stock/${id}/`),

  update: (
    id: number,
    data: Partial<Stock>
  ) =>
    request<Stock>(`/stock/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

/* =========================================================
   ÉTAT DU STOCK
========================================================= */

export const etatStockApi = {
  getAll: () =>
    request<EtatStock[]>("/stock/etat/"),
};