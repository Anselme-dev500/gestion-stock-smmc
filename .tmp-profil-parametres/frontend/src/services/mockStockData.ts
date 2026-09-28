import type { Article, Demande } from "../types/stock";

export const mockArticles: Article[] = [
  { art_code_article: "301004028", art_designation: "Effacil avec diluant", cat_nom: "Fournitures de bureau", art_categorie: "BUREAU", art_unite: "piece", art_quantite_stock: 48, art_seuil_min: 20, emp_code: "RACK12", art_prix_unitaire: 5800, art_etat: 'actif' },
  { art_code_article: "301002045", art_designation: "Papier photocopie A4", cat_nom: "Papeterie", art_categorie: "BUREAU", art_unite: "carton", art_quantite_stock: 12, art_seuil_min: 15, emp_code: "RACK31", art_prix_unitaire: 22000, art_etat: 'actif' },
  { art_code_article: "401001001", art_designation: "Chaussure de sécurité", cat_nom: "Habillement", art_categorie: "EPI", art_unite: "paire", art_quantite_stock: 6, art_seuil_min: 10, emp_code: "RACK72", art_prix_unitaire: 88500, art_etat: 'actif' },
  { art_code_article: "503003002", art_designation: "Cristalline 1L", cat_nom: "Articles divers", art_categorie: "DIVERS", art_unite: "piece", art_quantite_stock: 90, art_seuil_min: 30, emp_code: "RACK31", art_prix_unitaire: 12500, art_etat: 'actif' },
];

export const mockDemandes: Demande[] = [
  {
    dem_id: "1",
    dem_numero: "DEM-2026-0071",
    dem_centre_responsabilite: "CR-OPS",
    service_nom: "Département Opération de Manutention",
    dem_demandeur: "p1",
    demandeur_nom: "Dolin",
    dem_date: "2026-09-10",
    dem_type: "normale",
    dem_statut: "en_cours",
    lignes: [
      { ldem_article: "401001001", art_code: "401001001", art_designation: "Chaussure de sécurité", ldem_quantite_demandee: 10, ldem_quantite_accordee: 0 },
    ],
  },
  {
    dem_id: "2",
    dem_numero: "DEM-2026-0072",
    dem_centre_responsabilite: "CR-SEC",
    service_nom: "Service Sécurité",
    dem_demandeur: "p2",
    demandeur_nom: "Cédric",
    dem_date: "2026-09-11",
    dem_type: "urgence",
    dem_statut: "soumise",
    lignes: [
      { ldem_article: "301004028", art_code: "301004028", art_designation: "Effacil avec diluant", ldem_quantite_demandee: 5, ldem_quantite_accordee: 0 },
    ],
  },
];