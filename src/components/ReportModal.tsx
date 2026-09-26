import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Calendar, 
  Fuel, 
  User, 
  Car, 
  FileDown, 
  Printer, 
  Search, 
  Filter, 
  Check, 
  Phone,
  BarChart3, 
  Layers, 
  ArrowUpDown,
  Maximize2,
  Minimize2,
  RotateCcw,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RideEntry, DriverReport, VehicleFleetReport, VehicleReportSummary } from '../types';
import { 
  formatDateToYYYYMMDD,
  formatDateDisplayFR,
  calculateInclusiveDays,
  parseDateOnly
} from '../utils/reportUtils';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: RideEntry[];
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  entries
}) => {
  // Mode Plein Écran pour PC, tablettes et smartphones (évite le scroll horizontal)
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Onglet actif : Synthèse par Voiture vs Rapport par Chauffeur vs Vue Complète
  const [activeReportTab, setActiveReportTab] = useState<'vehicles' | 'drivers' | 'all'>('vehicles');

  // Tri pour la liste des véhicules
  const [vehicleSortBy, setVehicleSortBy] = useState<'days' | 'energy' | 'name'>('days');

  // Période personnalisée (Date de début et Date de fin)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Preset actif sélectionné
  const [activePreset, setActivePreset] = useState<'all' | 'this_month' | 'last_month' | '30_days' | '7_days' | 'custom'>('30_days');

  // Filtre chauffeur spécifique ('all' ou nom du chauffeur)
  const [chauffeurFiltre, setChauffeurFiltre] = useState<string>('all');

  // Recherche textuelle interne au rapport
  const [searchQuery, setSearchQuery] = useState<string>('');

  // État de notification / feedback utilisateur (ex: succès ou erreur PDF)
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Référence pour focus trap & accessibilité
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Initialisation par défaut sur les 30 derniers jours
  useEffect(() => {
    if (activePreset === '30_days' && !startDate && !endDate) {
      const now = new Date();
      const past = new Date();
      past.setDate(now.getDate() - 29);
      setStartDate(formatDateToYYYYMMDD(past));
      setEndDate(formatDateToYYYYMMDD(now));
    }
  }, [activePreset, startDate, endDate]);

  // MISSION 1 (Priorité Élevée) : Gestion de l'accessibilité au clavier (Touche Échap) et bloquage du scroll body
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus sur la modale pour l'accessibilité des lecteurs d'écran
    setTimeout(() => {
      modalContentRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  // Effacer automatiquement le message de feedback après 4 secondes
  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  // Raccourcis de sélection de période
  const handlePresetChange = (preset: 'all' | 'this_month' | 'last_month' | '30_days' | '7_days') => {
    setActivePreset(preset);
    const now = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(formatDateToYYYYMMDD(firstDay));
      setEndDate(formatDateToYYYYMMDD(lastDay));
      return;
    }

    if (preset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(formatDateToYYYYMMDD(firstDay));
      setEndDate(formatDateToYYYYMMDD(lastDay));
      return;
    }

    if (preset === '30_days') {
      const past = new Date();
      past.setDate(now.getDate() - 29);
      setStartDate(formatDateToYYYYMMDD(past));
      setEndDate(formatDateToYYYYMMDD(now));
      return;
    }

    if (preset === '7_days') {
      const past = new Date();
      past.setDate(now.getDate() - 6);
      setStartDate(formatDateToYYYYMMDD(past));
      setEndDate(formatDateToYYYYMMDD(now));
      return;
    }
  };

  // Liste de tous les chauffeurs disponibles pour le filtre
  const availableDrivers = useMemo(() => {
    const drivers = new Set<string>();
    for (const e of entries) {
      const name = (e.chauffeurNom || '').trim();
      if (name) drivers.add(name);
    }
    return Array.from(drivers).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [entries]);

  // MISSION 2 : Logique de filtrage et de calcul du Rapport
  const { filteredEntries, reports, vehicleReports, stats } = useMemo(() => {
    // 1. Filtrage par Période (Date de début et Date de fin)
    const periodFiltered = entries.filter((entry) => {
      if (!startDate && !endDate) return true;

      let entryStart = entry.dateDepart || entry.dateRetour || '';
      let entryEnd = entry.dateRetour || entry.dateDepart || '';

      if (!entryStart && !entryEnd && entry.createdAt) {
        const createdStr = new Date(entry.createdAt).toISOString().slice(0, 10);
        entryStart = createdStr;
        entryEnd = createdStr;
      }

      // Si date de début définie, le trajet ne doit pas se terminer avant
      if (startDate && entryEnd && entryEnd < startDate) {
        return false;
      }
      // Si date de fin définie, le trajet ne doit pas commencer après
      if (endDate && entryStart && entryStart > endDate) {
        return false;
      }
      return true;
    });

    // 2. Filtrage par Chauffeur
    const driverFiltered = periodFiltered.filter((e) => {
      if (!chauffeurFiltre || chauffeurFiltre === 'all') return true;
      return (e.chauffeurNom || '').trim().toLowerCase() === chauffeurFiltre.trim().toLowerCase();
    });

    // 3. Filtrage par Recherche textuelle interne
    const query = (searchQuery || '').trim().toLowerCase();
    const finalFiltered = driverFiltered.filter((e) => {
      if (!query) return true;
      return (
        (e.chauffeurNom || '').toLowerCase().includes(query) ||
        (e.voiture || '').toLowerCase().includes(query) ||
        (e.matricule && e.matricule.toLowerCase().includes(query)) ||
        (e.clientNom && e.clientNom.toLowerCase().includes(query)) ||
        (e.notes && e.notes.toLowerCase().includes(query))
      );
    });

    // 4. Agrégation par Chauffeur (MISSION 2 : Suivi des jours par chauffeur & regroupement par voiture)
    interface DriverAcc {
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

    // 5. Agrégation par Véhicule (MISSION 2 : Suivi du carburant individuel & total global)
    interface VehicleAcc {
      voiture: string;
      matricule?: string;
      labelComplet: string;
      totalJours: number;
      consommationEnergieTotaleDT: number;
      totalCourses: number;
      chauffeursSet: Set<string>;
    }

    const driverMap = new Map<string, DriverAcc>();
    const vehicleMap = new Map<string, VehicleAcc>();

    for (const entry of finalFiltered) {
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

      // Clé unique du véhicule (Voiture + Matricule)
      const nomVoiture = (entry.voiture || 'Véhicule Non Renseigné').trim();
      const matricule = (entry.matricule || '').trim();
      const vehiculeKey = matricule 
        ? `${nomVoiture}__${matricule}`.toLowerCase() 
        : nomVoiture.toLowerCase();

      // MISSION 2 : Règle de calcul inclusif des jours (départ 1er, retour 2 = 2 jours)
      const joursCourse = calculateInclusiveDays(entry.dateDepart, entry.dateRetour);

      // Consommation de carburant en DT pour cette course
      const carbCourse = typeof entry.carburant === 'number' && !isNaN(entry.carburant) ? entry.carburant : 0;
      const labelComplet = matricule ? `${nomVoiture} [${matricule}]` : nomVoiture;

      // Agrégation par véhicule pour le chauffeur
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

      const vDriver = driverAcc.vehiculesMap.get(vehiculeKey)!;
      vDriver.jours += joursCourse;
      vDriver.carburantDT += carbCourse;
      vDriver.nombreCourses += 1;

      // Agrégation globale pour la flotte de véhicules
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

    // Construction de la liste des rapports Chauffeurs
    const generatedReports: DriverReport[] = [];
    let totalJoursTousChauffeurs = 0;
    let totalCarburantTousChauffeursDT = 0;

    for (const [, acc] of driverMap) {
      const vehiculesList: VehicleReportSummary[] = [];
      let driverTotalJours = 0;
      let driverTotalCarburantDT = 0;
      let driverTotalCourses = 0;

      for (const [, v] of acc.vehiculesMap) {
        vehiculesList.push({
          voiture: v.voiture,
          matricule: v.matricule,
          labelComplet: v.labelComplet,
          jours: v.jours,
          carburantDT: Math.round(v.carburantDT * 1000) / 1000,
          nombreCourses: v.nombreCourses
        });
        driverTotalJours += v.jours;
        driverTotalCarburantDT += v.carburantDT;
        driverTotalCourses += v.nombreCourses;
      }

      // Trier les véhicules d'un chauffeur par nombre de jours décroissant
      vehiculesList.sort((a, b) => b.jours - a.jours);

      generatedReports.push({
        chauffeurNom: acc.chauffeurNom,
        chauffeurTel: acc.chauffeurTel,
        chauffeurIndicatif: acc.chauffeurIndicatif,
        totalJours: driverTotalJours,
        totalCarburantDT: Math.round(driverTotalCarburantDT * 1000) / 1000,
        totalCourses: driverTotalCourses,
        vehicules: vehiculesList
      });

      totalJoursTousChauffeurs += driverTotalJours;
      totalCarburantTousChauffeursDT += driverTotalCarburantDT;
    }

    generatedReports.sort((a, b) => b.totalJours - a.totalJours);

    // Construction de la liste des rapports Véhicules
    const generatedVehicles: VehicleFleetReport[] = [];
    let totalJoursFlotte = 0;
    let consommationEnergieTotaleFlotteDT = 0;

    for (const [, v] of vehicleMap) {
      generatedVehicles.push({
        voiture: v.voiture,
        matricule: v.matricule,
        labelComplet: v.labelComplet,
        totalJours: v.totalJours,
        consommationEnergieTotaleDT: Math.round(v.consommationEnergieTotaleDT * 1000) / 1000,
        totalCourses: v.totalCourses,
        chauffeurs: Array.from(v.chauffeursSet)
      });
      totalJoursFlotte += v.totalJours;
      consommationEnergieTotaleFlotteDT += v.consommationEnergieTotaleDT;
    }

    generatedVehicles.sort((a, b) => b.totalJours - a.totalJours);

    // Libellé textuel de la période pour affichage & impression
    let periodeTexte = "Toute la période historique";
    if (startDate && endDate) {
      periodeTexte = `Du ${formatDateDisplayFR(startDate)} au ${formatDateDisplayFR(endDate)}`;
    } else if (startDate) {
      periodeTexte = `À partir du ${formatDateDisplayFR(startDate)}`;
    } else if (endDate) {
      periodeTexte = `Jusqu'au ${formatDateDisplayFR(endDate)}`;
    }

    return {
      filteredEntries: finalFiltered,
      reports: generatedReports,
      vehicleReports: generatedVehicles,
      stats: {
        totalChauffeurs: generatedReports.length,
        totalJoursTousChauffeurs,
        totalCarburantTousChauffeursDT: Math.round(totalCarburantTousChauffeursDT * 1000) / 1000,
        consommationEnergieTotaleFlotteDT: Math.round(consommationEnergieTotaleFlotteDT * 1000) / 1000,
        totalJoursFlotte,
        totalVehiculesDistincts: generatedVehicles.length,
        totalCourses: finalFiltered.length,
        periodeTexte
      }
    };
  }, [entries, startDate, endDate, chauffeurFiltre, searchQuery]);

  // Liste triée des véhicules
  const sortedVehicleReports = useMemo(() => {
    return [...vehicleReports].sort((a, b) => {
      if (vehicleSortBy === 'days') return b.totalJours - a.totalJours;
      if (vehicleSortBy === 'energy') return b.consommationEnergieTotaleDT - a.consommationEnergieTotaleDT;
      return a.labelComplet.localeCompare(b.labelComplet, 'fr');
    });
  }, [vehicleReports, vehicleSortBy]);

  // Export PDF haute qualité du Rapport Flotte, Voitures & Chauffeurs
  const handleExportReportPDF = () => {
    if (filteredEntries.length === 0) {
      setFeedbackMessage({
        text: 'Aucune donnée disponible dans cette période pour exporter le PDF.',
        type: 'info'
      });
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 1. En-tête officiel
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 36, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('GESTION DE FLOTTE & LOCATION AUTOMOBILE', 14, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(56, 189, 248); // sky-400
      doc.text(`Rapport Période : ${stats.periodeTexte}`, 14, 22);

      const dateStr = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Généré le ${dateStr} · Calcul inclusif exact (Dép. 1er - Ret. 2 = 2 Jours)`, 14, 29);

      // 2. Chiffres clés KPI
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 40, 182, 17, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('VÉHICULES ACTIFS', 22, 46);
      doc.text('JOURS CUMULÉS FLOTTE', 65, 46);
      doc.text('CARBURANT TOTAL', 120, 46);
      doc.text('CHAUFFEURS', 165, 46);

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${stats.totalVehiculesDistincts} Voiture(s)`, 22, 53);
      doc.setTextColor(2, 132, 199);
      doc.text(`${stats.totalJoursFlotte} Jours`, 65, 53);
      doc.setTextColor(217, 119, 6);
      doc.text(`${stats.consommationEnergieTotaleFlotteDT} DT`, 120, 53);
      doc.setTextColor(15, 23, 42);
      doc.text(`${stats.totalChauffeurs} Chauffeur(s)`, 165, 53);

      // 3. Tableau 1 : Synthèse par Véhicule (Total des Jours & Consommation d'Énergie)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('1. SYNTHÈSE PAR VÉHICULE : NOMBRE DE JOURS & CARBURANT TOTAL', 14, 65);

      const vehicleRows = sortedVehicleReports.map((v, i) => [
        String(i + 1),
        v.labelComplet,
        `${v.totalJours} Jour(s)`,
        `${v.consommationEnergieTotaleDT} DT`,
        v.totalJours > 0 ? `${(v.consommationEnergieTotaleDT / v.totalJours).toFixed(1)} DT/j` : '—',
        String(v.totalCourses),
        v.chauffeurs.join(', ') || 'Non spécifié'
      ]);

      autoTable(doc, {
        startY: 68,
        head: [['#', 'Véhicule & Immatriculation', 'Total Jours', 'Carburant Total (DT)', 'Moy. DT/Jour', 'Courses', 'Chauffeur(s)']],
        body: vehicleRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        foot: [[
          'TOTAL',
          `FLOTTE GLOBALE (${stats.totalVehiculesDistincts} Véhicules)`,
          `${stats.totalJoursFlotte} Jours`,
          `${stats.consommationEnergieTotaleFlotteDT} DT`,
          stats.totalJoursFlotte > 0 ? `${(stats.consommationEnergieTotaleFlotteDT / stats.totalJoursFlotte).toFixed(1)} DT/j` : '—',
          String(stats.totalCourses),
          ''
        ]],
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 }
      });

      // 4. Tableau 2 : Détail par Chauffeur avec Total par Voiture
      const currentFinalY = (doc as any).lastAutoTable?.finalY || 130;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('2. SUIVI DES CHAUFFEURS : JOURS & RÉPARTITION PAR VOITURE', 14, currentFinalY + 10);

      const driverRows = reports.map((d, i) => {
        // Format épuré : "Mercedes : 5 Jours | BMW : 3 Jours"
        const vehiculesSynthese = d.vehicules
          .map((v) => `${v.voiture} : ${v.jours} J (${v.carburantDT} DT)`)
          .join(' | ');

        return [
          String(i + 1),
          d.chauffeurNom,
          d.chauffeurTel ? `${d.chauffeurIndicatif || ''} ${d.chauffeurTel}` : '—',
          `${d.totalJours} Jour(s)`,
          `${d.totalCarburantDT} DT`,
          vehiculesSynthese || 'Aucun véhicule'
        ];
      });

      autoTable(doc, {
        startY: currentFinalY + 13,
        head: [['#', 'Chauffeur', 'Téléphone', 'Total Jours', 'Carburant Global (DT)', 'Détail par Voiture (Ex: Mercedes : 5 Jours | BMW : 3 Jours)']],
        body: driverRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2.2 },
        headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold' },
        foot: [[
          'TOTAL',
          `TOUS CHAUFFEURS (${reports.length})`,
          '',
          `${stats.totalJoursTousChauffeurs} Jours`,
          `${stats.totalCarburantTousChauffeursDT} DT`,
          ''
        ]],
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 }
      });

      // Téléchargement sécurisé
      const safeStart = startDate ? startDate.replace(/-/g, '') : 'debut';
      const safeEnd = endDate ? endDate.replace(/-/g, '') : 'fin';
      doc.save(`Rapport_Flotte_Chauffeurs_${safeStart}_${safeEnd}.pdf`);

      setFeedbackMessage({
        text: 'Rapport PDF généré et téléchargé avec succès !',
        type: 'success'
      });
    } catch (err) {
      console.error('Erreur export PDF rapport:', err);
      setFeedbackMessage({
        text: 'Erreur lors de la création du fichier PDF. Veuillez réessayer.',
        type: 'error'
      });
    }
  };

  // Impression native iframe-safe
  const handlePrintReport = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div 
      id="report-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-3 overflow-y-auto animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div 
        ref={modalContentRef}
        id="report-modal-content"
        tabIndex={-1}
        className={`flex flex-col bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden transition-all duration-200 text-slate-100 ${
          isFullscreen 
            ? 'fixed inset-0 w-full h-full max-w-none max-h-none rounded-none z-50' 
            : 'w-full max-w-5xl max-h-[94vh] rounded-2xl sm:rounded-3xl m-auto'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête du Modal */}
        <header className="px-3.5 sm:px-5 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-600 flex items-center justify-center shadow-md shadow-sky-950/50 text-white shrink-0">
              <BarChart3 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="report-modal-title" className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                  Rapport Chauffeurs & Carburant
                </h2>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono text-[10px] font-bold">
                  Calcul Inclusif
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Période : <strong className="text-slate-200">{stats.periodeTexte}</strong>
              </p>
            </div>
          </div>

          {/* Boutons d'action supérieurs */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Bouton Plein Écran */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer touch-manipulation active:scale-95"
              aria-label={isFullscreen ? "Quitter le plein écran" : "Afficher en plein écran"}
              title={isFullscreen ? "Quitter le mode plein écran" : "Adapter en plein écran (idéal pour PC et mobile)"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                  <span className="hidden sm:inline">Réduire</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                  <span className="hidden sm:inline">Plein Écran</span>
                </>
              )}
            </button>

            {/* Bouton Télécharger PDF Header */}
            <button
              type="button"
              onClick={handleExportReportPDF}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/90 border border-cyan-800/80 hover:bg-cyan-900 text-cyan-300 text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation"
              aria-label="Télécharger le rapport au format PDF"
              title="Télécharger le rapport au format PDF"
            >
              <FileDown className="w-4 h-4" aria-hidden="true" />
              <span>PDF</span>
            </button>

            {/* Bouton Imprimer Header */}
            <button
              type="button"
              onClick={handlePrintReport}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation"
              aria-label="Imprimer le rapport"
              title="Imprimer ce rapport"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span>Imprimer</span>
            </button>

            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer touch-manipulation"
              aria-label="Fermer la fenêtre du rapport"
              title="Fermer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Bannière de feedback utilisateur (Accessible) */}
        {feedbackMessage && (
          <div 
            role="status" 
            aria-live="polite" 
            className={`px-4 py-2 text-xs font-semibold flex items-center justify-between transition-all shrink-0 ${
              feedbackMessage.type === 'success' 
                ? 'bg-emerald-950/90 text-emerald-200 border-b border-emerald-800/70' 
                : feedbackMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-b border-rose-800/70'
                : 'bg-sky-950/90 text-sky-200 border-b border-sky-800/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-white p-0.5"
              aria-label="Fermer le message"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Corps du Modal avec défilement fluide sans espace superflu */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          
          {/* 1. ZONE DE FILTRES PAR PÉRIODE EN HAUT (MISSION 2 - Exigence 1) */}
          <section className="bg-slate-900/80 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sélection de la Période & Filtres</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3 text-cyan-400" aria-hidden="true" />
                <span>{filteredEntries.length} course{filteredEntries.length > 1 ? 's' : ''} trouvée{filteredEntries.length > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Raccourcis de période rapides */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Raccourcis :</span>
              <button
                type="button"
                onClick={() => handlePresetChange('30_days')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activePreset === '30_days'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                30 derniers jours
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('this_month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activePreset === 'this_month'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                Ce mois
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('last_month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activePreset === 'last_month'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                Mois dernier
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('7_days')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activePreset === '7_days'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                7 jours
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activePreset === 'all'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                Tout l'historique
              </button>

              {(startDate || endDate || chauffeurFiltre !== 'all' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    handlePresetChange('all');
                    setChauffeurFiltre('all');
                    setSearchQuery('');
                  }}
                  className="ml-auto text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                  title="Réinitialiser tous les filtres"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>Réinitialiser</span>
                </button>
              )}
            </div>

            {/* Champs Date début, Date fin, Chauffeur et Recherche */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {/* Date Début */}
              <div className="flex flex-col gap-1">
                <label htmlFor="report-filter-start-date" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Date de début</span>
                  {startDate && (
                    <button
                      type="button"
                      onClick={() => { setStartDate(''); setActivePreset('custom'); }}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      Effacer
                    </button>
                  )}
                </label>
                <input
                  id="report-filter-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Date Fin */}
              <div className="flex flex-col gap-1">
                <label htmlFor="report-filter-end-date" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Date de fin</span>
                  {endDate && (
                    <button
                      type="button"
                      onClick={() => { setEndDate(''); setActivePreset('custom'); }}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      Effacer
                    </button>
                  )}
                </label>
                <input
                  id="report-filter-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Filtre Chauffeur */}
              <div className="flex flex-col gap-1">
                <label htmlFor="report-filter-driver" className="text-xs font-semibold text-slate-300">
                  Chauffeur
                </label>
                <select
                  id="report-filter-driver"
                  value={chauffeurFiltre}
                  onChange={(e) => setChauffeurFiltre(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">Tous les chauffeurs ({availableDrivers.length})</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver} value={driver}>
                      {driver}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recherche Rapide */}
              <div className="flex flex-col gap-1">
                <label htmlFor="report-filter-search" className="text-xs font-semibold text-slate-300">
                  Recherche rapide
                </label>
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5" aria-hidden="true" />
                  <input
                    id="report-filter-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Voiture, chauffeur, client..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 p-1 text-slate-500 hover:text-white"
                      aria-label="Effacer la recherche"
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 2. SYNTHÈSE GLOBALE DES INDICATEURS CLÉS (KPI) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5 sm:p-3">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Véhicules Actifs</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-emerald-300 font-mono">{stats.totalVehiculesDistincts}</span>
                <span className="text-[11px] text-slate-400">voiture{stats.totalVehiculesDistincts > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5 sm:p-3">
              <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-0.5">Total Jours Flotte</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-cyan-300 font-mono">{stats.totalJoursFlotte}</span>
                <span className="text-[11px] text-cyan-400/80">Jours</span>
              </div>
            </div>

            {/* Suivi du Carburant : Total Global Flotte */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5 sm:p-3">
              <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">Carburant Total Flotte</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-amber-300 font-mono">{stats.consommationEnergieTotaleFlotteDT}</span>
                <span className="text-[11px] text-amber-400/80">DT</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5 sm:p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Chauffeurs Concernés</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-white font-mono">{stats.totalChauffeurs}</span>
                <span className="text-[11px] text-slate-400">chauffeur{stats.totalChauffeurs > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* 3. SÉLECTEUR D'ONGLETS SÉMANTIQUE (MISSION 1 - Priorité Moyenne) */}
          <div 
            role="tablist" 
            aria-label="Type de synthèse du rapport"
            className="flex items-center gap-1.5 border-b border-slate-800 pb-1 overflow-x-auto"
          >
            <button
              id="tab-vehicles"
              type="button"
              role="tab"
              aria-selected={activeReportTab === 'vehicles'}
              aria-controls="panel-vehicles"
              onClick={() => setActiveReportTab('vehicles')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer touch-manipulation whitespace-nowrap ${
                activeReportTab === 'vehicles'
                  ? 'bg-cyan-600 text-white shadow-md border border-cyan-500'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Car className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Synthèse par Voiture (Jours & Carburant)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-mono font-bold">
                {vehicleReports.length}
              </span>
            </button>

            <button
              id="tab-drivers"
              type="button"
              role="tab"
              aria-selected={activeReportTab === 'drivers'}
              aria-controls="panel-drivers"
              onClick={() => setActiveReportTab('drivers')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer touch-manipulation whitespace-nowrap ${
                activeReportTab === 'drivers'
                  ? 'bg-cyan-600 text-white shadow-md border border-cyan-500'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Suivi par Chauffeur</span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-mono font-bold">
                {reports.length}
              </span>
            </button>

            <button
              id="tab-all"
              type="button"
              role="tab"
              aria-selected={activeReportTab === 'all'}
              aria-controls="panel-all"
              onClick={() => setActiveReportTab('all')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer touch-manipulation whitespace-nowrap ${
                activeReportTab === 'all'
                  ? 'bg-cyan-600 text-white shadow-md border border-cyan-500'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Vue Complète</span>
            </button>
          </div>

          {/* 4. SECTION VOITURES : NOMBRE DE JOURS & CARBURANT TOTAL (MISSION 2 - Exigence 3) */}
          {(activeReportTab === 'vehicles' || activeReportTab === 'all') && (
            <div 
              id="panel-vehicles" 
              role="tabpanel" 
              aria-labelledby="tab-vehicles"
              className="space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-800/80">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                    <span>Synthèse par Véhicule : Jours & Carburant Consommé</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Durée calculée de manière inclusive (ex: départ le 1er, retour le 2 = 2 jours).
                  </p>
                </div>

                {/* Tri des véhicules */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                  <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                    Trier :
                  </span>
                  <button
                    type="button"
                    onClick={() => setVehicleSortBy('days')}
                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      vehicleSortBy === 'days'
                        ? 'bg-cyan-600 text-white font-bold'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    Jours
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleSortBy('energy')}
                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      vehicleSortBy === 'energy'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    Carburant (DT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleSortBy('name')}
                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      vehicleSortBy === 'name'
                        ? 'bg-slate-700 text-white font-bold'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    Nom A-Z
                  </button>
                </div>
              </div>

              {sortedVehicleReports.length === 0 ? (
                <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-6 text-center space-y-1.5">
                  <Car className="w-7 h-7 text-slate-600 mx-auto" aria-hidden="true" />
                  <p className="text-xs font-semibold text-slate-300">Aucun véhicule trouvé pour cette période</p>
                  <p className="text-[11px] text-slate-500">
                    Modifiez la sélection de dates ou le filtre de recherche pour voir les données.
                  </p>
                </div>
              ) : (
                <>
                  {/* Tableau de synthèse par véhicule avec total individuel et ligne de total global */}
                  <div className="bg-slate-950 rounded-xl sm:rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-300 border-b border-slate-800 font-bold">
                          <tr>
                            <th scope="col" className="py-2.5 px-3 w-8 text-center text-slate-500">#</th>
                            <th scope="col" className="py-2.5 px-3">Véhicule & Immatriculation</th>
                            <th scope="col" className="py-2.5 px-3 text-center">Jours Cumulés</th>
                            <th scope="col" className="py-2.5 px-3 text-right">Carburant Consommé</th>
                            <th scope="col" className="py-2.5 px-3 text-right hidden sm:table-cell">Moyenne DT/Jour</th>
                            <th scope="col" className="py-2.5 px-3 text-center hidden md:table-cell">Courses</th>
                            <th scope="col" className="py-2.5 px-3 hidden lg:table-cell">Chauffeur(s)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {sortedVehicleReports.map((v, idx) => (
                            <tr key={v.labelComplet} className="hover:bg-slate-900/40 transition-colors">
                              <td className="py-2 px-3 text-center text-slate-500 font-mono font-semibold">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-bold text-white">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{v.voiture}</span>
                                  {v.matricule && (
                                    <span className="px-1.5 py-0.2 rounded bg-black text-amber-300 border border-slate-800 font-mono font-bold text-[10px]">
                                      {v.matricule}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded-lg text-xs">
                                  <Calendar className="w-3 h-3 text-cyan-400" aria-hidden="true" />
                                  {v.totalJours} Jour{v.totalJours > 1 ? 's' : ''}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-300 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded-lg text-xs">
                                  <Fuel className="w-3 h-3 text-amber-400" aria-hidden="true" />
                                  {v.consommationEnergieTotaleDT} DT
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-300 hidden sm:table-cell">
                                {v.totalJours > 0 ? `${(v.consommationEnergieTotaleDT / v.totalJours).toFixed(1)} DT/j` : '—'}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-slate-300 hidden md:table-cell">
                                {v.totalCourses}
                              </td>
                              <td className="py-2 px-3 text-slate-400 text-[11px] hidden lg:table-cell">
                                {v.chauffeurs.join(', ') || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {/* Ligne de Total Global Flotte (Exigence MISSION 2) */}
                        <tfoot className="bg-slate-900 font-bold text-slate-100 border-t-2 border-slate-700">
                          <tr>
                            <td colSpan={2} className="py-2.5 px-3 uppercase text-xs text-cyan-400 font-black">
                              TOTAL GLOBAL FLOTTE ({stats.totalVehiculesDistincts} Véhicules)
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-cyan-300 text-xs sm:text-sm font-black">
                              {stats.totalJoursFlotte} Jours
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-amber-300 text-xs sm:text-sm font-black">
                              {stats.consommationEnergieTotaleFlotteDT} DT
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-300 hidden sm:table-cell">
                              {stats.totalJoursFlotte > 0 ? `${(stats.consommationEnergieTotaleFlotteDT / stats.totalJoursFlotte).toFixed(1)} DT/j` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono hidden md:table-cell">
                              {stats.totalCourses}
                            </td>
                            <td className="hidden lg:table-cell"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 5. SECTION CHAUFFEURS : SUIVI DES JOURS & REGROUPEMENT PAR VOITURE (MISSION 2 - Exigence 2) */}
          {(activeReportTab === 'drivers' || activeReportTab === 'all') && (
            <div 
              id="panel-drivers" 
              role="tabpanel" 
              aria-labelledby="tab-drivers"
              className="space-y-2.5 pt-1"
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                  <span>Suivi des Jours par Chauffeur ({reports.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Regroupé par véhicule conduit
                </span>
              </div>

              {reports.length === 0 ? (
                <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-6 text-center space-y-1.5">
                  <User className="w-7 h-7 text-slate-600 mx-auto" aria-hidden="true" />
                  <p className="text-xs font-semibold text-slate-300">Aucun chauffeur trouvé pour cette période</p>
                  <p className="text-[11px] text-slate-500">
                    Modifiez la sélection de dates ou le filtre chauffeur.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reports.map((driver) => (
                    <article
                      key={driver.chauffeurNom}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-3.5 space-y-2.5 hover:border-slate-700 transition-all shadow-sm"
                    >
                      {/* Entête Chauffeur */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0 font-black text-xs">
                            {driver.chauffeurNom.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-white text-sm leading-tight">
                              {driver.chauffeurNom}
                            </h4>
                            {driver.chauffeurTel && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" aria-hidden="true" />
                                <a 
                                  href={`tel:${driver.chauffeurIndicatif || ''}${driver.chauffeurTel}`}
                                  className="text-[11px] font-mono text-cyan-400 hover:underline"
                                >
                                  {driver.chauffeurIndicatif} {driver.chauffeurTel}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Totaux Chauffeur */}
                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                          <div className="px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-800/60 flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-cyan-400">Total :</span>
                            <span className="font-mono font-black text-white text-xs">
                              {driver.totalJours} Jour{driver.totalJours > 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-800/60 flex items-center gap-1.5">
                            <Fuel className="w-3 h-3 text-amber-400" aria-hidden="true" />
                            <span className="text-[10px] uppercase font-bold text-amber-400">Carburant :</span>
                            <span className="font-mono font-black text-amber-300 text-xs">
                              {driver.totalCarburantDT} DT
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* MISSION 2 (Exigence 2) : Affichage synthétique épuré par véhicule
                          Exemple : Chauffeur : [Nom] | Mercedes : 5 Jours | BMW : 3 Jours */}
                      <div className="bg-slate-950/90 rounded-xl p-2 sm:p-2.5 border border-slate-800/80 space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                          <span>Synthèse des véhicules conduits :</span>
                        </div>

                        {/* Format épuré demandé avec badges distincts */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-bold text-white">
                            Chauffeur : <span className="text-cyan-300">{driver.chauffeurNom}</span>
                          </span>
                          <span className="text-slate-600 font-bold hidden sm:inline">|</span>

                          {driver.vehicules.map((v) => (
                            <div 
                              key={v.labelComplet}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-xs text-slate-200"
                            >
                              <strong className="text-slate-100">{v.voiture}</strong>
                              {v.matricule && (
                                <span className="text-[10px] text-amber-400/90 font-mono">[{v.matricule}]</span>
                              )}
                              <span>:</span>
                              <span className="font-mono font-bold text-cyan-300">{v.jours} Jour{v.jours > 1 ? 's' : ''}</span>
                              <span className="text-[10px] text-amber-400 font-mono font-medium">({v.carburantDT} DT)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pied de page du Modal (UI Mobile & Responsive : liste verticale sur mobile / horizontale sur PC) */}
        <footer className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-slate-900/95 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-400 truncate text-center sm:text-left">
            Total : <strong className="text-white">{stats.totalVehiculesDistincts}</strong> véh. · <strong className="text-cyan-300 font-mono">{stats.totalJoursFlotte}</strong> j · <strong className="text-amber-300 font-mono">{stats.consommationEnergieTotaleFlotteDT} DT</strong> carb.
          </div>

          {/* Sur mobile et tablette : boutons d'action en liste verticale propre */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            {/* Bouton Télécharger Rapport PDF */}
            <button
              type="button"
              onClick={handleExportReportPDF}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 touch-manipulation min-h-[40px] sm:min-h-0"
              aria-label="Télécharger le rapport au format PDF"
            >
              <FileDown className="w-4 h-4" aria-hidden="true" />
              <span>Télécharger Rapport PDF</span>
            </button>

            {/* Bouton Plein Écran Mobile */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex sm:hidden items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer touch-manipulation min-h-[40px]"
              aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                  <span>Réduire la fenêtre</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                  <span>Mode Plein Écran</span>
                </>
              )}
            </button>

            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors cursor-pointer touch-manipulation min-h-[40px] sm:min-h-0"
              aria-label="Fermer le rapport"
            >
              Fermer
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
