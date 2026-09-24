/**
 * Ravitaillement / Log de carburant en DT avec date automatique
 */
export interface FuelRecord {
  id: string;
  montant: number; // Montant en Dinars Tunisiens (DT)
  date: string; // Date et heure de l'ajout automatique (ex. '24/09/2026 à 14:30' ou YYYY-MM-DD HH:mm)
  note?: string; // Note optionnelle (ex. 'Plein station Shell', 'Carburant départ')
}

/**
 * Type representing a course/vehicle entry in the fleet manager.
 */
export interface RideEntry {
  id: string;
  voiture: string; // Brand & model
  matricule?: string; // Tunisian license plate e.g. '1234 TU 258'
  chauffeurNom: string;
  chauffeurIndicatif?: string; // e.g. '+216'
  chauffeurTel: string;
  clientNom: string;
  clientIndicatif?: string; // e.g. '+216'
  clientTel: string;
  dateDepart?: string; // YYYY-MM-DD
  dateRetour?: string; // YYYY-MM-DD
  carburant?: number; // Montant total de carburant en DT (Dinar Tunisien)
  dateCarburant?: string; // Date d'ajout automatique du carburant
  carburantHistorique?: FuelRecord[]; // Historique de tous les ajouts de carburant
  notes: string;
  createdAt: number;
}

/**
 * Résumé par véhicule pour un chauffeur donné
 */
export interface VehicleReportSummary {
  voiture: string; // Nom du véhicule (ex. "Mercedes", "BMW")
  matricule?: string; // Plaque d'immatriculation (ex. "1234 TU 258")
  labelComplet: string; // Ex. "Mercedes [1234 TU 258]" ou "Mercedes"
  jours: number; // Total des jours passés (calcul inclusif)
  carburantDT: number; // Somme du carburant en DT pour cette voiture
  nombreCourses: number; // Nombre de trajets effectués
}

/**
 * Rapport individuel pour chaque voiture de la flotte
 * (Nombre de jours passés + Consommation d'énergie totale en DT)
 */
export interface VehicleFleetReport {
  voiture: string; // Nom de la voiture (marque & modèle)
  matricule?: string; // Matricule ex. '215 TU 890'
  labelComplet: string; // Ex. 'Nissan X-Trail [215 TU 890]'
  totalJours: number; // Nombre de jours total passé en mission (calcul inclusif)
  consommationEnergieTotaleDT: number; // Consommation d'énergie / carburant totale en DT
  totalCourses: number; // Nombre total de trajets
  chauffeurs: string[]; // Liste des chauffeurs ayant utilisé cette voiture
}

/**
 * Rapport synthétique agrégé par chauffeur
 */
export interface DriverReport {
  chauffeurNom: string;
  chauffeurTel: string;
  chauffeurIndicatif?: string;
  totalJours: number; // Somme cumulée des jours passés sur l'ensemble des véhicules
  totalCarburantDT: number; // Somme globale du carburant (DT) pour l'ensemble des voitures
  totalCourses: number;
  vehicules: VehicleReportSummary[]; // Liste regroupée et simplifiée par véhicule
}

/**
 * Options de filtrage pour le rapport
 */
export interface ReportFilterOptions {
  nombreDeJours: number | null; // null = tout l'historique, sinon 7, 15, 30, etc.
  dateReference: string; // YYYY-MM-DD
  chauffeurFiltre: string; // 'all' ou nom du chauffeur
  searchQuery: string;
}

/**
 * Statistiques globales du rapport pour la période
 */
export interface GlobalReportStats {
  totalChauffeurs: number;
  totalJoursTousChauffeurs: number;
  totalCarburantTousChauffeursDT: number;
  consommationEnergieTotaleFlotteDT: number; // Consommation d'énergie totale de toute la flotte en DT
  totalJoursFlotte: number; // Total des jours cumulés par tous les véhicules
  totalVehiculesDistincts: number;
  totalCourses: number;
  periodeTexte: string;
}

