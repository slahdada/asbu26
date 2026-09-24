import { RideEntry, DriverReport, VehicleReportSummary, VehicleFleetReport, ReportFilterOptions, GlobalReportStats } from '../types';

/**
 * Normalise une chaîne de date YYYY-MM-DD en objet Date calé à minuit UTC/local
 */
export function parseDateOnly(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.trim().slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

/**
 * Formate une date en YYYY-MM-DD
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formate une date au format lisible français (JJ/MM/AAAA)
 */
export function formatDateDisplayFR(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = parseDateOnly(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * RÈGLE 1 : Calcul de la durée de la course de manière INCLUSIVE.
 * 
 * Si date de départ est le 1er du mois et date de retour est le 2 :
 * (2 - 1) = 1 jour d'écart + 1 jour inclusif = EXACTEMENT 2 JOURS.
 * Si date départ = date retour (ex: départ 01 et retour 01) = 1 JOUR.
 * Si une seule date est renseignée = 1 JOUR.
 */
export function calculateInclusiveDays(dateDepart?: string, dateRetour?: string): number {
  if (!dateDepart && !dateRetour) {
    return 1;
  }

  const dStart = dateDepart ? parseDateOnly(dateDepart) : null;
  const dEnd = dateRetour ? parseDateOnly(dateRetour) : null;

  if (dStart && dEnd) {
    const diffMs = dEnd.getTime() - dStart.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      // Cas où la date de retour serait accidentellement antérieure
      return 1;
    }
    // Calcul inclusif obligatoire : (retour - départ) + 1
    return diffDays + 1;
  }

  return 1;
}

/**
 * Vérifie si une course est active ou chevauche la fenêtre de 'nombreDeJours'
 */
export function isEntryInPeriod(
  entry: RideEntry,
  nombreDeJours: number | null,
  referenceDateStr: string
): boolean {
  if (nombreDeJours === null || nombreDeJours <= 0) {
    return true; // Tout l'historique
  }

  const refDate = parseDateOnly(referenceDateStr) || new Date();
  
  // Fenêtre de N jours se terminant à referenceDate
  const windowEnd = new Date(refDate);
  windowEnd.setHours(23, 59, 59, 999);

  const windowStart = new Date(refDate);
  windowStart.setDate(refDate.getDate() - (nombreDeJours - 1));
  windowStart.setHours(0, 0, 0, 0);

  // Déterminer la date de début et de fin de la course
  let entryStart = parseDateOnly(entry.dateDepart);
  let entryEnd = parseDateOnly(entry.dateRetour);

  // Fallbacks si non renseigné
  if (!entryStart && entryEnd) entryStart = entryEnd;
  if (!entryEnd && entryStart) entryEnd = entryStart;
  if (!entryStart && !entryEnd) {
    entryStart = new Date(entry.createdAt);
    entryEnd = new Date(entry.createdAt);
  }

  if (!entryStart || !entryEnd) return false;

  // Chevauchement : [entryStart, entryEnd] chevauche [windowStart, windowEnd]
  return entryStart <= windowEnd && entryEnd >= windowStart;
}

/**
 * RÈGLE 2 & RÈGLE 3 :
 * Génération du rapport complet par chauffeur :
 * - Regroupement par Chauffeur
 * - Regroupement simplifié par véhicule (total des jours additionnés)
 * - Calcul du carburant par véhicule
 * - Somme globale du carburant pour le chauffeur
 */
export function generateDriversReport(
  entries: RideEntry[],
  filters: ReportFilterOptions
): { reports: DriverReport[]; vehicleReports: VehicleFleetReport[]; stats: GlobalReportStats } {
  const { nombreDeJours, dateReference, chauffeurFiltre, searchQuery } = filters;

  // 1. Filtrer les courses selon la période (nombre de jours)
  const periodFiltered = entries.filter((e) => isEntryInPeriod(e, nombreDeJours, dateReference));

  // 2. Filtrer par chauffeur sélectionné si spécifié
  const driverFiltered = periodFiltered.filter((e) => {
    if (!chauffeurFiltre || chauffeurFiltre === 'all') return true;
    return (e.chauffeurNom || '').trim().toLowerCase() === chauffeurFiltre.trim().toLowerCase();
  });

  // 3. Filtrer par recherche textuelle rapide si présente
  const query = (searchQuery || '').trim().toLowerCase();
  const searchFiltered = driverFiltered.filter((e) => {
    if (!query) return true;
    return (
      (e.chauffeurNom || '').toLowerCase().includes(query) ||
      (e.voiture || '').toLowerCase().includes(query) ||
      (e.matricule && e.matricule.toLowerCase().includes(query)) ||
      (e.clientNom && e.clientNom.toLowerCase().includes(query)) ||
      (e.notes && e.notes.toLowerCase().includes(query))
    );
  });

  // 4. Agrégation par Chauffeur
  // Map<ChauffeurKey, { chauffeurNom, chauffeurTel, indicatif, vehiculesMap: Map<VehiculeKey, VehicleReportSummary> }>
  interface DriverAccumulator {
    chauffeurNom: string;
    chauffeurTel: string;
    chauffeurIndicatif?: string;
    vehiculesMap: Map<string, {
      voiture: string;
      matricule?: string;
      labelComplet: string;
      jours: number;
      carburantDT: number;
      nombreCourses: number;
    }>;
  }

  // 4b. Agrégation globale par Voiture (Nombre de jours + Consommation d'énergie totale)
  interface VehicleAccumulator {
    voiture: string;
    matricule?: string;
    labelComplet: string;
    totalJours: number;
    consommationEnergieTotaleDT: number;
    totalCourses: number;
    chauffeursSet: Set<string>;
  }

  const driverMap = new Map<string, DriverAccumulator>();
  const vehicleMap = new Map<string, VehicleAccumulator>();

  for (const entry of searchFiltered) {
    const rawNom = (entry.chauffeurNom || 'Chauffeur Non Spécifié').trim();
    const chauffeurKey = rawNom.toLowerCase();

    if (!driverMap.has(chauffeurKey)) {
      driverMap.set(chauffeurKey, {
        chauffeurNom: rawNom,
        chauffeurTel: entry.chauffeurTel || '',
        chauffeurIndicatif: entry.chauffeurIndicatif || '+216',
        vehiculesMap: new Map()
      });
    }

    const driverAcc = driverMap.get(chauffeurKey)!;
    if (!driverAcc.chauffeurTel && entry.chauffeurTel) {
      driverAcc.chauffeurTel = entry.chauffeurTel;
      driverAcc.chauffeurIndicatif = entry.chauffeurIndicatif || '+216';
    }

    // Identifiant unique du véhicule
    const nomVoiture = (entry.voiture || 'Véhicule Non Renseigné').trim();
    const matricule = (entry.matricule || '').trim();
    const vehiculeKey = matricule 
      ? `${nomVoiture}__${matricule}`.toLowerCase() 
      : nomVoiture.toLowerCase();

    // Règle 1 : Calcul inclusif des jours pour ce trajet
    const joursCourse = calculateInclusiveDays(entry.dateDepart, entry.dateRetour);

    // Carburant / Énergie en DT pour cette course
    const carbCourse = typeof entry.carburant === 'number' && !isNaN(entry.carburant) ? entry.carburant : 0;

    // Libellé complet (ex. "Nissan X-Trail [215 TU 890]" ou "Nissan X-Trail")
    const labelComplet = matricule ? `${nomVoiture} [${matricule}]` : nomVoiture;

    // Agrégation dans le profil du chauffeur
    if (!driverAcc.vehiculesMap.has(vehiculeKey)) {
      driverAcc.vehiculesMap.set(vehiculeKey, {
        voiture: nomVoiture,
        matricule: matricule || undefined,
        labelComplet,
        jours: 0,
        carburantDT: 0,
        nombreCourses: 0
      });
    }

    const vehiculeSummary = driverAcc.vehiculesMap.get(vehiculeKey)!;
    vehiculeSummary.jours += joursCourse;
    vehiculeSummary.carburantDT += carbCourse;
    vehiculeSummary.nombreCourses += 1;

    // Agrégation dans la synthèse globale par voiture
    if (!vehicleMap.has(vehiculeKey)) {
      vehicleMap.set(vehiculeKey, {
        voiture: nomVoiture,
        matricule: matricule || undefined,
        labelComplet,
        totalJours: 0,
        consommationEnergieTotaleDT: 0,
        totalCourses: 0,
        chauffeursSet: new Set()
      });
    }

    const vAcc = vehicleMap.get(vehiculeKey)!;
    vAcc.totalJours += joursCourse;
    vAcc.consommationEnergieTotaleDT += carbCourse;
    vAcc.totalCourses += 1;
    if (rawNom) vAcc.chauffeursSet.add(rawNom);
  }

  // 5. Construction de la liste finale des DriverReport
  const reports: DriverReport[] = [];
  let totalJoursTousChauffeurs = 0;
  let totalCarburantTousChauffeursDT = 0;

  for (const [, acc] of driverMap) {
    const vehiculesList: VehicleReportSummary[] = [];
    let driverTotalJours = 0;
    let driverTotalCarburantDT = 0;
    let driverTotalCourses = 0;

    for (const [, v] of acc.vehiculesMap) {
      const vSummary: VehicleReportSummary = {
        voiture: v.voiture,
        matricule: v.matricule,
        labelComplet: v.labelComplet,
        jours: v.jours,
        carburantDT: Math.round(v.carburantDT * 1000) / 1000,
        nombreCourses: v.nombreCourses
      };

      vehiculesList.push(vSummary);
      driverTotalJours += v.jours;
      driverTotalCarburantDT += v.carburantDT;
      driverTotalCourses += v.nombreCourses;
    }

    // Trier les véhicules par nombre de jours décroissant
    vehiculesList.sort((a, b) => b.jours - a.jours);

    const driverReport: DriverReport = {
      chauffeurNom: acc.chauffeurNom,
      chauffeurTel: acc.chauffeurTel,
      chauffeurIndicatif: acc.chauffeurIndicatif,
      totalJours: driverTotalJours,
      totalCarburantDT: Math.round(driverTotalCarburantDT * 1000) / 1000,
      totalCourses: driverTotalCourses,
      vehicules: vehiculesList
    };

    reports.push(driverReport);
    totalJoursTousChauffeurs += driverTotalJours;
    totalCarburantTousChauffeursDT += driverTotalCarburantDT;
  }

  // Trier les chauffeurs par total de jours d'activité décroissant
  reports.sort((a, b) => b.totalJours - a.totalJours);

  // 6. Construction de la liste finale par Voiture (VehicleFleetReport)
  const vehicleReports: VehicleFleetReport[] = [];
  let totalJoursFlotte = 0;
  let consommationEnergieTotaleFlotteDT = 0;

  for (const [, v] of vehicleMap) {
    const vRep: VehicleFleetReport = {
      voiture: v.voiture,
      matricule: v.matricule,
      labelComplet: v.labelComplet,
      totalJours: v.totalJours,
      consommationEnergieTotaleDT: Math.round(v.consommationEnergieTotaleDT * 1000) / 1000,
      totalCourses: v.totalCourses,
      chauffeurs: Array.from(v.chauffeursSet)
    };
    vehicleReports.push(vRep);
    totalJoursFlotte += v.totalJours;
    consommationEnergieTotaleFlotteDT += v.consommationEnergieTotaleDT;
  }

  // Trier les véhicules par total de jours d'activité décroissant
  vehicleReports.sort((a, b) => b.totalJours - a.totalJours);

  // Construction du libellé de période
  let periodeTexte = '';
  if (nombreDeJours === null) {
    periodeTexte = "Tout l'historique";
  } else {
    const refDate = parseDateOnly(dateReference) || new Date();
    const startDate = new Date(refDate);
    startDate.setDate(refDate.getDate() - (nombreDeJours - 1));
    periodeTexte = `Derniers ${nombreDeJours} jours (du ${startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} au ${refDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })})`;
  }

  const stats: GlobalReportStats = {
    totalChauffeurs: reports.length,
    totalJoursTousChauffeurs,
    totalCarburantTousChauffeursDT: Math.round(totalCarburantTousChauffeursDT * 1000) / 1000,
    consommationEnergieTotaleFlotteDT: Math.round(consommationEnergieTotaleFlotteDT * 1000) / 1000,
    totalJoursFlotte,
    totalVehiculesDistincts: vehicleReports.length,
    totalCourses: searchFiltered.length,
    periodeTexte
  };

  return { reports, vehicleReports, stats };
}

/**
 * Récupère la liste de tous les chauffeurs uniques enregistrés dans les courses
 */
export function getUniqueDriversList(entries: RideEntry[]): string[] {
  const drivers = new Set<string>();
  for (const e of entries) {
    const name = (e.chauffeurNom || '').trim();
    if (name) drivers.add(name);
  }
  return Array.from(drivers).sort((a, b) => a.localeCompare(b, 'fr'));
}
