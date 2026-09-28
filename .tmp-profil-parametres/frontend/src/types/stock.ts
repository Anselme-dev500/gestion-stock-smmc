export type RoleStock = 'super_admin' | 'chef_departement' | 'responsable_stock' | 'chef_service';

export type StatutDemande = 'soumise' | 'en_cours' | 'livree' | 'refusee';

export type TypeDemande = 'normale' | 'urgence';

export type NiveauValidation = 'dept_demandeur' | 'responsable_stock' | 'dept_appro';

export type StatutValidation = 'validee' | 'refusee';

export interface Categorie {
  cat_id: string;
  cat_nom: string;
  cat_parent?: string | null;
  cat_parent_nom?: string | null;
  nombre_articles?: number;
}

export interface Emplacement {
  emp_id: string;
  emp_code: string;
  emp_description?: string;
  nombre_articles?: number;
}

export interface Fournisseur {
  frn_id: string;
  frn_code?: string;
  frn_nom: string;
  frn_contact?: string;
  frn_telephone?: string;
  frn_email?: string;
  frn_adresse?: string;
}

export interface Article {
  art_code_article: string;
  art_designation: string;
  art_reference?: string;
  art_categorie: string;
  cat_nom?: string;
  art_emplacement?: string;
  emp_code?: string;
  art_unite: string;
  art_prix_unitaire: number;
  art_quantite_stock: number;
  art_seuil_min: number;
  art_seuil_max?: number;
  art_etat: 'actif' | 'inactif';
  est_en_alerte?: boolean;
  art_created_at?: string;
  art_updated_at?: string;
}

export interface LigneDemande {
  ldem_id?: string;
  ldem_article: string;
  art_code?: string;
  art_designation?: string;
  art_unite?: string;
  art_stock_actuel?: number;
  ldem_quantite_demandee: number;
  ldem_quantite_accordee: number;
  ldem_remarque?: string;
}

export interface Validation {
  val_id: string;
  val_demande: string;
  val_niveau: NiveauValidation;
  niveau_display?: string;
  val_statut: StatutValidation;
  statut_display?: string;
  val_validateur: string;
  validateur_nom?: string;
  val_date: string;
  val_commentaire?: string;
}

export interface PieceJointe {
  pj_id: string;
  pj_demande?: string;
  pj_nom_fichier: string;
  pj_fichier: string;
  pj_ajoute_par?: string;
  pj_date_ajout: string;
}

export interface Demande {
  dem_id: string;
  dem_numero: string;
  dem_centre_responsabilite: string;
  service_nom?: string;
  service_code?: string;
  dem_demandeur: string;
  demandeur_nom?: string;
  dem_direction?: string;
  dem_date: string;
  dem_type: TypeDemande;
  type_display?: string;
  dem_motif?: string;
  dem_statut: StatutDemande;
  statut_display?: string;
  lignes: LigneDemande[];
  validations?: Validation[];
  pieces_jointes?: PieceJointe[];
}

export interface EntreeDetail {
  entd_id?: string;
  entd_article: string;
  art_code?: string;
  art_designation?: string;
  entd_quantite: number;
  entd_prix_unitaire: number;
  montant_total?: number;
}

export interface Entree {
  ent_id: string;
  ent_numero: string;
  ent_date: string;
  ent_fournisseur?: string;
  fournisseur_nom?: string;
  ent_responsable?: string;
  responsable_nom?: string;
  ent_bl_reference?: string;
  ent_direction?: string;
  lignes: EntreeDetail[];
}

export interface SortieDetail {
  sord_id?: string;
  sord_article: string;
  art_code?: string;
  art_designation?: string;
  sord_quantite: number;
}

export interface Sortie {
  sor_id: string;
  sor_numero: string;
  sor_date: string;
  sor_demande?: string;
  demande_numero?: string;
  sor_centre_responsabilite: string;
  service_nom?: string;
  sor_responsable?: string;
  responsable_nom?: string;
  sor_direction?: string;
  lignes: SortieDetail[];
}

export interface RetourDetail {
  retd_id?: string;
  retd_article: string;
  art_code?: string;
  art_designation?: string;
  retd_quantite: number;
  retd_etat_article?: string;
}

export interface Retour {
  ret_id: string;
  ret_numero: string;
  ret_date: string;
  ret_centre_responsabilite: string;
  service_nom?: string;
  ret_responsable?: string;
  lignes: RetourDetail[];
}

export interface DotationDirecteDetail {
  dotd_id?: string;
  dotd_article: string;
  art_code?: string;
  art_designation?: string;
  dotd_quantite: number;
}

export interface DotationDirecte {
  dot_id: string;
  dot_numero: string;
  dot_date: string;
  dot_centre_responsabilite: string;
  service_nom?: string;
  dot_responsable?: string;
  dot_justification: string;
  lignes: DotationDirecteDetail[];
}

export interface LigneInventaire {
  linv_id: string;
  linv_inventaire?: string;
  linv_article: string;
  art_code?: string;
  art_designation?: string;
  linv_quantite_theorique: number;
  linv_quantite_reelle: number;
  ecart?: number;
  linv_valeur_theorique?: number;
  linv_valeur_ecart?: number;
  linv_note?: string;
}

export interface Inventaire {
  inv_id: string;
  inv_numero: string;
  inv_type: 'total' | 'partiel';
  inv_statut: 'en_cours' | 'cloture' | 'valide';
  inv_date_debut: string;
  inv_date_fin?: string;
  inv_responsable?: string;
  responsable_nom?: string;
  inv_validateur?: string;
  validateur_nom?: string;
  lignes: LigneInventaire[];
}

export interface DashboardStats {
  total_articles: number;
  articles_alerte: number;
  demandes_soumises: number;
  demandes_en_cours: number;
  demandes_livrees: number;
  valeur_totale_stock: number;
  derniers_mouvements: {
    id: string;
    numero: string;
    date: string;
    service: string;
  }[];
}

export interface JournalAudit {
  aud_id: string;
  aud_personnel?: string;
  personnel_nom?: string;
  aud_action: string;
  aud_details?: string;
  aud_date: string;
}