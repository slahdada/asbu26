import React, { useState, useMemo } from 'react';
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
  Sparkles,
  Phone,
  BarChart3,
  Layers,
  ChevronDown,
  Zap,
  ArrowUpDown,
  TrendingUp,
  Clock
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RideEntry, DriverReport, VehicleFleetReport, ReportFilterOptions } from '../types';
import { 
  generateDriversReport, 
  getUniqueDriversList, 
  formatDateToYYYYMMDD,
  formatDateDisplayFR,
  calculateInclusiveDays
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
  // Preset or custom number of days. Default: 30 days
  const [nombreDeJours, setNombreDeJours] = useState<number | null>(30);
  const [customDaysInput, setCustomDaysInput] = useState<string>('30');
  
  // Onglet actif : Synthèse par Voiture (Jours & Énergie) vs Rapport par Chauffeur vs Vue Complète
  const [activeReportTab, setActiveReportTab] = useState<'vehicles' | 'drivers' | 'all'>('vehicles');

  // Tri pour la liste des véhicules
  const [vehicleSortBy, setVehicleSortBy] = useState<'days' | 'energy' | 'name'>('days');

  // Date de référence (par défaut aujourd'hui)
  const [dateReference, setDateReference] = useState<string>(() => {
    return formatDateToYYYYMMDD(new Date());
  });

  // Filtre chauffeur spécifique ('all' ou nom du chauffeur)
  const [chauffeurFiltre, setChauffeurFiltre] = useState<string>('all');

  // Recherche textuelle interne au rapport
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Liste de tous les chauffeurs disponibles
  const availableDrivers = useMemo(() => {
    return getUniqueDriversList(entries);
  }, [entries]);

  // Options de filtre
  const filterOptions: ReportFilterOptions = useMemo(() => ({
    nombreDeJours,
    dateReference,
    chauffeurFiltre,
    searchQuery
  }), [nombreDeJours, dateReference, chauffeurFiltre, searchQuery]);

  // Calcul du rapport en temps réel (Chauffeurs + Voitures + Statistiques globales)
  const { reports, vehicleReports, stats } = useMemo(() => {
    return generateDriversReport(entries, filterOptions);
  }, [entries, filterOptions]);

  // Liste triée des véhicules
  const sortedVehicleReports = useMemo(() => {
    return [...vehicleReports].sort((a, b) => {
      if (vehicleSortBy === 'days') return b.totalJours - a.totalJours;
      if (vehicleSortBy === 'energy') return b.consommationEnergieTotaleDT - a.consommationEnergieTotaleDT;
      return a.labelComplet.localeCompare(b.labelComplet, 'fr');
    });
  }, [vehicleReports, vehicleSortBy]);

  // Handlers pour les presets de jours
  const handlePresetDays = (days: number | null) => {
    setNombreDeJours(days);
    if (days !== null) {
      setCustomDaysInput(String(days));
    } else {
      setCustomDaysInput('');
    }
  };

  const handleCustomDaysChange = (val: string) => {
    setCustomDaysInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setNombreDeJours(parsed);
    } else if (val.trim() === '') {
      setNombreDeJours(null);
    }
  };

  // Export PDF haute qualité du Rapport Flotte, Voitures & Chauffeurs
  const handleExportReportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Couleurs & En-tête officiel
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 32, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT DE GESTION DE FLOTTE & CONSOMMATION ÉNERGIE', 14, 14);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Période filtrée : ${stats.periodeTexte}`, 14, 21);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · Calcul inclusif des jours`, 14, 27);

      // Résumé global KPI
      let currentY = 38;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, currentY, 182, 18, 2, 2, 'FD');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);

      doc.text(`Véhicules : ${stats.totalVehiculesDistincts}`, 18, currentY + 11);
      doc.text(`Total Jours Flotte : ${stats.totalJoursFlotte} Jours`, 58, currentY + 11);
      doc.text(`Consommation Énergie : ${stats.consommationEnergieTotaleFlotteDT} DT`, 112, currentY + 11);
      doc.text(`Chauffeurs : ${stats.totalChauffeurs}`, 168, currentY + 11);

      currentY += 24;

      // 1. SECTION PDF : TABLEAU SYNTHÈSE PAR VOITURE (Nombre de Jours & Consommation Énergie Totale)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(14, 116, 144);
      doc.text('1. SYNTHÈSE PAR VOITURE (JOURS & CONSOMMATION ÉNERGIE TOTALE)', 14, currentY);
      currentY += 4;

      const vehicleRows = vehicleReports.map((v, index) => [
        (index + 1).toString(),
        v.labelComplet,
        `${v.totalJours} Jour${v.totalJours > 1 ? 's' : ''}`,
        `${v.consommationEnergieTotaleDT} DT`,
        v.totalCourses.toString(),
        v.chauffeurs.join(', ') || '—'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['N°', 'Véhicule & Matricule', 'Nombre Total de Jours', 'Consommation Énergie (DT)', 'Courses', 'Chauffeur(s)']],
        body: vehicleRows,
        theme: 'striped',
        headStyles: {
          fillColor: [14, 116, 144], // cyan-700
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          valign: 'middle',
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 50, fontStyle: 'bold' },
          2: { cellWidth: 38, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 42, halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 36 }
        },
        foot: [[
          'TOTAL',
          `${stats.totalVehiculesDistincts} véhicule(s)`,
          `${stats.totalJoursFlotte} Jours`,
          `${stats.consommationEnergieTotaleFlotteDT} DT`,
          `${stats.totalCourses}`,
          ''
        ]],
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8.5
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // 2. SECTION PDF : TABLEAU DÉTAILLÉ PAR CHAUFFEUR
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('2. RÉPARTITION DÉTAILLÉE PAR CHAUFFEUR', 14, currentY);
      currentY += 4;

      const driverRows: any[] = [];
      for (const rep of reports) {
        const vehiculesText = rep.vehicules
          .map((v) => `${v.labelComplet} : ${v.jours} Jour${v.jours > 1 ? 's' : ''}`)
          .join('\n');

        const carburantParVehiculeText = rep.vehicules
          .map((v) => `${v.labelComplet} : ${v.carburantDT} DT`)
          .join('\n');

        driverRows.push([
          rep.chauffeurNom + (rep.chauffeurTel ? `\nTel: ${rep.chauffeurIndicatif || ''} ${rep.chauffeurTel}` : ''),
          vehiculesText || 'Aucun véhicule',
          carburantParVehiculeText || '0 DT',
          `${rep.totalJours} Jour${rep.totalJours > 1 ? 's' : ''}`,
          `${rep.totalCarburantDT} DT`
        ]);
      }

      autoTable(doc, {
        startY: currentY,
        head: [['Chauffeur', 'Véhicules & Jours (Inclusif)', 'Carburant par Véhicule (DT)', 'Total Jours', 'Total Carburant']],
        body: driverRows,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59], // slate-800
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5
        },
        styles: {
          fontSize: 8,
          cellPadding: 3.5,
          valign: 'middle',
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { cellWidth: 42, fontStyle: 'bold' },
          1: { cellWidth: 55 },
          2: { cellWidth: 40 },
          3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 23, halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] }
        },
        foot: [[
          'TOTAL GLOBAL',
          `${stats.totalVehiculesDistincts} véhicule(s)`,
          '',
          `${stats.totalJoursTousChauffeurs} Jours`,
          `${stats.totalCarburantTousChauffeursDT} DT`
        ]],
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8.5
        }
      });

      // Téléchargement du fichier
      const safePeriode = nombreDeJours ? `${nombreDeJours}_jours` : 'complet';
      doc.save(`Rapport_Flotte_Energie_${safePeriode}_${dateReference}.pdf`);
    } catch (err) {
      console.error('Erreur export PDF rapport:', err);
    }
  };

  // Impression
  const handlePrintReport = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div 
      id="report-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        id="report-modal-content"
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-slide-up text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <header className="px-5 py-4 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-950/50 text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Rapport Flotte & Consommation Énergie
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono text-[10px] font-bold">
                  Calcul Inclusif
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Période : <strong className="text-slate-200">{stats.periodeTexte}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReportPDF}
              className="hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-800/60 hover:bg-cyan-900 text-cyan-300 text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation"
              title="Télécharger le rapport au format PDF"
            >
              <FileDown className="w-4 h-4" />
              <span>PDF</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation"
              title="Imprimer ce rapport"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* 1. SECTION FILTRES DYNAMIQUES */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                <Filter className="w-4 h-4" />
                <span>Filtre par Nombre de Jours & Chauffeur</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Mise à jour instantanée sans rechargement
              </span>
            </div>

            {/* Presets du Nombre de Jours */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1 text-xs">
                <span className="font-semibold text-slate-300">Période (Nombre de jours) :</span>
                {nombreDeJours !== null && (
                  <span className="font-mono text-cyan-300 text-[11px] font-bold">
                    Derniers {nombreDeJours} jour{nombreDeJours > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Segmented Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[7, 15, 30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handlePresetDays(days)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation ${
                      nombreDeJours === days
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40 border border-cyan-500'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {days} Jours
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handlePresetDays(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation ${
                    nombreDeJours === null
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40 border border-cyan-500'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  Tout l'historique
                </button>

                {/* Champ de saisie numérique directe */}
                <div className="inline-flex items-center gap-1.5 ml-auto">
                  <span className="text-xs text-slate-400">Autre :</span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={customDaysInput}
                      onChange={(e) => handleCustomDaysChange(e.target.value)}
                      placeholder="Ex. 14"
                      className="w-20 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono font-bold focus:outline-none focus:border-cyan-500 pr-7 text-right"
                    />
                    <span className="absolute right-2 text-[10px] text-slate-500 font-bold select-none">
                      j
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Date de référence & Filtre par Chauffeur */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {/* Date de Référence */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-400 flex items-center justify-between">
                  <span>Date de référence</span>
                  <button
                    type="button"
                    onClick={() => setDateReference(formatDateToYYYYMMDD(new Date()))}
                    className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                  >
                    Aujourd'hui
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateReference}
                    onChange={(e) => setDateReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Sélection du Chauffeur */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-400">
                  Chauffeur
                </label>
                <select
                  value={chauffeurFiltre}
                  onChange={(e) => setChauffeurFiltre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">Tous les chauffeurs ({availableDrivers.length})</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver} value={driver}>
                      {driver}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recherche rapide */}
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-medium text-slate-400">
                  Recherche instantanée
                </label>
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer voiture, chauffeur..."
                    className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 p-1 text-slate-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 2. SÉLECTEUR D'ONGLETS DU RAPPORT */}
          <div className="flex items-center gap-2 border-b border-slate-800/90 pb-1">
            <button
              type="button"
              onClick={() => setActiveReportTab('vehicles')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer touch-manipulation ${
                activeReportTab === 'vehicles'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/40 border border-cyan-500'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Synthèse par Voiture (Jours & Énergie)</span>
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-mono font-black border border-cyan-800/80">
                {vehicleReports.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveReportTab('drivers')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer touch-manipulation ${
                activeReportTab === 'drivers'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/40 border border-cyan-500'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Rapport par Chauffeur</span>
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-mono font-black border border-cyan-800/80">
                {reports.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveReportTab('all')}
              className={`hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer touch-manipulation ${
                activeReportTab === 'all'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/40 border border-cyan-500'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Vue Complète (Voitures + Chauffeurs)</span>
            </button>
          </div>

          {/* 3. RÈGLES DE CALCUL ENCADRÉES (RAPPEL TRANSPARENT) */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px] uppercase tracking-wider">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Règles de gestion appliquées :</span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-400 pt-0.5">
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold">1.</span>
                <span><strong>Durée inclusive :</strong> Le 1er au 2 compte pour exactement <strong>2 jours</strong> (inclusif).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold">2.</span>
                <span><strong>Jours par véhicule :</strong> Addition cumulée de tous les jours passés pour chaque voiture.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold">3.</span>
                <span><strong>Consommation d'énergie :</strong> Total en Dinars Tunisiens (DT) par véhicule et global flotte.</span>
              </li>
            </ul>
          </div>

          {/* 4. SYNTHÈSE GLOBALE KPI DE LA FLOTTE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Véhicules Mobilisés</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">{stats.totalVehiculesDistincts}</span>
                <span className="text-xs text-slate-400">voiture{stats.totalVehiculesDistincts > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-1">Total Jours Flotte</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">{stats.totalJoursFlotte}</span>
                <span className="text-xs text-cyan-400/80">Jours</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Consommation Énergie Totale</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono">{stats.consommationEnergieTotaleFlotteDT}</span>
                <span className="text-xs text-amber-400/80">DT</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Chauffeurs Actifs</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-white">{stats.totalChauffeurs}</span>
                <span className="text-xs text-slate-400">personne{stats.totalChauffeurs > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* 5. SECTION VOITURES : NOMBRE DE JOURS & CONSOMMATION ÉNERGIE TOTALE */}
          {(activeReportTab === 'vehicles' || activeReportTab === 'all') && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-cyan-400" />
                    <span>Synthèse par Voiture : Nombre de Jours & Consommation Énergie Totale</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Totalisation des jours passés en mission et de la consommation d'énergie (carburant en DT) pour chaque véhicule
                  </p>
                </div>

                {/* Tri des véhicules */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                  <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    Trier :
                  </span>
                  <button
                    type="button"
                    onClick={() => setVehicleSortBy('days')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      vehicleSortBy === 'days'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    Par Jours
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleSortBy('energy')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      vehicleSortBy === 'energy'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    Par Énergie (DT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleSortBy('name')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      vehicleSortBy === 'name'
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    Nom A-Z
                  </button>
                </div>
              </div>

              {sortedVehicleReports.length === 0 ? (
                <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <Car className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Aucun véhicule trouvé pour cette période</p>
                  <p className="text-xs text-slate-500">
                    Modifiez la période ou le filtre de recherche pour voir les données.
                  </p>
                </div>
              ) : (
                <>
                  {/* Grille de cartes détaillées par Voiture */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {sortedVehicleReports.map((v) => {
                      const energyShare = stats.consommationEnergieTotaleFlotteDT > 0
                        ? Math.round((v.consommationEnergieTotaleDT / stats.consommationEnergieTotaleFlotteDT) * 100)
                        : 0;

                      const daysShare = stats.totalJoursFlotte > 0
                        ? Math.round((v.totalJours / stats.totalJoursFlotte) * 100)
                        : 0;

                      const avgPerDay = v.totalJours > 0
                        ? (v.consommationEnergieTotaleDT / v.totalJours).toFixed(1)
                        : '0';

                      return (
                        <article
                          key={v.labelComplet}
                          className="bg-slate-900/90 border border-slate-800/90 hover:border-cyan-500/50 rounded-2xl p-4 sm:p-5 transition-all shadow-lg flex flex-col justify-between"
                        >
                          {/* En-tête de la voiture */}
                          <div>
                            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-bold">
                                  <Car className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="font-black text-white text-base leading-tight">
                                    {v.voiture}
                                  </h4>
                                  {v.matricule ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black text-amber-300 border border-slate-800 font-mono font-bold text-[11px] mt-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                                      {v.matricule}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic block mt-0.5">
                                      Sans matricule
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-semibold">
                                {v.totalCourses} course{v.totalCourses > 1 ? 's' : ''}
                              </span>
                            </div>

                            {/* 2 Chiffres Clés : Nombre de Jours & Consommation Énergie Totale */}
                            <div className="grid grid-cols-2 gap-2.5 py-3">
                              {/* 1. Nombre de Jours */}
                              <div className="bg-slate-950/80 border border-cyan-900/50 rounded-xl p-3 flex flex-col justify-between">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                                  <Calendar className="w-3 h-3" />
                                  <span>Nombre de Jours</span>
                                </div>
                                <div className="mt-1.5">
                                  <div className="text-xl font-black text-cyan-300 font-mono">
                                    {v.totalJours} <span className="text-xs font-sans text-cyan-400 font-normal">Jour{v.totalJours > 1 ? 's' : ''}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                                    {daysShare}% des jours flotte
                                  </span>
                                </div>
                              </div>

                              {/* 2. Consommation Énergie Totale */}
                              <div className="bg-slate-950/80 border border-amber-900/50 rounded-xl p-3 flex flex-col justify-between">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                  <Fuel className="w-3 h-3" />
                                  <span>Énergie Totale</span>
                                </div>
                                <div className="mt-1.5">
                                  <div className="text-xl font-black text-amber-300 font-mono">
                                    {v.consommationEnergieTotaleDT} <span className="text-xs font-sans text-amber-400 font-normal">DT</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                                    {avgPerDay} DT / jour
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Jauge de part d'énergie consommée */}
                            <div className="space-y-1.5 py-1.5 text-xs">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Part de la consommation totale :</span>
                                <span className="font-mono font-bold text-amber-300">{energyShare}%</span>
                              </div>
                              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                <div 
                                  className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min(100, Math.max(4, energyShare))}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Chauffeurs ayant utilisé ce véhicule */}
                          <div className="pt-3 mt-1 border-t border-slate-800/80 text-xs flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-slate-400 text-[11px] flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-500" />
                              Chauffeur(s) :
                            </span>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {v.chauffeurs.length > 0 ? (
                                v.chauffeurs.map((ch) => (
                                  <span key={ch} className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-[11px] font-semibold">
                                    {ch}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500 text-[11px]">Non spécifié</span>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {/* Tableau Récapitulatif Exhaustif par Voiture */}
                  <div className="mt-4 bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Tableau de Synthèse : Nombre de Jours & Consommation d'Énergie Totale
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {sortedVehicleReports.length} véhicule{sortedVehicleReports.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/60 text-slate-300 border-b border-slate-800 font-bold">
                          <tr>
                            <th className="py-3 px-3.5 w-10 text-center text-slate-500">#</th>
                            <th className="py-3 px-3.5">Véhicule & Matricule</th>
                            <th className="py-3 px-3.5 text-center">Nombre Total de Jours</th>
                            <th className="py-3 px-3.5 text-right">Consommation Énergie Totale</th>
                            <th className="py-3 px-3.5 text-right">Moyenne Journalière</th>
                            <th className="py-3 px-3.5 text-center">Courses</th>
                            <th className="py-3 px-3.5">Chauffeur(s) Assigné(s)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {sortedVehicleReports.map((v, idx) => (
                            <tr key={v.labelComplet} className="hover:bg-slate-900/40 transition-colors">
                              <td className="py-3 px-3.5 text-center text-slate-500 font-mono font-semibold">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3.5 font-bold text-white">
                                <div className="flex items-center gap-2">
                                  <span>{v.voiture}</span>
                                  {v.matricule && (
                                    <span className="px-1.5 py-0.2 rounded bg-black text-amber-300 border border-slate-800 font-mono font-bold text-[10px]">
                                      {v.matricule}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded-lg text-xs">
                                  <Calendar className="w-3 h-3 text-cyan-400" />
                                  {v.totalJours} Jour{v.totalJours > 1 ? 's' : ''}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-right">
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-lg text-xs">
                                  <Fuel className="w-3 h-3 text-amber-400" />
                                  {v.consommationEnergieTotaleDT} DT
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-right font-mono text-slate-300">
                                {v.totalJours > 0 ? `${(v.consommationEnergieTotaleDT / v.totalJours).toFixed(1)} DT/j` : '—'}
                              </td>
                              <td className="py-3 px-3.5 text-center font-mono text-slate-300">
                                {v.totalCourses}
                              </td>
                              <td className="py-3 px-3.5 text-slate-400">
                                {v.chauffeurs.join(', ') || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-900/95 font-bold text-slate-100 border-t-2 border-slate-700">
                          <tr>
                            <td colSpan={2} className="py-3.5 px-3.5 uppercase text-xs text-cyan-400">
                              TOTAL FLOTTE ({stats.totalVehiculesDistincts} Véhicules)
                            </td>
                            <td className="py-3.5 px-3.5 text-center font-mono text-cyan-300 text-sm">
                              {stats.totalJoursFlotte} Jours
                            </td>
                            <td className="py-3.5 px-3.5 text-right font-mono text-amber-300 text-sm">
                              {stats.consommationEnergieTotaleFlotteDT} DT
                            </td>
                            <td className="py-3.5 px-3.5 text-right font-mono text-slate-300">
                              {stats.totalJoursFlotte > 0 ? `${(stats.consommationEnergieTotaleFlotteDT / stats.totalJoursFlotte).toFixed(1)} DT/j` : '—'}
                            </td>
                            <td className="py-3.5 px-3.5 text-center font-mono">
                              {stats.totalCourses}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 6. RÉSULTATS DÉTAILLÉS PAR CHAUFFEUR */}
          {(activeReportTab === 'drivers' || activeReportTab === 'all') && (
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>Rapport Détaillé par Chauffeur ({reports.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Classé par total de jours décroissant
                </span>
              </div>

              {reports.length === 0 ? (
                <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <User className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Aucune course trouvée pour cette période</p>
                  <p className="text-xs text-slate-500">
                    Essayez d'augmenter le nombre de jours ou de changer la date de référence.
                  </p>
                  <button
                    type="button"
                    onClick={() => handlePresetDays(null)}
                    className="mt-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Voir tout l'historique
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((driver) => (
                    <article
                      key={driver.chauffeurNom}
                      className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-slate-700 transition-all shadow-md"
                    >
                      {/* Chauffeur Header & Global Stats */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0 font-black text-sm">
                            {driver.chauffeurNom.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-white text-base leading-tight">
                              {driver.chauffeurNom}
                            </h4>
                            {driver.chauffeurTel && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <a 
                                  href={`tel:${driver.chauffeurIndicatif || ''}${driver.chauffeurTel}`}
                                  className="text-xs font-mono text-cyan-400 hover:underline"
                                >
                                  {driver.chauffeurIndicatif} {driver.chauffeurTel}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Totaux du chauffeur (Jours cumulés & Carburant global) */}
                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                          {/* Total Jours Chauffeur */}
                          <div className="px-3 py-1.5 rounded-xl bg-cyan-950/70 border border-cyan-800/60 flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-cyan-400">Total :</span>
                            <span className="font-mono font-black text-white text-sm">
                              {driver.totalJours} Jour{driver.totalJours > 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Somme Globale Carburant Chauffeur (RÈGLE 3) */}
                          <div className="px-3 py-1.5 rounded-xl bg-amber-950/70 border border-amber-800/60 flex items-center gap-2">
                            <Fuel className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[10px] uppercase font-bold text-amber-400">Carburant Global :</span>
                            <span className="font-mono font-black text-amber-300 text-sm">
                              {driver.totalCarburantDT} DT
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Regroupement simplifié par véhicule (RÈGLE 2 & RÈGLE 3) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-sky-400" />
                            <span>Véhicules utilisés & Total des jours passés :</span>
                          </span>
                          <span>{driver.vehicules.length} véhicule{driver.vehicules.length > 1 ? 's' : ''} conduit{driver.vehicules.length > 1 ? 's' : ''}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {driver.vehicules.map((vehicule) => (
                            <div
                              key={vehicule.labelComplet}
                              className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                                  <Car className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-100 text-sm block truncate">
                                    {vehicule.voiture}
                                  </span>
                                  {vehicule.matricule ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-black text-amber-300 border border-slate-800 font-mono font-bold text-[10px] mt-0.5">
                                      <span className="w-1 h-1 rounded-full bg-red-600"></span>
                                      {vehicule.matricule}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic block mt-0.5">
                                      Sans matricule
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Rendu attendu : "Mercedes : 5 Jours" + Carburant DT */}
                              <div className="text-right shrink-0">
                                <div className="font-mono font-black text-cyan-300 text-sm">
                                  {vehicule.jours} Jour{vehicule.jours > 1 ? 's' : ''}
                                </div>
                                <div className="text-xs font-mono font-semibold text-amber-400 flex items-center justify-end gap-1 mt-0.5">
                                  <Fuel className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>{vehicule.carburantDT} DT</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Résumé textuel synthétique */}
                        <div className="bg-slate-950/40 rounded-xl px-3 py-2 border border-slate-800/40 text-xs flex flex-wrap items-center gap-2">
                          <span className="text-slate-400 font-medium">Synthèse directe :</span>
                          {driver.vehicules.map((v, i) => (
                            <React.Fragment key={v.labelComplet}>
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-200">
                                <strong className="text-white">{v.voiture}</strong> : <span className="text-cyan-300 font-mono font-bold">{v.jours} Jour{v.jours > 1 ? 's' : ''}</span>
                                <span className="text-[11px] text-amber-400 font-mono">({v.carburantDT} DT)</span>
                              </span>
                              {i < driver.vehicules.length - 1 && (
                                <span className="text-slate-600 font-bold">·</span>
                              )}
                            </React.Fragment>
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

        {/* Modal Footer */}
        <footer className="px-5 py-3.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          <div className="text-xs text-slate-400">
            Total Flotte : <strong className="text-white">{stats.totalVehiculesDistincts}</strong> véhicules · <strong className="text-cyan-300 font-mono">{stats.totalJoursFlotte}</strong> jours · <strong className="text-amber-300 font-mono">{stats.consommationEnergieTotaleFlotteDT} DT</strong> énergie
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReportPDF}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 touch-manipulation"
            >
              <FileDown className="w-4 h-4" />
              <span>Télécharger Rapport PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
