import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Phone, 
  MessageSquare, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Trash,
  X, 
  Download, 
  Wifi, 
  WifiOff, 
  Check, 
  AlertCircle, 
  Home, 
  Car, 
  User, 
  Users, 
  FileText,
  ChevronRight,
  Info,
  Printer,
  FileSpreadsheet,
  FileDown,
  Upload,
  Calendar,
  LayoutList,
  LayoutGrid,
  Share2,
  Copy,
  ExternalLink,
  Clock,
  Eye,
  Sun,
  Moon,
  Fuel,
  BarChart3,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronDown,
  ArrowUpDown,
  ArrowDownToLine
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RideEntry, FuelRecord } from './types';
import { ReportModal } from './components/ReportModal';
import { generateDriversReport, formatDateToYYYYMMDD } from './utils/reportUtils';
import { motion, AnimatePresence } from 'framer-motion';

// Pre-seeded high quality illustrative data for Tunisian context
const SEED_DATA: RideEntry[] = [
  {
    id: 'seed-1',
    voiture: 'Nissan X-Trail',
    matricule: '215 TU 890',
    chauffeurNom: 'Mohamed Ali',
    chauffeurIndicatif: '+216',
    chauffeurTel: '22123456',
    clientNom: 'Ahmed Ben Amor',
    clientIndicatif: '+216',
    clientTel: '98654321',
    dateDepart: '2026-09-20',
    dateRetour: '2026-09-22',
    carburant: 80,
    dateCarburant: '20/09/2026 à 08:15',
    carburantHistorique: [
      { id: 'f-1', montant: 80, date: '20/09/2026 à 08:15', note: 'Plein départ Tunis' }
    ],
    notes: 'Départ à 08:00 de l\'Aéroport Tunis-Carthage',
    createdAt: Date.now() - 3600000 * 3
  },
  {
    id: 'seed-2',
    voiture: 'MG ZS',
    matricule: '1432 TU 674',
    chauffeurNom: 'Slah Dada',
    chauffeurIndicatif: '+216',
    chauffeurTel: '55876543',
    clientNom: 'Rim Trabelsi',
    clientIndicatif: '+216',
    clientTel: '97112233',
    dateDepart: '2026-09-21',
    dateRetour: '2026-09-21',
    carburant: 50,
    dateCarburant: '21/09/2026 à 09:30',
    carburantHistorique: [
      { id: 'f-2', montant: 50, date: '21/09/2026 à 09:30', note: 'Station Shell Ennasr' }
    ],
    notes: 'Course urgente vers Sousse, retour prévu à 18:00',
    createdAt: Date.now() - 3600000 * 2
  },
  {
    id: 'seed-3',
    voiture: 'Chery Tiggo 7 Pro',
    matricule: '228 TU 123',
    chauffeurNom: 'Yassine Gharbi',
    chauffeurIndicatif: '+216',
    chauffeurTel: '94223344',
    clientNom: 'Mourad Zaier',
    clientIndicatif: '+33',
    clientTel: '612345678',
    dateDepart: '2026-09-25',
    dateRetour: '2026-09-30',
    carburant: 100,
    dateCarburant: '24/09/2026 à 11:00',
    carburantHistorique: [
      { id: 'f-3', montant: 100, date: '24/09/2026 à 11:00', note: 'Plein total pré-mission' }
    ],
    notes: 'Client venant de Paris - Paiement à la livraison de la voiture',
    createdAt: Date.now() - 3600000 * 1
  },
  {
    id: 'seed-4',
    voiture: 'Mercedes Classe C',
    matricule: '198 TU 456',
    chauffeurNom: 'Mohamed Ali',
    chauffeurIndicatif: '+216',
    chauffeurTel: '22123456',
    clientNom: 'Karim Mansour',
    clientIndicatif: '+216',
    clientTel: '98456123',
    dateDepart: '2026-09-12',
    dateRetour: '2026-09-16',
    carburant: 120,
    dateCarburant: '12/09/2026 à 07:45',
    carburantHistorique: [
      { id: 'f-4', montant: 120, date: '12/09/2026 à 07:45', note: 'Plein départ Agil' }
    ],
    notes: 'Mission VIP délégation d\'affaires - Retour à Tunis',
    createdAt: Date.now() - 3600000 * 4
  }
];

// Country calling codes with flags and standard descriptions
export const COUNTRY_CODES = [
  { code: '+216', label: 'Tunisie', flag: '🇹🇳' },
  { code: '+213', label: 'Algérie', flag: '🇩🇿' },
  { code: '+212', label: 'Maroc', flag: '🇲🇦' },
  { code: '+218', label: 'Libye', flag: '🇱🇾' },
  { code: '+33', label: 'France', flag: '🇫🇷' },
  { code: '+39', label: 'Italie', flag: '🇮🇹' },
  { code: '+49', label: 'Allemagne', flag: '🇩🇪' },
  { code: '+32', label: 'Belgique', flag: '🇧🇪' },
  { code: '+41', label: 'Suisse', flag: '🇨🇭' },
  { code: '+44', label: 'Royaume-Uni', flag: '🇬🇧' },
  { code: '+1', label: 'USA / Canada', flag: '🇺🇸' },
  { code: '+971', label: 'Émirats', flag: '🇦🇪' },
  { code: '+966', label: 'Arabie Saoudite', flag: '🇸🇦' },
  { code: '+974', label: 'Qatar', flag: '🇶🇦' },
  { code: '+90', label: 'Turquie', flag: '🇹🇷' },
  { code: 'custom', label: 'Autre indicatif...', flag: '🌐' },
];

// Real-world Tunisian car rental market brands and models (Agences de location à Tunis et en Tunisie)
const DEFAULT_CAR_SUGGESTIONS = [
  { 
    brand: 'Peugeot', 
    models: ['208', '208 BVA', '301', '2008', '3008', '408', 'Partner', 'Rifter', 'Traveller'] 
  },
  { 
    brand: 'Renault', 
    models: ['Symbol', 'Clio 4', 'Clio 5', 'Clio 5 BVA', 'Megane Sedan', 'Megane 4', 'Express', 'Kadjar', 'Austral', 'Kangoo', 'Trafic (9 places)'] 
  },
  { 
    brand: 'Citroën', 
    models: ['C-Elysée', 'C3', 'C3 BVA', 'C3 Aircross', 'C4', 'C4 X', 'Berlingo', 'Jumpy / SpaceTourer'] 
  },
  { 
    brand: 'Hyundai', 
    models: ['Grand i10', 'Grand i10 Sedan', 'i10', 'i20', 'Accent', 'Elantra', 'Creta', 'Tucson', 'Santa Fe', 'H-1 / Staria'] 
  },
  { 
    brand: 'Kia', 
    models: ['Picanto', 'Picanto BVA', 'Rio', 'Rio Sedan', 'Pegas', 'Sonet', 'Seltos', 'Sportage', 'Sorento', 'Carnival'] 
  },
  { 
    brand: 'Volkswagen', 
    models: ['Polo', 'Polo Sedan', 'Golf 7', 'Golf 8', 'T-Roc', 'T-Cross', 'Tiguan', 'Passat', 'Caddy', 'Transporter / Caravelle'] 
  },
  { 
    brand: 'Fiat', 
    models: ['Tipo Sedan', 'Tipo Hatchback', 'Grande Punto', 'Panda', '500', 'Fiorino', 'Doblo', 'Ducato'] 
  },
  { 
    brand: 'Dacia', 
    models: ['Sandero', 'Sandero Stepway', 'Logan', 'Duster', 'Duster 4x4', 'Dokker', 'Jogger (7 places)'] 
  },
  { 
    brand: 'Toyota', 
    models: ['Yaris', 'Yaris Sedan', 'Corolla', 'Corolla Prestige', 'C-HR', 'RAV4', 'Hilux (Double Cabine)', 'Hiace (Minibus)', 'Land Cruiser / Prado'] 
  },
  { 
    brand: 'Seat', 
    models: ['Ibiza', 'Arona', 'Leon', 'Ateca', 'Tarraco'] 
  },
  { 
    brand: 'Skoda', 
    models: ['Fabia', 'Scala', 'Octavia', 'Kamiq', 'Karoq', 'Kodiaq (7 places)'] 
  },
  { 
    brand: 'Suzuki', 
    models: ['Swift', 'Swift BVA', 'Dzire', 'Celerio', 'Baleno', 'Vitara', 'Jimny'] 
  },
  { 
    brand: 'MG (Morris Garages)', 
    models: ['MG3', 'MG5', 'MG ZS', 'MG HS', 'MG One', 'MG 4'] 
  },
  { 
    brand: 'Chery', 
    models: ['Tiggo 1X', 'Tiggo 2', 'Tiggo 3', 'Tiggo 4 Pro', 'Tiggo 7 Pro', 'Tiggo 8 Pro', 'Arrizo 5', 'QQ'] 
  },
  { 
    brand: 'Geely', 
    models: ['GX3 Pro', 'Coolray', 'Emgrand', 'Azkarra', 'Starray'] 
  },
  { 
    brand: 'Nissan', 
    models: ['Micra', 'Sunny', 'Juke', 'Qashqai', 'X-Trail', 'Navara'] 
  },
  { 
    brand: 'Mahindra', 
    models: ['KUV100', 'XUV300', 'Scorpio', 'Pik Up (Double Cabine)'] 
  },
  { 
    brand: 'Haval', 
    models: ['Jolion', 'H6', 'Poer / Wingle'] 
  },
  { 
    brand: 'Ford', 
    models: ['Fiesta', 'Focus', 'EcoSport', 'Kuga', 'Ranger', 'Transit'] 
  },
  { 
    brand: 'Opel', 
    models: ['Corsa', 'Astra', 'Crossland', 'Grandland', 'Combo'] 
  },
  { 
    brand: 'DFSK', 
    models: ['Glory 580 (7 places)', 'Glory 500', 'K01H / K02'] 
  },
  { 
    brand: 'Mercedes-Benz', 
    models: ['Classe A', 'Classe C', 'Classe E', 'GLA', 'GLC', 'GLE', 'Vito (Van)', 'Classe V (VIP)'] 
  },
  { 
    brand: 'BMW', 
    models: ['Série 1', 'Série 3', 'Série 5', 'X1', 'X3', 'X5'] 
  },
  { 
    brand: 'Audi', 
    models: ['A3 Berline', 'A4', 'A6', 'Q3', 'Q5', 'Q7'] 
  },
];

/**
 * Normalise un nom de marque pour l'affichage cohérent et les filtres
 */
export const normalizeBrandName = (rawBrand: string): string => {
  const b = (rawBrand || '').trim();
  if (/^mg(\b|\s|\()/i.test(b) || /morris\s*garages/i.test(b)) return 'MG';
  if (/^mercedes/i.test(b)) return 'Mercedes-Benz';
  if (/^vw\b/i.test(b) || /^volks/i.test(b)) return 'Volkswagen';
  if (/^citro[eèêë]n/i.test(b)) return 'Citroën';
  return b;
};

/**
 * Détecte intelligemment la marque d'un véhicule à partir de son nom complet
 */
export const extractBrandFromVehicle = (
  voiture: string,
  suggestions: { brand: string; models: string[] }[] = []
): string => {
  if (!voiture || !voiture.trim()) return 'Autre';
  const clean = voiture.trim();
  const lower = clean.toLowerCase();

  // Marques courantes spécifiques
  if (lower.startsWith('mercedes')) return 'Mercedes-Benz';
  if (lower.startsWith('mg ') || lower === 'mg' || lower.startsWith('mg-') || lower.startsWith('morris')) return 'MG';
  if (lower.startsWith('vw ') || lower.startsWith('volkswagen')) return 'Volkswagen';
  if (lower.startsWith('citroen') || lower.startsWith('citroën')) return 'Citroën';

  const candidates: string[] = [];
  if (suggestions && suggestions.length > 0) {
    for (const s of suggestions) {
      if (s.brand && s.brand !== 'Autre / Custom') {
        candidates.push(s.brand);
      }
    }
  }
  for (const d of DEFAULT_CAR_SUGGESTIONS) {
    candidates.push(d.brand);
  }

  // Trier les marques les plus longues en premier pour éviter les conflits de préfixes
  const uniqueCandidates = Array.from(new Set(candidates)).sort((a, b) => b.length - a.length);

  for (const brand of uniqueCandidates) {
    const brandLower = brand.toLowerCase();
    if (lower.startsWith(brandLower)) {
      return normalizeBrandName(brand);
    }
    const cleanKey = brandLower.split(/[\s(]/)[0];
    if (cleanKey.length >= 2 && lower.startsWith(cleanKey)) {
      return normalizeBrandName(brand);
    }
  }

  // Fallback : premier mot du libellé
  const words = clean.split(/[\s\-_]+/);
  if (words.length > 0 && words[0].length >= 2) {
    const first = words[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  }

  return 'Autre';
};

export default function App() {
  // Core states
  const [entries, setEntries] = useState<RideEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState(''); // Filtre par marque de véhicule
  const [brandSortOrder, setBrandSortOrder] = useState<'none' | 'asc' | 'desc'>('none'); // Tri par marque A-Z ou Z-A
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    try {
      return (localStorage.getItem('fleet_view_mode') as 'list' | 'grid') || 'list';
    } catch {
      return 'list';
    }
  });
  const [selectedEntry, setSelectedEntry] = useState<RideEntry | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  // Dynamic car brands and models suggestions
  const [carSuggestions, setCarSuggestions] = useState<{ brand: string; models: string[] }[]>([]);
  const [showCustomFields, setShowCustomFields] = useState(false);

  // Calcul dynamique des marques présentes dans la flotte et des autres marques du catalogue
  const brandsData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      const b = extractBrandFromVehicle(e.voiture, carSuggestions);
      counts[b] = (counts[b] || 0) + 1;
    }

    const fleetBrands = Object.keys(counts)
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
      .map((name) => ({ name, count: counts[name] }));

    const fleetNamesLower = new Set(fleetBrands.map((b) => b.name.toLowerCase()));

    const allCatalog = [
      ...carSuggestions.map((s) => normalizeBrandName(s.brand)),
      ...DEFAULT_CAR_SUGGESTIONS.map((s) => normalizeBrandName(s.brand))
    ];

    const catalogBrands = Array.from(new Set(allCatalog))
      .filter((b) => b && b !== 'Autre / Custom' && !fleetNamesLower.has(b.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

    return { fleetBrands, catalogBrands };
  }, [entries, carSuggestions]);
  const [customBrandInput, setCustomBrandInput] = useState('');
  const [customModelInput, setCustomModelInput] = useState('');

  // Form input states
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null); // null means adding, string means editing
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formCustomVoiture, setFormCustomVoiture] = useState('');
  const [formMatricule, setFormMatricule] = useState(''); // e.g. 1234 TU 258
  const [formChauffeurNom, setFormChauffeurNom] = useState('');
  const [formChauffeurIndicatif, setFormChauffeurIndicatif] = useState('+216');
  const [isChauffeurCustomIndicatif, setIsChauffeurCustomIndicatif] = useState(false);
  const [formChauffeurTel, setFormChauffeurTel] = useState('');
  const [formClientNom, setFormClientNom] = useState('');
  const [formClientIndicatif, setFormClientIndicatif] = useState('+216');
  const [isClientCustomIndicatif, setIsClientCustomIndicatif] = useState(false);
  const [formClientTel, setFormClientTel] = useState('');
  const [formDateDepart, setFormDateDepart] = useState('');
  const [formDateRetour, setFormDateRetour] = useState('');
  const [formCarburant, setFormCarburant] = useState(''); // Montant en Dinars Tunisiens (DT)
  const [formDateCarburant, setFormDateCarburant] = useState(''); // Date et heure automatique
  const [formCarburantHistorique, setFormCarburantHistorique] = useState<FuelRecord[]>([]);
  const [formNotes, setFormNotes] = useState('');

  // Nom du véhicule actuellement composé dans le formulaire
  const currentFormCarName = useMemo(() => {
    if (formBrand === '__custom_brand__') {
      return `${customBrandInput.trim()} ${customModelInput.trim()}`.trim();
    }
    if (formBrand && formModel === '__custom_model__') {
      return `${formBrand} ${customModelInput.trim()}`.trim();
    }
    if (formBrand === 'Autre / Custom' || !formBrand) {
      return formCustomVoiture.trim();
    }
    return `${formBrand} ${formModel}`.trim();
  }, [formBrand, formModel, customBrandInput, customModelInput, formCustomVoiture]);

  // Détection de conflit : Interdit d'attribuer la même immatriculation à deux véhicules différents
  const matriculeConflict = useMemo(() => {
    const cleanMat = formMatricule.trim().toUpperCase().replace(/\s+/g, ' ');
    if (!cleanMat) return null;

    const normCurrent = currentFormCarName.toLowerCase().replace(/\s+/g, ' ');

    const conflict = entries.find((e) => {
      if (currentEntryId && e.id === currentEntryId) return false;
      const entryMat = (e.matricule || '').trim().toUpperCase().replace(/\s+/g, ' ');
      if (!entryMat || entryMat !== cleanMat) return false;

      const normExisting = (e.voiture || '').toLowerCase().replace(/\s+/g, ' ');
      // Est-ce un véhicule différent ?
      return normCurrent ? (normExisting !== normCurrent) : true;
    });

    if (conflict) {
      const normExisting = (conflict.voiture || '').toLowerCase().replace(/\s+/g, ' ');
      const isDifferent = normCurrent ? (normExisting !== normCurrent) : true;
      return {
        matricule: cleanMat,
        existingVoiture: conflict.voiture,
        isDifferentCar: isDifferent
      };
    }
    return null;
  }, [formMatricule, currentFormCarName, entries, currentEntryId]);

  // Matricule déjà enregistré pour ce véhicule dans la flotte
  const knownMatriculeForCurrentCar = useMemo(() => {
    const normCurrent = currentFormCarName.toLowerCase().replace(/\s+/g, ' ');
    if (!normCurrent) return null;

    const match = entries.find((e) => {
      if (currentEntryId && e.id === currentEntryId) return false;
      const normEntry = (e.voiture || '').trim().toLowerCase().replace(/\s+/g, ' ');
      return normEntry === normCurrent && (e.matricule || '').trim();
    });

    return match?.matricule || null;
  }, [currentFormCarName, entries, currentEntryId]);

  // Quick refuel dialog (Ravitaillement rapide)
  const [quickFuelEntry, setQuickFuelEntry] = useState<RideEntry | null>(null);
  const [quickFuelAmount, setQuickFuelAmount] = useState('');
  const [quickFuelNote, setQuickFuelNote] = useState('');

  // UI state feedback
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Theme state (Mode Sombre / Mode Clair)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('fleet_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  // Apply theme class to <html> and <body> and update PWA theme color
  useEffect(() => {
    const root = document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#f8fafc');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      document.body.classList.remove('light');
      document.body.classList.add('dark');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#0f172a');
    }
    try {
      localStorage.setItem('fleet_theme', theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    showToast(nextTheme === 'light' ? 'Mode Clair activé ☀️' : 'Mode Sombre activé 🌙', 'info');
  };
  
  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Fullscreen & Refresh states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(''); // Date de début pour l'export (menu Outils)
  const [exportEndDate, setExportEndDate] = useState(''); // Date de fin pour l'export (menu Outils)

  // References
  const searchInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Fullscreen change listener across all browser engines
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isCurrentlyFullscreen = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Fullscreen toggle function using HTML5 Fullscreen API with mobile Safari/WebKit vendor prefixes
  const toggleFullscreen = async () => {
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;

      const isCurrentlyFullscreen = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
        setIsFullscreen(true);
        showToast('Mode Plein Écran activé 📱', 'info');
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
        setIsFullscreen(false);
        showToast('Mode Plein Écran désactivé', 'info');
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
      showToast('Plein écran non supporté ou bloqué par le navigateur', 'info');
    }
  };

  // Synchronisation et rafraîchissement des données de la flotte
  const handleRefreshSync = () => {
    setIsRefreshing(true);
    try {
      const stored = localStorage.getItem('fleet_manager_rides');
      if (stored) {
        setEntries(JSON.parse(stored));
      } else {
        setEntries(SEED_DATA);
        localStorage.setItem('fleet_manager_rides', JSON.stringify(SEED_DATA));
      }
      showToast('Données synchronisées avec succès ! 🔄', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la synchronisation', 'error');
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  // 1. Initial Load and Save with LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fleet_manager_rides');
      const seedVersion = localStorage.getItem('fleet_seed_version_tn');
      if (stored && seedVersion === '2026_tn_fleet_v2') {
        setEntries(JSON.parse(stored));
      } else {
        // Upgrade / seed with user's specific vehicles (Nissan X-Trail, MG, Chery Tiggo, Mercedes)
        setEntries(SEED_DATA);
        localStorage.setItem('fleet_manager_rides', JSON.stringify(SEED_DATA));
        localStorage.setItem('fleet_seed_version_tn', '2026_tn_fleet_v2');
      }
    } catch (e) {
      console.error('Failed to load rides', e);
      setEntries(SEED_DATA);
    }

    try {
      const storedVersion = localStorage.getItem('fleet_manager_car_suggestions_v');
      const CURRENT_VERSION = '2026_tn_fleet_v1';

      if (storedVersion === CURRENT_VERSION) {
        const storedSuggestions = localStorage.getItem('fleet_manager_car_suggestions');
        if (storedSuggestions) {
          setCarSuggestions(JSON.parse(storedSuggestions));
        } else {
          setCarSuggestions(DEFAULT_CAR_SUGGESTIONS);
        }
      } else {
        // Upgrade / enrich with the new realistic Tunisian rental fleet while preserving user custom additions
        const existingStored = localStorage.getItem('fleet_manager_car_suggestions');
        if (existingStored) {
          try {
            const oldList: { brand: string; models: string[] }[] = JSON.parse(existingStored);
            const merged = DEFAULT_CAR_SUGGESTIONS.map(def => {
              const found = oldList.find(o => o.brand.toLowerCase() === def.brand.toLowerCase());
              if (!found) return def;
              const extraModels = found.models.filter(m => !def.models.some(dm => dm.toLowerCase() === m.toLowerCase()));
              return { brand: def.brand, models: [...def.models, ...extraModels] };
            });
            // Append any custom brands created by user that are not in default
            oldList.forEach(o => {
              if (!merged.some(m => m.brand.toLowerCase() === o.brand.toLowerCase())) {
                merged.push(o);
              }
            });
            setCarSuggestions(merged);
            localStorage.setItem('fleet_manager_car_suggestions', JSON.stringify(merged));
          } catch {
            setCarSuggestions(DEFAULT_CAR_SUGGESTIONS);
            localStorage.setItem('fleet_manager_car_suggestions', JSON.stringify(DEFAULT_CAR_SUGGESTIONS));
          }
        } else {
          setCarSuggestions(DEFAULT_CAR_SUGGESTIONS);
          localStorage.setItem('fleet_manager_car_suggestions', JSON.stringify(DEFAULT_CAR_SUGGESTIONS));
        }
        localStorage.setItem('fleet_manager_car_suggestions_v', CURRENT_VERSION);
      }
    } catch (e) {
      console.error('Failed to load car suggestions', e);
      setCarSuggestions(DEFAULT_CAR_SUGGESTIONS);
    }

    // Network status monitoring
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Connexion rétablie — En ligne', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Mode hors connexion — Données locales utilisées', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Standalone check
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // PWA install trigger catcher
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      showToast('Application installée avec succès !', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Sync to local storage
  const saveEntries = (updated: RideEntry[]) => {
    setEntries(updated);
    localStorage.setItem('fleet_manager_rides', JSON.stringify(updated));
  };

  // 2. Toast feedback engine
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // 3. International Phone cleaner, formatter & deep-linker
  const normalizeIndicatif = (ind?: string): string => {
    if (!ind || !ind.trim()) return '+216';
    let clean = ind.trim();
    if (!clean.startsWith('+')) {
      clean = '+' + clean;
    }
    return clean;
  };

  const cleanPhoneNumber = (num: string, indicatif: string = '+216'): string => {
    let cleaned = num.replace(/[^0-9]/g, '');
    const indDigits = indicatif.replace(/[^0-9]/g, '');
    // If user pasted or typed full international number that starts with the indicatif digits, strip it once
    if (indDigits && cleaned.startsWith(indDigits) && cleaned.length > indDigits.length + 5) {
      cleaned = cleaned.substring(indDigits.length);
    }
    return cleaned;
  };

  const getPhoneCallLink = (rawNum: string, indicatif: string = '+216'): string => {
    const cleanInd = normalizeIndicatif(indicatif);
    const cleanNum = cleanPhoneNumber(rawNum, cleanInd);
    return `tel:${cleanInd}${cleanNum}`;
  };

  const getWhatsAppLink = (rawNum: string, indicatif: string = '+216'): string => {
    const cleanInd = normalizeIndicatif(indicatif);
    const cleanNum = cleanPhoneNumber(rawNum, cleanInd);
    const indDigits = cleanInd.replace(/[^0-9]/g, '');
    return `https://wa.me/${indDigits}${cleanNum}`;
  };

  // For nice display in UI
  const formatFullPhoneDisplay = (rawNum: string, indicatif: string = '+216'): string => {
    if (!rawNum) return '';
    const cleanInd = normalizeIndicatif(indicatif);
    const clean = cleanPhoneNumber(rawNum, cleanInd);
    if (cleanInd === '+216' && clean.length === 8) {
      return `${cleanInd} ${clean.substring(0, 2)} ${clean.substring(2, 5)} ${clean.substring(5)}`;
    }
    return `${cleanInd} ${clean || rawNum}`;
  };

  // Format date display (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDateDisplay = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  // Raccourcis de sélection de période pour l'exportation
  const handlePresetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setExportStartDate(formatDateToYYYYMMDD(firstDay));
    setExportEndDate(formatDateToYYYYMMDD(lastDay));
  };

  const handlePresetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    setExportStartDate(formatDateToYYYYMMDD(firstDay));
    setExportEndDate(formatDateToYYYYMMDD(lastDay));
  };

  const handlePresetLast30Days = () => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 29);
    setExportStartDate(formatDateToYYYYMMDD(past));
    setExportEndDate(formatDateToYYYYMMDD(now));
  };

  const handlePresetLast7Days = () => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 6);
    setExportStartDate(formatDateToYYYYMMDD(past));
    setExportEndDate(formatDateToYYYYMMDD(now));
  };

  // Liste des courses filtrées pour l'export (PDF, CSV, Impression)
  const entriesToExport = useMemo(() => {
    if (!exportStartDate && !exportEndDate) {
      return entries;
    }

    return entries.filter((entry) => {
      let entryStart = entry.dateDepart || entry.dateRetour || '';
      let entryEnd = entry.dateRetour || entry.dateDepart || '';

      if (!entryStart && !entryEnd && entry.createdAt) {
        const createdStr = new Date(entry.createdAt).toISOString().slice(0, 10);
        entryStart = createdStr;
        entryEnd = createdStr;
      }

      if (exportStartDate && entryEnd && entryEnd < exportStartDate) {
        return false;
      }
      if (exportEndDate && entryStart && entryStart > exportEndDate) {
        return false;
      }
      return true;
    });
  }, [entries, exportStartDate, exportEndDate]);

  // Libellé textuel de la période d'exportation
  const exportPeriodLabel = useMemo(() => {
    if (exportStartDate && exportEndDate) {
      return `Période du ${formatDateDisplay(exportStartDate)} au ${formatDateDisplay(exportEndDate)}`;
    }
    if (exportStartDate) {
      return `À partir du ${formatDateDisplay(exportStartDate)}`;
    }
    if (exportEndDate) {
      return `Jusqu'au ${formatDateDisplay(exportEndDate)}`;
    }
    return 'Toutes les dates';
  }, [exportStartDate, exportEndDate]);

  // Helper to generate current automatic localized date and time in Tunisia/French format
  // Format: "DD/MM/YYYY à HH:mm" (e.g. "24/09/2026 à 14:55")
  const getAutomaticCurrentDateTime = (): string => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${dateStr} à ${timeStr}`;
  };

  // Trip duration calculation
  const calculateTripDuration = (depart?: string, retour?: string): string => {
    if (!depart && !retour) return '';
    if (depart && !retour) return 'À partir du départ';
    if (!depart && retour) return "Jusqu'au retour";
    if (depart === retour) return '1 jour (aller-retour)';
    try {
      if (!depart || !retour) return '';
      const d1 = new Date(depart);
      const d2 = new Date(retour);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
      if (diffDays > 1) {
        return `${diffDays} jours`;
      } else if (diffDays === 1) {
        return '1 jour';
      }
    } catch {
      // ignore
    }
    return '';
  };

  // Switch view mode with local storage persistence
  const handleViewModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem('fleet_view_mode', mode);
      showToast(mode === 'list' ? 'Mode Tableau Sheets activé' : 'Mode Grille activé', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  // Copy to clipboard helper with toast
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copié !`, 'success');
    } catch {
      showToast(`Impossible de copier`, 'error');
    }
  };

  // Share mission summary
  const handleShareEntry = async (entry: RideEntry) => {
    const datesStr = (entry.dateDepart || entry.dateRetour)
      ? `Dates : ${entry.dateDepart ? formatDateDisplay(entry.dateDepart) : '—'} ➔ ${entry.dateRetour ? formatDateDisplay(entry.dateRetour) : '—'}`
      : '';
    const chauffeurStr = `Chauffeur : ${entry.chauffeurNom} (${formatFullPhoneDisplay(entry.chauffeurTel, entry.chauffeurIndicatif)})`;
    const clientStr = `Client : ${entry.clientNom}${entry.clientTel ? ` (${formatFullPhoneDisplay(entry.clientTel, entry.clientIndicatif)})` : ''}`;
    const notesStr = entry.notes ? `Notes : ${entry.notes}` : '';

    const matriculeStr = entry.matricule ? ` [${entry.matricule}]` : '';
    const carburantStr = entry.carburant ? `Carburant : ${entry.carburant} DT (Ajouté le ${entry.dateCarburant || 'N/D'})` : '';
    const shareText = `🚗 MISSION FLOTTE\nVéhicule : ${entry.voiture}${matriculeStr}\n${datesStr ? datesStr + '\n' : ''}${carburantStr ? carburantStr + '\n' : ''}${chauffeurStr}\n${clientStr}${notesStr ? '\n' + notesStr : ''}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Mission ${entry.voiture}`,
          text: shareText
        });
        showToast('Mission partagée !', 'success');
        return;
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          copyToClipboard(shareText, 'Résumé de la mission');
        }
      }
    } else {
      copyToClipboard(shareText, 'Résumé de la mission');
    }
  };

  // Export single mission PDF
  const handleExportSinglePDF = (entry: RideEntry) => {
    try {
      showToast('Génération de la fiche de mission...', 'info');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Top banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 30, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('ORDRE DE MISSION / FICHE DE COURSE', 14, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      const dateStr = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      doc.text(`Édité le ${dateStr} — Réf: ${entry.id.toUpperCase()}`, 14, 24);

      // Vehicle banner
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, 36, 182, 22, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      const vehicleTitle = `VÉHICULE ASSIGNÉ : ${entry.voiture.toUpperCase()}${entry.matricule ? `  [ ${entry.matricule} ]` : ''}`;
      doc.text(vehicleTitle, 20, 46);

      const duration = calculateTripDuration(entry.dateDepart, entry.dateRetour);
      const datesText = (entry.dateDepart || entry.dateRetour)
        ? `Départ : ${entry.dateDepart ? formatDateDisplay(entry.dateDepart) : 'N/D'}  ➔  Retour : ${entry.dateRetour ? formatDateDisplay(entry.dateRetour) : 'N/D'} ${duration ? `(${duration})` : ''}`
        : 'Dates de mission non définies';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text(datesText, 20, 53);

      // Parties & Carburant table
      autoTable(doc, {
        startY: 64,
        head: [['Rôle / Poste', 'Information', 'Complément / Tél', 'Détails']],
        body: [
          ['Chauffeur', entry.chauffeurNom, entry.chauffeurIndicatif || '+216', entry.chauffeurTel],
          ['Client', entry.clientNom, entry.clientIndicatif || '+216', entry.clientTel || 'Non communiqué'],
          [
            'Carburant (DT)', 
            entry.carburant ? `${entry.carburant} DT` : 'Non renseigné', 
            'Date ajout carburant', 
            entry.dateCarburant || '—'
          ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 9.5, cellPadding: 3.5 }
      });

      // Notes
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Instructions & Notes de mission :', 14, finalY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const splitNotes = doc.splitTextToSize(entry.notes || 'Aucune note particulière pour cette course.', 180);
      doc.text(splitNotes, 14, finalY + 6);

      // Signatures
      const sigY = Math.max(finalY + 45, 180);
      doc.setDrawColor(203, 213, 225);
      doc.line(14, sigY, 90, sigY);
      doc.line(110, sigY, 186, sigY);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Visa / Signature Chauffeur', 14, sigY + 6);
      doc.text('Visa / Signature Client ou Responsable', 110, sigY + 6);

      const fileName = `fiche_course_${entry.voiture.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(fileName);
      showToast('Fiche de course PDF téléchargée !', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erreur génération PDF de la course', 'error');
    }
  };

  // WhatsApp helpers with pre-filled mission messages
  const getWhatsAppDriverLink = (entry: RideEntry): string => {
    const cleanInd = normalizeIndicatif(entry.chauffeurIndicatif);
    const cleanNum = cleanPhoneNumber(entry.chauffeurTel, cleanInd);
    const indDigits = cleanInd.replace(/[^0-9]/g, '');
    const dateStr = entry.dateDepart ? ` le ${formatDateDisplay(entry.dateDepart)}` : '';
    const clientStr = entry.clientNom ? ` Client : ${entry.clientNom}.` : '';
    const matriculeStr = entry.matricule ? ` (${entry.matricule})` : '';
    const carburantStr = entry.carburant ? ` Carburant : ${entry.carburant} DT.` : '';
    const text = encodeURIComponent(`Bonjour ${entry.chauffeurNom}, mission véhicule ${entry.voiture}${matriculeStr}${dateStr}.${clientStr}${carburantStr}`);
    return `https://wa.me/${indDigits}${cleanNum}?text=${text}`;
  };

  const getWhatsAppClientLink = (entry: RideEntry): string => {
    if (!entry.clientTel) return '#';
    const cleanInd = normalizeIndicatif(entry.clientIndicatif);
    const cleanNum = cleanPhoneNumber(entry.clientTel, cleanInd);
    const indDigits = cleanInd.replace(/[^0-9]/g, '');
    const dateStr = entry.dateDepart ? ` prévue le ${formatDateDisplay(entry.dateDepart)}` : '';
    const clientGreeting = entry.clientNom ? `Bonjour ${entry.clientNom}` : 'Bonjour';
    const matriculeStr = entry.matricule ? ` (${entry.matricule})` : '';
    const text = encodeURIComponent(`${clientGreeting}, votre course${dateStr} avec le véhicule ${entry.voiture}${matriculeStr} sera assurée par ${entry.chauffeurNom}.`);
    return `https://wa.me/${indDigits}${cleanNum}?text=${text}`;
  };

  // 4. Form inputs suggestions triggers
  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const brand = e.target.value;
    setFormBrand(brand);
    // Reset model
    setFormModel('');
    
    if (brand === '__custom_brand__') {
      setShowCustomFields(true);
    } else {
      setShowCustomFields(false);
    }
  };

  // Matricule Tunisian auto-formatter
  // Format: [1 to 4 digits] TU [3 digits] (e.g. 1234 TU 258, 1 TU 258, 12 TU 258, 123 TU 258)
  const handleMatriculeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value.toUpperCase();

    // Check if user is deleting characters
    const isDeleting = inputVal.length < formMatricule.length;
    if (isDeleting) {
      if (formMatricule.includes('TU') && !inputVal.includes('TU')) {
        // User deleted 'TU', keep only the leading digits
        const remainingDigits = inputVal.replace(/[^0-9]/g, '').slice(0, 4);
        setFormMatricule(remainingDigits);
        return;
      }
      if (inputVal.endsWith(' TU') || inputVal.endsWith(' T')) {
        // Trailing TU was touched, remove it cleanly back to digits
        const beforeTu = inputVal.replace(/\s*T(U)?\s*$/, '').replace(/[^0-9]/g, '').slice(0, 4);
        setFormMatricule(beforeTu);
        return;
      }
    }

    // Keep only digits, letters and spaces
    inputVal = inputVal.replace(/[^0-9A-Z\s]/g, '');

    // Case 1: 'TU' already exists in the input
    const tuIndex = inputVal.indexOf('TU');
    if (tuIndex !== -1) {
      const beforeTu = inputVal.substring(0, tuIndex).replace(/[^0-9]/g, '').slice(0, 4);
      const afterTu = inputVal.substring(tuIndex + 2).replace(/[^0-9]/g, '').slice(0, 3);
      if (beforeTu.length > 0) {
        if (afterTu.length > 0) {
          setFormMatricule(`${beforeTu} TU ${afterTu}`);
        } else {
          setFormMatricule(`${beforeTu} TU `);
        }
        return;
      }
    }

    // Case 2: Space entered after digits (from typing space, or on mobile keyboard)
    const spaceIndex = inputVal.indexOf(' ');
    if (spaceIndex !== -1) {
      const beforeSpace = inputVal.substring(0, spaceIndex).replace(/[^0-9]/g, '').slice(0, 4);
      const afterSpace = inputVal.substring(spaceIndex + 1).replace(/[^0-9]/g, '').slice(0, 3);
      if (beforeSpace.length > 0) {
        if (afterSpace.length > 0) {
          setFormMatricule(`${beforeSpace} TU ${afterSpace}`);
        } else {
          setFormMatricule(`${beforeSpace} TU `);
        }
        return;
      }
    }

    // Case 3: Only digits typed so far
    const pureDigits = inputVal.replace(/[^0-9]/g, '');

    // If 4 digits typed: automatically insert " TU "
    if (pureDigits.length >= 4) {
      const part1 = pureDigits.slice(0, 4);
      const part2 = pureDigits.slice(4, 7);
      if (part2.length > 0) {
        setFormMatricule(`${part1} TU ${part2}`);
      } else {
        setFormMatricule(`${part1} TU `);
      }
      return;
    }

    // 1 to 3 digits
    setFormMatricule(pureDigits);
  };

  // 4b. Handle Carburant change with automatic date/time stamping
  const handleCarburantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormCarburant(val);
    if (val.trim() !== '' && !isNaN(Number(val)) && Number(val) > 0) {
      // Automatic date stamping each time fuel is added or modified
      setFormDateCarburant(getAutomaticCurrentDateTime());
    } else if (val.trim() === '') {
      setFormDateCarburant('');
    }
  };

  // 4c. Quick refuel action (Ravitaillement rapide en DT avec date automatique)
  const handleAddQuickFuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFuelEntry) return;

    const amountNum = parseFloat(quickFuelAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Veuillez saisir un montant de carburant valide en DT (ex. 50 ou 80.5)', 'error');
      return;
    }

    const autoDate = getAutomaticCurrentDateTime();
    const newRecord: FuelRecord = {
      id: Math.random().toString(36).substring(2, 9),
      montant: amountNum,
      date: autoDate,
      note: quickFuelNote.trim() || undefined
    };

    const previousTotal = quickFuelEntry.carburant || 0;
    const newTotal = Math.round((previousTotal + amountNum) * 1000) / 1000;
    const existingHistory = quickFuelEntry.carburantHistorique || [];
    const newHistory = [newRecord, ...existingHistory];

    const updated = entries.map((item) => {
      if (item.id === quickFuelEntry.id) {
        return {
          ...item,
          carburant: newTotal,
          dateCarburant: autoDate,
          carburantHistorique: newHistory
        };
      }
      return item;
    });

    saveEntries(updated);

    // Update selectedEntry if modal is open
    if (selectedEntry && selectedEntry.id === quickFuelEntry.id) {
      setSelectedEntry({
        ...selectedEntry,
        carburant: newTotal,
        dateCarburant: autoDate,
        carburantHistorique: newHistory
      });
    }

    showToast(`Ravitaillement de ${amountNum} DT ajouté ! Date automatique : ${autoDate}`, 'success');
    setQuickFuelEntry(null);
    setQuickFuelAmount('');
    setQuickFuelNote('');
  };

  const handleMatriculeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // When pressing Space: if 1, 2, 3 or 4 digits and no TU yet, insert " TU "
    if (e.key === ' ' || e.key === 'Spacebar') {
      if (!formMatricule.includes('TU')) {
        const digits = formMatricule.replace(/[^0-9]/g, '');
        if (digits.length >= 1 && digits.length <= 4) {
          e.preventDefault();
          setFormMatricule(`${digits} TU `);
          return;
        }
      }
    }

    // When pressing Backspace: step back cleanly without getting stuck
    if (e.key === 'Backspace') {
      if (formMatricule.endsWith(' TU ')) {
        e.preventDefault();
        setFormMatricule(formMatricule.slice(0, -4));
        return;
      }
      if (formMatricule.endsWith(' TU')) {
        e.preventDefault();
        setFormMatricule(formMatricule.slice(0, -3));
        return;
      }
      if (formMatricule.endsWith(' T')) {
        e.preventDefault();
        setFormMatricule(formMatricule.slice(0, -2));
        return;
      }
    }
  };

  // 5. Open Form Modal for adding
  const handleOpenAdd = () => {
    setCurrentEntryId(null);
    setFormBrand('');
    setFormModel('');
    setFormCustomVoiture('');
    setFormMatricule('');
    setFormChauffeurNom('');
    setFormChauffeurIndicatif('+216');
    setIsChauffeurCustomIndicatif(false);
    setFormChauffeurTel('');
    setFormClientNom('');
    setFormClientIndicatif('+216');
    setIsClientCustomIndicatif(false);
    setFormClientTel('');
    setFormDateDepart('');
    setFormDateRetour('');
    setFormCarburant('');
    setFormDateCarburant('');
    setFormCarburantHistorique([]);
    setFormNotes('');
    
    // Custom states
    setShowCustomFields(false);
    setCustomBrandInput('');
    setCustomModelInput('');
    setIsFormOpen(true);
  };

  // 6. Open Form Modal for editing
  const handleOpenEdit = (entry: RideEntry) => {
    setCurrentEntryId(entry.id);
    setFormMatricule(entry.matricule || '');
    setFormCarburant(entry.carburant ? entry.carburant.toString() : '');
    setFormDateCarburant(entry.dateCarburant || '');
    setFormCarburantHistorique(entry.carburantHistorique || []);
    
    // Clear custom fields
    setShowCustomFields(false);
    setCustomBrandInput('');
    setCustomModelInput('');

    // Deduce brand and model if possible
    let detectedBrand = '';
    let detectedModel = '';

    for (const item of carSuggestions) {
      if (item.brand !== 'Autre / Custom' && entry.voiture.startsWith(item.brand)) {
        detectedBrand = item.brand;
        const potentialModel = entry.voiture.replace(item.brand, '').trim();
        if (item.models.includes(potentialModel)) {
          detectedModel = potentialModel;
        } else {
          detectedBrand = 'Autre / Custom';
        }
        break;
      }
    }

    if (detectedBrand && detectedBrand !== 'Autre / Custom') {
      setFormBrand(detectedBrand);
      setFormModel(detectedModel);
      setFormCustomVoiture('');
    } else {
      setFormBrand('Autre / Custom');
      setFormModel('');
      setFormCustomVoiture(entry.voiture);
    }

    setFormChauffeurNom(entry.chauffeurNom);
    const chInd = entry.chauffeurIndicatif || '+216';
    setFormChauffeurIndicatif(chInd);
    setIsChauffeurCustomIndicatif(!COUNTRY_CODES.some(c => c.code === chInd));
    setFormChauffeurTel(entry.chauffeurTel);

    setFormClientNom(entry.clientNom);
    const clInd = entry.clientIndicatif || '+216';
    setFormClientIndicatif(clInd);
    setIsClientCustomIndicatif(!COUNTRY_CODES.some(c => c.code === clInd));
    setFormClientTel(entry.clientTel);

    setFormDateDepart(entry.dateDepart || '');
    setFormDateRetour(entry.dateRetour || '');
    setFormNotes(entry.notes);
    setIsFormOpen(true);
  };

  // 7. Form Submission
  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();

    // Deduce final vehicle name
    let finalVoiture = '';
    let updatedSuggestions = [...carSuggestions];
    let addedNewSuggestion = false;

    if (formBrand === '__custom_brand__') {
      const brandTrim = customBrandInput.trim();
      const modelTrim = customModelInput.trim();
      if (!brandTrim || !modelTrim) {
        showToast('Veuillez saisir la marque et le modèle personnalisés', 'error');
        return;
      }
      finalVoiture = `${brandTrim} ${modelTrim}`;
      
      // Auto-add brand & model to dynamic suggestions
      const existingBrandIndex = updatedSuggestions.findIndex(
        (item) => item.brand.toLowerCase() === brandTrim.toLowerCase()
      );
      if (existingBrandIndex === -1) {
        updatedSuggestions.push({ brand: brandTrim, models: [modelTrim] });
        addedNewSuggestion = true;
      } else {
        const brandObj = updatedSuggestions[existingBrandIndex];
        if (!brandObj.models.some((m) => m.toLowerCase() === modelTrim.toLowerCase())) {
          brandObj.models.push(modelTrim);
          addedNewSuggestion = true;
        }
      }
    } else if (formBrand && formModel === '__custom_model__') {
      const modelTrim = customModelInput.trim();
      if (!modelTrim) {
        showToast('Veuillez saisir le modèle personnalisé', 'error');
        return;
      }
      finalVoiture = `${formBrand} ${modelTrim}`;
      
      // Auto-add model to selected brand
      const existingBrandIndex = updatedSuggestions.findIndex(
        (item) => item.brand.toLowerCase() === formBrand.toLowerCase()
      );
      if (existingBrandIndex !== -1) {
        const brandObj = { ...updatedSuggestions[existingBrandIndex] };
        if (!brandObj.models.some((m) => m.toLowerCase() === modelTrim.toLowerCase())) {
          brandObj.models = [...brandObj.models, modelTrim];
          updatedSuggestions[existingBrandIndex] = brandObj;
          addedNewSuggestion = true;
        }
      }
    } else if (formBrand === 'Autre / Custom' || !formBrand) {
      finalVoiture = formCustomVoiture.trim();
    } else {
      finalVoiture = `${formBrand} ${formModel}`.trim();
    }

    if (addedNewSuggestion) {
      setCarSuggestions(updatedSuggestions);
      localStorage.setItem('fleet_manager_car_suggestions', JSON.stringify(updatedSuggestions));
      showToast(`« ${finalVoiture} » a été ajouté à votre liste déroulante !`, 'info');
    }

    // Validations (Voiture + Chauffeur + Téléphone sont les seuls requis)
    if (!finalVoiture) {
      showToast('Veuillez indiquer la voiture (marque et modèle)', 'error');
      return;
    }
    if (!formChauffeurNom.trim()) {
      showToast('Veuillez indiquer le nom du chauffeur', 'error');
      return;
    }

    const chInd = normalizeIndicatif(formChauffeurIndicatif);
    const clInd = normalizeIndicatif(formClientIndicatif);
    const cleanChauffeurTel = cleanPhoneNumber(formChauffeurTel, chInd);
    const cleanClientTel = cleanPhoneNumber(formClientTel, clInd);

    if (cleanChauffeurTel.length < 6) {
      showToast('Le numéro du chauffeur doit comporter au moins 6 chiffres', 'error');
      return;
    }
    if (chInd === '+216' && cleanChauffeurTel.length !== 8) {
      showToast('Le numéro tunisien du chauffeur doit comporter 8 chiffres', 'error');
      return;
    }
    if (cleanClientTel && cleanClientTel.length < 6) {
      showToast('Le numéro du client doit comporter au moins 6 chiffres (ou être vide)', 'error');
      return;
    }
    if (cleanClientTel && clInd === '+216' && cleanClientTel.length !== 8) {
      showToast('Le numéro tunisien du client doit comporter 8 chiffres (ou être vide)', 'error');
      return;
    }

    if (formDateDepart && formDateRetour && formDateRetour < formDateDepart) {
      showToast('La date de retour ne peut pas être antérieure à la date de départ', 'error');
      return;
    }

    // Validate Tunisian Matricule if entered (3 digits mandatory after TU)
    const cleanMatricule = formMatricule.trim().toUpperCase().replace(/\s+/g, ' ');
    if (cleanMatricule) {
      const matriculeRegex = /^[0-9]{1,4}\s+TU\s+[0-9]{3}$/;
      if (!matriculeRegex.test(cleanMatricule)) {
        showToast('Le matricule doit comporter exactement 3 chiffres après TU (ex. 1234 TU 258 ou 245 TU 123)', 'error');
        return;
      }

      // RÈGLE FONDAMENTALE : Interdit de donner la même immatriculation pour deux véhicules différents
      const conflictingVehicleEntry = entries.find((entry) => {
        if (currentEntryId && entry.id === currentEntryId) return false;
        const entryMatricule = (entry.matricule || '').trim().toUpperCase().replace(/\s+/g, ' ');
        if (!entryMatricule || entryMatricule !== cleanMatricule) return false;

        const existingCar = (entry.voiture || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const currentCar = finalVoiture.trim().toLowerCase().replace(/\s+/g, ' ');
        return existingCar !== currentCar;
      });

      if (conflictingVehicleEntry) {
        showToast(
          `Action interdite : L'immatriculation « ${cleanMatricule} » est déjà attribuée au véhicule « ${conflictingVehicleEntry.voiture} ». Il est strictement interdit d'attribuer la même immatriculation à deux véhicules différents !`,
          'error'
        );
        return;
      }

      // RÈGLE DE DISPONIBILITÉ : Deux courses ne peuvent pas réserver le même véhicule physique sur des dates qui se chevauchent
      if (formDateDepart && formDateRetour) {
        const overlappingEntry = entries.find((entry) => {
          if (currentEntryId && entry.id === currentEntryId) return false;
          const entryMatricule = (entry.matricule || '').trim().toUpperCase().replace(/\s+/g, ' ');
          if (!entryMatricule || entryMatricule !== cleanMatricule) return false;
          if (!entry.dateDepart || !entry.dateRetour) return false;

          // Chevauchement : départ <= retourAutre ET retour >= départAutre
          return formDateDepart <= entry.dateRetour && formDateRetour >= entry.dateDepart;
        });

        if (overlappingEntry) {
          showToast(
            `Conflit de planning : Le véhicule « ${finalVoiture} » (${cleanMatricule}) est déjà réservé du ${formatDateDisplay(overlappingEntry.dateDepart)} au ${formatDateDisplay(overlappingEntry.dateRetour)} (Chauffeur : ${overlappingEntry.chauffeurNom}).`,
            'error'
          );
          return;
        }
      }
    }

    // Duplicate Check
    const isDuplicate = entries.some(entry => {
      // Don't match self when editing
      if (currentEntryId && entry.id === currentEntryId) return false;

      return (
        entry.voiture.toLowerCase() === finalVoiture.toLowerCase() &&
        (entry.matricule || '').toUpperCase() === cleanMatricule &&
        entry.chauffeurNom.toLowerCase() === formChauffeurNom.trim().toLowerCase() &&
        (entry.clientNom || '').toLowerCase() === formClientNom.trim().toLowerCase() &&
        (entry.dateDepart || '') === formDateDepart
      );
    });

    if (isDuplicate) {
      showToast('Cette course exacte semble déjà exister !', 'error');
      return;
    }

    // Fuel amount & auto date handling
    const cleanCarburantNum = formCarburant.trim() ? parseFloat(formCarburant.replace(',', '.')) : undefined;
    let finalDateCarburant = formDateCarburant.trim();
    if (cleanCarburantNum !== undefined && cleanCarburantNum > 0 && !finalDateCarburant) {
      finalDateCarburant = getAutomaticCurrentDateTime();
    }

    if (currentEntryId) {
      // Modify
      const updated = entries.map((entry) => {
        if (entry.id === currentEntryId) {
          // Prepare updated fuel history if new amount entered
          let updatedHistory = entry.carburantHistorique || [];
          if (cleanCarburantNum !== undefined && cleanCarburantNum > 0 && cleanCarburantNum !== entry.carburant) {
            updatedHistory = [
              {
                id: Math.random().toString(36).substring(2, 9),
                montant: cleanCarburantNum,
                date: finalDateCarburant || getAutomaticCurrentDateTime(),
                note: 'Mis à jour dans le formulaire'
              },
              ...updatedHistory
            ];
          }

          return {
            ...entry,
            voiture: finalVoiture,
            matricule: cleanMatricule || undefined,
            chauffeurNom: formChauffeurNom.trim(),
            chauffeurIndicatif: chInd,
            chauffeurTel: cleanChauffeurTel,
            clientNom: formClientNom.trim(),
            clientIndicatif: clInd,
            clientTel: cleanClientTel,
            dateDepart: formDateDepart,
            dateRetour: formDateRetour,
            carburant: (cleanCarburantNum !== undefined && cleanCarburantNum > 0) ? cleanCarburantNum : undefined,
            dateCarburant: (cleanCarburantNum !== undefined && cleanCarburantNum > 0) ? finalDateCarburant : undefined,
            carburantHistorique: updatedHistory,
            notes: formNotes.trim()
          };
        }
        return entry;
      });
      saveEntries(updated);
      if (selectedEntry && selectedEntry.id === currentEntryId) {
        const found = updated.find(e => e.id === currentEntryId);
        if (found) setSelectedEntry(found);
      }
      showToast('Modification enregistrée', 'success');
    } else {
      // Create new
      const newEntry: RideEntry = {
        id: Math.random().toString(36).substring(2, 9),
        voiture: finalVoiture,
        matricule: cleanMatricule || undefined,
        chauffeurNom: formChauffeurNom.trim(),
        chauffeurIndicatif: chInd,
        chauffeurTel: cleanChauffeurTel,
        clientNom: formClientNom.trim(),
        clientIndicatif: clInd,
        clientTel: cleanClientTel,
        dateDepart: formDateDepart,
        dateRetour: formDateRetour,
        carburant: (cleanCarburantNum !== undefined && cleanCarburantNum > 0) ? cleanCarburantNum : undefined,
        dateCarburant: (cleanCarburantNum !== undefined && cleanCarburantNum > 0) ? finalDateCarburant : undefined,
        carburantHistorique: (cleanCarburantNum !== undefined && cleanCarburantNum > 0)
          ? [{
              id: Math.random().toString(36).substring(2, 9),
              montant: cleanCarburantNum,
              date: finalDateCarburant || getAutomaticCurrentDateTime(),
              note: 'Saisie initiale'
            }]
          : [],
        notes: formNotes.trim(),
        createdAt: Date.now()
      };
      saveEntries([newEntry, ...entries]);
      showToast('Enregistrement effectué', 'success');
    }

    setIsFormOpen(false);
  };

  // 8. Delete Triggering
  const triggerDelete = (id: string) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      const updated = entries.filter((entry) => entry.id !== deleteTargetId);
      saveEntries(updated);
      if (selectedEntry && selectedEntry.id === deleteTargetId) {
        setSelectedEntry(null);
      }
      showToast('Entrée supprimée', 'success');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    }
  };

  // 8b. Delete All Triggering
  const triggerDeleteAll = () => {
    setIsDeleteAllOpen(true);
  };

  const confirmDeleteAll = () => {
    saveEntries([]);
    setSelectedEntry(null);
    showToast('Toutes les courses ont été supprimées !', 'success');
    setIsDeleteAllOpen(false);
  };

  // 8c. Real PDF Export with jsPDF & autoTable (Filtré par la période sélectionnée)
  const handleExportPDF = () => {
    const targetEntries = entriesToExport;
    if (targetEntries.length === 0) {
      showToast('Aucune course dans la période sélectionnée pour le PDF', 'info');
      return;
    }

    try {
      showToast('Génération du fichier PDF...', 'info');

      // Create PDF in landscape A4 for optimal readability of all columns
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Top banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 297, 24, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('GESTION DU PARC AUTOMOBILE & MISSIONS', 14, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      const dateStr = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      const periodSubtitle = (exportStartDate || exportEndDate) ? ` - ${exportPeriodLabel}` : '';
      doc.text(`Rapport édité le ${dateStr}${periodSubtitle} - Total : ${targetEntries.length} course(s)`, 297 - 14, 15, { align: 'right' });

      // Build table data
      const head = [['#', 'Voiture & Matricule', 'Carburant (DT)', 'Dates (Dép. - Ret.)', 'Chauffeur', 'Tél Chauffeur', 'Client', 'Tél Client', 'Notes / Mission']];
      
      const data = targetEntries.map((e, index) => {
        const datesStr = (e.dateDepart || e.dateRetour)
          ? `${e.dateDepart ? formatDateDisplay(e.dateDepart) : '—'}\n➔ ${e.dateRetour ? formatDateDisplay(e.dateRetour) : '—'}`
          : 'Non définie';

        const chauffeurPhone = formatFullPhoneDisplay(e.chauffeurTel, e.chauffeurIndicatif);
        const clientPhone = e.clientTel ? formatFullPhoneDisplay(e.clientTel, e.clientIndicatif) : 'Non fourni';

        const carDisplay = e.matricule ? `${e.voiture || '—'}\n[${e.matricule}]` : (e.voiture || '—');
        const fuelDisplay = e.carburant ? `${e.carburant} DT\n(${e.dateCarburant || 'Auto'})` : '—';

        return [
          (index + 1).toString(),
          carDisplay,
          fuelDisplay,
          datesStr,
          e.chauffeurNom || '—',
          chauffeurPhone,
          e.clientNom || '—',
          clientPhone,
          e.notes || '—'
        ];
      });

      autoTable(doc, {
        head: head,
        body: data,
        startY: 28,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59], // slate-800
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'left',
          cellPadding: 3
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [30, 41, 59],
          cellPadding: 3,
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 35, fontStyle: 'bold' },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 32 },
          4: { cellWidth: 28 },
          5: { cellWidth: 30 },
          6: { cellWidth: 28 },
          7: { cellWidth: 30 },
          8: { cellWidth: 'auto' }
        },
        didDrawPage: (dataObj) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Gestion Voitures - Document généré automatiquement - Page ${dataObj.pageNumber} / ${pageCount}`,
            14,
            204
          );
        }
      });

      // 8c-bis. Ajouter la page de Synthèse par Voiture pour les courses de la période
      const { vehicleReports, stats } = generateDriversReport(targetEntries, {
        nombreDeJours: null,
        dateReference: new Date().toISOString().slice(0, 10),
        chauffeurFiltre: 'all',
        searchQuery: ''
      });

      if (vehicleReports.length > 0) {
        doc.addPage();
        
        // Bandeau titre page synthèse
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 297, 24, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('SYNTHÈSE PAR VOITURE : NOMBRE DE JOURS & CONSOMMATION ÉNERGIE TOTALE', 14, 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(`Total : ${stats.totalVehiculesDistincts} véhicule(s) · ${stats.totalJoursFlotte} jours cumulés · ${stats.consommationEnergieTotaleFlotteDT} DT énergie${periodSubtitle}`, 297 - 14, 15, { align: 'right' });

        const vehicleRows = vehicleReports.map((v, index) => {
          const avgPerDay = v.totalJours > 0 ? `${(v.consommationEnergieTotaleDT / v.totalJours).toFixed(1)} DT/j` : '—';
          return [
            (index + 1).toString(),
            v.labelComplet,
            `${v.totalJours} Jour${v.totalJours > 1 ? 's' : ''}`,
            `${v.consommationEnergieTotaleDT} DT`,
            avgPerDay,
            v.totalCourses.toString(),
            v.chauffeurs.join(', ') || '—'
          ];
        });

        autoTable(doc, {
          startY: 30,
          head: [['#', 'Véhicule & Matricule', 'Nombre Total de Jours (Inclusif)', 'Consommation Énergie Totale', 'Moyenne Journalière', 'Courses', 'Chauffeur(s) Assigné(s)']],
          body: vehicleRows,
          theme: 'striped',
          headStyles: {
            fillColor: [14, 116, 144], // cyan-700
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 3.5
          },
          bodyStyles: {
            fontSize: 8.5,
            textColor: [30, 41, 59],
            cellPadding: 3.5,
            valign: 'middle'
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 60, fontStyle: 'bold' },
            2: { cellWidth: 45, halign: 'center', fontStyle: 'bold' },
            3: { cellWidth: 45, halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] },
            4: { cellWidth: 35, halign: 'right' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 'auto' }
          },
          foot: [[
            'TOTAL',
            `${stats.totalVehiculesDistincts} Véhicule(s)`,
            `${stats.totalJoursFlotte} Jours`,
            `${stats.consommationEnergieTotaleFlotteDT} DT`,
            stats.totalJoursFlotte > 0 ? `${(stats.consommationEnergieTotaleFlotteDT / stats.totalJoursFlotte).toFixed(1)} DT/j` : '—',
            `${stats.totalCourses}`,
            ''
          ]],
          footStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            fontSize: 9
          },
          didDrawPage: (dataObj) => {
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(
              `Gestion Voitures - Synthèse Flotte & Énergie - Page ${dataObj.pageNumber} / ${pageCount}`,
              14,
              204
            );
          }
        });
      }

      const fileDateSuffix = (exportStartDate || exportEndDate)
        ? `${exportStartDate || 'debut'}_au_${exportEndDate || 'fin'}`
        : new Date().toISOString().slice(0, 10);
      const fileName = `rapport_courses_${fileDateSuffix}.pdf`;
      doc.save(fileName);
      showToast(`Fichier PDF (${targetEntries.length} courses) téléchargé avec succès !`, 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('Erreur lors de la génération du fichier PDF', 'error');
    }
  };

  // 8c2. Print Handler with iframe-safe fallback
  const handlePrint = () => {
    const targetEntries = entriesToExport;
    if (targetEntries.length === 0) {
      showToast('Aucune course dans la période sélectionnée à imprimer', 'info');
      return;
    }

    try {
      showToast('Lancement de l\'impression...', 'info');
      const isIframe = window.self !== window.top;
      
      setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.warn('Direct print blocked by browser sandbox, downloading PDF instead:', e);
          handleExportPDF();
          showToast('Impression bloquée par le navigateur : téléchargement du PDF automatique', 'info');
        }
      }, 200);

      if (isIframe) {
        setTimeout(() => {
          showToast('Astuce : Le bouton "Enregistrer PDF" permet aussi de télécharger directement le fichier !', 'info');
        }, 2200);
      }
    } catch (err) {
      console.error(err);
      handleExportPDF();
    }
  };

  // 8d. Export to CSV (Filtré par la période sélectionnée)
  const handleExportCSV = () => {
    const targetEntries = entriesToExport;
    if (targetEntries.length === 0) {
      showToast('Aucune course dans la période sélectionnée à exporter', 'info');
      return;
    }
    
    // Header for Tunisian Fleet Managers
    const headers = ['Voiture', 'Matricule', 'Carburant_DT', 'Date_Carburant', 'Date_Depart', 'Date_Retour', 'Nom_Chauffeur', 'Indicatif_Chauffeur', 'Tel_Chauffeur', 'Nom_Client', 'Indicatif_Client', 'Tel_Client', 'Notes_Mission'];
    const csvContent = [
      headers.join(';'),
      ...targetEntries.map(e => [
        `"${(e.voiture || '').replace(/"/g, '""')}"`,
        `"${(e.matricule || '').replace(/"/g, '""')}"`,
        `"${e.carburant ? e.carburant.toString() : ''}"`,
        `"${(e.dateCarburant || '').replace(/"/g, '""')}"`,
        `"${(e.dateDepart || '').replace(/"/g, '""')}"`,
        `"${(e.dateRetour || '').replace(/"/g, '""')}"`,
        `"${(e.chauffeurNom || '').replace(/"/g, '""')}"`,
        `"${(e.chauffeurIndicatif || '+216').replace(/"/g, '""')}"`,
        `"${(e.chauffeurTel || '').replace(/"/g, '""')}"`,
        `"${(e.clientNom || '').replace(/"/g, '""')}"`,
        `"${(e.clientIndicatif || '+216').replace(/"/g, '""')}"`,
        `"${(e.clientTel || '').replace(/"/g, '""')}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`
      ].join(';'))
    ].join('\r\n');

    // Unicode BOM for French Excel compatibility (handles accents beautifully)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileDateSuffix = (exportStartDate || exportEndDate)
      ? `${exportStartDate || 'debut'}_au_${exportEndDate || 'fin'}`
      : new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `gestion_voitures_${fileDateSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Fichier CSV (${targetEntries.length} course${targetEntries.length > 1 ? 's' : ''}) exporté avec succès !`, 'success');
  };

  // 8e. Export to JSON (Sauvegarde complète)
  const handleExportJSON = () => {
    if (entries.length === 0) {
      showToast('Aucune course à sauvegarder', 'info');
      return;
    }
    const jsonStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gestion_voitures_sauvegarde_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Sauvegarde JSON exportée !', 'success');
  };

  // 8f. Trigger Dynamic Import file browser
  const triggerImportFile = () => {
    if (importFileRef.current) {
      importFileRef.current.click();
    }
  };

  // 8g. Parse and import CSV or JSON files
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        
        if (file.name.endsWith('.json')) {
          const imported = JSON.parse(text);
          if (!Array.isArray(imported)) {
            showToast('Format invalide : Le fichier doit contenir un tableau de courses', 'error');
            return;
          }

          const validated: RideEntry[] = [];
          let duplicateCount = 0;

          imported.forEach((item: any) => {
            if (item.voiture && item.chauffeurNom && item.chauffeurTel && item.clientNom) {
              const chInd = normalizeIndicatif(item.chauffeurIndicatif || '+216');
              const clInd = normalizeIndicatif(item.clientIndicatif || '+216');
              const cleanChauffeurTel = cleanPhoneNumber(item.chauffeurTel, chInd);
              const cleanClientTel = cleanPhoneNumber(item.clientTel || '', clInd);
              
              // Duplicate match
              const exists = entries.some(e => e.id === item.id) || validated.some(e => e.id === item.id);
              if (exists) {
                duplicateCount++;
                item.id = Math.random().toString(36).substring(2, 9); // regenerate unique id
              }

              validated.push({
                id: item.id || Math.random().toString(36).substring(2, 9),
                voiture: String(item.voiture),
                chauffeurNom: String(item.chauffeurNom),
                chauffeurIndicatif: chInd,
                chauffeurTel: cleanChauffeurTel,
                clientNom: String(item.clientNom),
                clientIndicatif: clInd,
                clientTel: cleanClientTel,
                dateDepart: item.dateDepart ? String(item.dateDepart) : '',
                dateRetour: item.dateRetour ? String(item.dateRetour) : '',
                notes: String(item.notes || ''),
                createdAt: Number(item.createdAt || Date.now())
              });
            }
          });

          if (validated.length === 0) {
            showToast('Aucune course valide trouvée dans le fichier JSON', 'error');
            return;
          }

          // RÈGLE : Interdit de donner la même immatriculation pour deux véhicules différents
          const jsonMatriculeMap = new Map<string, string>();
          entries.forEach((e) => {
            const mat = (e.matricule || '').trim().toUpperCase().replace(/\s+/g, ' ');
            if (mat && e.voiture) {
              jsonMatriculeMap.set(mat, e.voiture.trim());
            }
          });

          let jsonConflict: { matricule: string; car1: string; car2: string } | null = null;
          for (const item of validated) {
            const mat = (item.matricule || '').trim().toUpperCase().replace(/\s+/g, ' ');
            if (mat && item.voiture) {
              const knownCar = jsonMatriculeMap.get(mat);
              if (knownCar && knownCar.toLowerCase().replace(/\s+/g, ' ') !== item.voiture.trim().toLowerCase().replace(/\s+/g, ' ')) {
                jsonConflict = { matricule: mat, car1: knownCar, car2: item.voiture.trim() };
                break;
              }
              jsonMatriculeMap.set(mat, item.voiture.trim());
            }
          }

          if (jsonConflict) {
            showToast(
              `Importation refusée : L'immatriculation « ${jsonConflict.matricule} » apparaît pour deux véhicules différents (« ${jsonConflict.car1} » et « ${jsonConflict.car2} »).`,
              'error'
            );
            return;
          }

          const merged = [...validated, ...entries];
          saveEntries(merged);
          showToast(`${validated.length} courses importées avec succès !`, 'success');
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split(/\r?\n/);
          const validated: RideEntry[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const sep = line.includes(';') ? ';' : ',';
            const parts = line.split(sep).map(p => p.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
            
            if (parts.length >= 13) {
              // Full format with matricule, carburant, auto date, dates and indicatifs
              const carbNum = parts[2] ? parseFloat(parts[2].replace(',', '.')) : undefined;
              const carbDate = parts[3] || undefined;
              validated.push({
                id: Math.random().toString(36).substring(2, 9),
                voiture: parts[0],
                matricule: parts[1] || undefined,
                carburant: (carbNum && !isNaN(carbNum)) ? carbNum : undefined,
                dateCarburant: carbDate,
                carburantHistorique: (carbNum && !isNaN(carbNum))
                  ? [{ id: Math.random().toString(36).substring(2, 9), montant: carbNum, date: carbDate || getAutomaticCurrentDateTime(), note: 'Import CSV' }]
                  : [],
                dateDepart: parts[4] || '',
                dateRetour: parts[5] || '',
                chauffeurNom: parts[6],
                chauffeurIndicatif: normalizeIndicatif(parts[7] || '+216'),
                chauffeurTel: cleanPhoneNumber(parts[8]),
                clientNom: parts[9],
                clientIndicatif: normalizeIndicatif(parts[10] || '+216'),
                clientTel: parts[11] ? cleanPhoneNumber(parts[11]) : '',
                notes: parts[12] || '',
                createdAt: Date.now()
              });
            } else if (parts.length >= 11) {
              // Full format with matricule, dates and indicatifs
              validated.push({
                id: Math.random().toString(36).substring(2, 9),
                voiture: parts[0],
                matricule: parts[1] || undefined,
                dateDepart: parts[2] || '',
                dateRetour: parts[3] || '',
                chauffeurNom: parts[4],
                chauffeurIndicatif: normalizeIndicatif(parts[5] || '+216'),
                chauffeurTel: cleanPhoneNumber(parts[6]),
                clientNom: parts[7],
                clientIndicatif: normalizeIndicatif(parts[8] || '+216'),
                clientTel: parts[9] ? cleanPhoneNumber(parts[9]) : '',
                notes: parts[10] || '',
                createdAt: Date.now()
              });
            } else if (parts.length >= 8) {
              // Format with dates and indicatifs (legacy without matricule)
              validated.push({
                id: Math.random().toString(36).substring(2, 9),
                voiture: parts[0],
                dateDepart: parts[1] || '',
                dateRetour: parts[2] || '',
                chauffeurNom: parts[3],
                chauffeurIndicatif: normalizeIndicatif(parts[4] || '+216'),
                chauffeurTel: cleanPhoneNumber(parts[5]),
                clientNom: parts[6],
                clientIndicatif: normalizeIndicatif(parts[7] || '+216'),
                clientTel: parts[8] ? cleanPhoneNumber(parts[8]) : '',
                notes: parts[9] || '',
                createdAt: Date.now()
              });
            } else if (parts.length >= 4) {
              // Legacy format
              validated.push({
                id: Math.random().toString(36).substring(2, 9),
                voiture: parts[0],
                chauffeurNom: parts[1],
                chauffeurIndicatif: '+216',
                chauffeurTel: cleanPhoneNumber(parts[2]),
                clientNom: parts[3],
                clientIndicatif: '+216',
                clientTel: parts[4] ? cleanPhoneNumber(parts[4]) : '',
                dateDepart: '',
                dateRetour: '',
                notes: parts[5] || '',
                createdAt: Date.now()
              });
            }
          }

          if (validated.length === 0) {
            showToast('Aucun trajet valide trouvé dans le CSV', 'error');
            return;
          }

          // RÈGLE : Interdit de donner la même immatriculation pour deux véhicules différents
          const csvMatriculeMap = new Map<string, string>();
          entries.forEach((e) => {
            const mat = (e.matricule || '').trim().toUpperCase().replace(/\s+/g, ' ');
            if (mat && e.voiture) {
              csvMatriculeMap.set(mat, e.voiture.trim());
            }
          });

          let csvConflict: { matricule: string; car1: string; car2: string } | null = null;
          for (const item of validated) {
            const mat = (item.matricule || '').trim().toUpperCase().replace(/\s+/g, ' ');
            if (mat && item.voiture) {
              const knownCar = csvMatriculeMap.get(mat);
              if (knownCar && knownCar.toLowerCase().replace(/\s+/g, ' ') !== item.voiture.trim().toLowerCase().replace(/\s+/g, ' ')) {
                csvConflict = { matricule: mat, car1: knownCar, car2: item.voiture.trim() };
                break;
              }
              csvMatriculeMap.set(mat, item.voiture.trim());
            }
          }

          if (csvConflict) {
            showToast(
              `Importation refusée : L'immatriculation « ${csvConflict.matricule} » apparaît pour deux véhicules différents (« ${csvConflict.car1} » et « ${csvConflict.car2} »).`,
              'error'
            );
            return;
          }

          saveEntries([...validated, ...entries]);
          showToast(`${validated.length} courses importées depuis le CSV !`, 'success');
        } else {
          showToast('Extension non supportée (.json ou .csv)', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Erreur lors du décodage du fichier de sauvegarde', 'error');
      }
      
      if (e.target) {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // 9. Searching, Brand Filtering and Sorting
  const filteredEntries = useMemo(() => {
    let result = entries.filter((entry) => {
      // 1. Filtrage par marque de véhicule
      if (selectedBrandFilter) {
        const detected = extractBrandFromVehicle(entry.voiture, carSuggestions);
        const lowerVoiture = (entry.voiture || '').toLowerCase();
        const lowerFilter = selectedBrandFilter.toLowerCase();

        const matchesBrand =
          detected.toLowerCase() === lowerFilter ||
          lowerVoiture.startsWith(lowerFilter) ||
          lowerVoiture.includes(lowerFilter) ||
          (lowerFilter === 'mercedes-benz' && lowerVoiture.includes('mercedes')) ||
          (lowerFilter === 'mg' && (lowerVoiture.startsWith('mg') || lowerVoiture.includes('morris')));

        if (!matchesBrand) return false;
      }

      // 2. Recherche textuelle
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      return (
        entry.voiture.toLowerCase().includes(query) ||
        (entry.matricule && entry.matricule.toLowerCase().includes(query)) ||
        entry.chauffeurNom.toLowerCase().includes(query) ||
        entry.chauffeurTel.includes(query) ||
        (entry.chauffeurIndicatif && entry.chauffeurIndicatif.toLowerCase().includes(query)) ||
        entry.clientNom.toLowerCase().includes(query) ||
        entry.clientTel.includes(query) ||
        (entry.clientIndicatif && entry.clientIndicatif.toLowerCase().includes(query)) ||
        (entry.dateDepart && entry.dateDepart.toLowerCase().includes(query)) ||
        (entry.dateRetour && entry.dateRetour.toLowerCase().includes(query)) ||
        (entry.carburant && `${entry.carburant} dt`.includes(query)) ||
        (entry.dateCarburant && entry.dateCarburant.toLowerCase().includes(query)) ||
        entry.notes.toLowerCase().includes(query)
      );
    });

    // 3. Tri rapide par marque de véhicule
    if (brandSortOrder === 'asc') {
      result = [...result].sort((a, b) => a.voiture.localeCompare(b.voiture, 'fr', { sensitivity: 'base' }));
    } else if (brandSortOrder === 'desc') {
      result = [...result].sort((a, b) => b.voiture.localeCompare(a.voiture, 'fr', { sensitivity: 'base' }));
    }

    return result;
  }, [entries, searchQuery, selectedBrandFilter, brandSortOrder, carSuggestions]);

  // 10. Manual PWA prompt installer
  const handleInstallClick = async () => {
    if (isInstalled) {
      showToast("L'application est déjà installée sur votre appareil ! 🚗", "success");
      return;
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          showToast("Application installée avec succès sur votre téléphone !", "success");
          return;
        }
      } catch (err) {
        console.error('PWA install error:', err);
      }
    }

    // Ouvrir le guide explicatif pour smartphone (Android & iPhone)
    setShowInstallGuide(true);
  };

  // Nav bottom bar helpers
  const handleNavHome = () => {
    setSearchQuery('');
    setSelectedBrandFilter('');
    setBrandSortOrder('none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 flex flex-col justify-between">
      
      {/* 1. Header Area */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-2.5 safe-top">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-2.5">
          {/* Top Brand row & quick utility toggles */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <img 
                src="/icons/icon.svg" 
                alt="Logo Gestion Voitures" 
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-md border border-sky-500/40 object-cover shrink-0" 
              />
              <div>
                <h1 id="app-title" className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">Gestion Voitures</h1>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium">{entries.length} véhicule{entries.length > 1 ? 's' : ''} / courses</p>
              </div>
            </div>

            {/* Quick Header Buttons: Fullscreen (smartphone) + Theme Toggle */}
            <div className="flex items-center gap-1.5">
              {/* Fullscreen Button in Header */}
              <button
                id="header-fullscreen-btn"
                onClick={toggleFullscreen}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all cursor-pointer touch-manipulation shadow-sm text-xs font-semibold"
                title={isFullscreen ? "Quitter le plein écran" : "Plein écran smartphone (masquer la barre du navigateur)"}
                aria-label="Plein écran smartphone"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden xs:inline">Réduire</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden xs:inline">Plein Écran</span>
                  </>
                )}
              </button>

              {/* Theme Toggle Button (Mode Clair / Mode Sombre) */}
              <button
                id="theme-toggle-btn"
                onClick={toggleTheme}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all border border-slate-700 active:scale-95 cursor-pointer touch-manipulation shadow-sm"
                title={theme === 'dark' ? 'Basculer en Mode Clair' : 'Basculer en Mode Sombre'}
                aria-label="Basculer le mode sombre ou clair"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden xs:inline">Clair</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-sky-500" />
                    <span className="hidden xs:inline">Sombre</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Ligne des Boutons d'Action Supérieurs */}
          <div 
            id="top-action-buttons-group" 
            className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto"
          >
            {/* 1. Bouton de rafraîchissement / synchro */}
            <button
              id="top-refresh-sync-btn"
              onClick={handleRefreshSync}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 border border-slate-700 font-bold text-xs transition-all shadow-sm active:scale-98 cursor-pointer touch-manipulation"
              title="Rafraîchir et synchroniser la flotte"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Rafraîchir / Synchro</span>
            </button>

            {/* 2. Bouton bleu "📊 Rapport" */}
            <button
              id="top-report-btn"
              onClick={() => setIsReportOpen(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs transition-all shadow shadow-blue-950/40 active:scale-98 cursor-pointer touch-manipulation"
              title="Ouvrir le rapport synthétique par chauffeur avec filtre par nombre de jours"
            >
              <BarChart3 className="w-3.5 h-3.5 text-white" />
              <span>📊 Rapport</span>
            </button>

            {/* 4. Bouton bleu "+ Ajouter" : MASQUÉ SUR MOBILE (on utilise le bouton rond + au centre en bas) */}
            <button
              id="top-add-btn"
              onClick={handleOpenAdd}
              className="hidden md:flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs sm:text-sm transition-all shadow shadow-sky-950/40 active:scale-98 cursor-pointer touch-manipulation"
              title="Ajouter une course ou un véhicule"
            >
              <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
              <span>+ Ajouter</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content - Sans espaces perdus, occupant 100% de la largeur */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-2 sm:px-4 py-1.5 sm:py-3">
        
        {/* Welcome Block / PWA Status & Search */}
        <section id="search-section" className="mb-2 sm:mb-3 no-print">
          {/* Main Search & Brand Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            {/* Custom Search bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 pointer-events-none" />
              <input
                id="search-input"
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔎 Rechercher voiture, chauffeur, client..."
                className="w-full pl-9 sm:pl-11 pr-9 py-2 sm:py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 text-sm shadow-inner transition-colors"
              />
              {searchQuery && (
                <button
                  id="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Menu déroulant de filtrage par 'Marque de véhicule' + Tri rapide */}
            <div className="flex items-center gap-1.5 sm:w-64 md:w-72 shrink-0">
              <div className="relative flex-1">
                <Car className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400 pointer-events-none" />
                <select
                  id="brand-filter-select"
                  value={selectedBrandFilter}
                  onChange={(e) => setSelectedBrandFilter(e.target.value)}
                  aria-label="Filtrer par marque de véhicule"
                  className={`w-full pl-8 pr-7 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium border shadow-inner transition-all cursor-pointer appearance-none truncate ${
                    selectedBrandFilter
                      ? 'bg-sky-950/90 border-sky-500 text-sky-200 font-semibold ring-1 ring-sky-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                  title="Filtrer la liste par marque de véhicule"
                >
                  <option value="">🚗 Toutes les marques ({entries.length})</option>
                  
                  {brandsData.fleetBrands.length > 0 && (
                    <optgroup label="── Marques dans votre flotte ──">
                      {brandsData.fleetBrands.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name} ({b.count} course{b.count > 1 ? 's' : ''})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {brandsData.catalogBrands.length > 0 && (
                    <optgroup label="── Autres marques du catalogue ──">
                      {brandsData.catalogBrands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Bouton de Tri alphabétique par marque */}
              <button
                type="button"
                id="brand-sort-toggle-btn"
                onClick={() => {
                  setBrandSortOrder((prev) => (prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none'));
                }}
                className={`h-[38px] sm:h-[42px] px-2.5 rounded-xl border flex items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer touch-manipulation shrink-0 ${
                  brandSortOrder !== 'none'
                    ? 'bg-sky-600 border-sky-500 text-white shadow shadow-sky-950/40'
                    : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={
                  brandSortOrder === 'asc'
                    ? 'Trié par marque (A ➔ Z) — Cliquer pour inverser (Z ➔ A)'
                    : brandSortOrder === 'desc'
                    ? 'Trié par marque (Z ➔ A) — Cliquer pour réinitialiser'
                    : 'Trier la liste par marque de véhicule (A ➔ Z)'
                }
              >
                <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[11px]">
                  {brandSortOrder === 'asc' ? 'A-Z' : brandSortOrder === 'desc' ? 'Z-A' : 'Trier'}
                </span>
              </button>

              {/* Reset filter button if a brand is active */}
              {selectedBrandFilter && (
                <button
                  type="button"
                  id="brand-filter-clear-btn"
                  onClick={() => setSelectedBrandFilter('')}
                  className="h-[38px] sm:h-[42px] px-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer touch-manipulation"
                  title="Réinitialiser le filtre de marque"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Fichier input masqué pour l'import */}
          <input
            type="file"
            ref={importFileRef}
            onChange={handleImportFile}
            accept=".json,.csv"
            className="hidden"
          />

          {/* Barre d'outils unifiée : Compteur + Menu Déroulant Outils (PDF, Imprimer, CSV, JSON, Importer) + Switcher Mode */}
          <div className="mt-2 pt-2 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2">
            
            {/* Gauche : Compteur de courses & Menu Regroupé des Outils */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold text-slate-300 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{filteredEntries.length} course{filteredEntries.length > 1 ? 's' : ''}</span>
              </span>

              {/* Menu Regroupé des Outils */}
              <div className="relative">
                <button
                  id="toggle-tools-menu-btn"
                  type="button"
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation border shadow-sm ${
                    isToolsOpen 
                      ? 'bg-sky-950 border-sky-600 text-sky-300' 
                      : (exportStartDate || exportEndDate)
                      ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Ouvrir les outils : Période d'export, PDF, Impression, CSV..."
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${(exportStartDate || exportEndDate) ? 'text-emerald-300' : 'text-emerald-400'}`} />
                  <span>Outils</span>
                  {(exportStartDate || exportEndDate) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  )}
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isToolsOpen ? 'rotate-180 text-sky-400' : 'text-slate-400'}`} />
                </button>

                {/* Dropdown Menu Regroupé des Outils */}
                {isToolsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setIsToolsOpen(false)}
                    />
                    <div 
                      id="tools-dropdown-menu"
                      className="absolute left-0 mt-2 z-40 w-80 max-w-[calc(100vw-24px)] p-3 rounded-2xl bg-slate-900/98 border border-slate-700 shadow-2xl backdrop-blur-xl flex flex-col gap-2.5 animate-fade-in text-slate-200"
                    >
                      {/* Entête du menu */}
                      <div className="px-1 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Outils & Exportations</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">Filtre Période</span>
                      </div>

                      {/* SECTION SÉLECTION DE PÉRIODE POUR L'EXPORT */}
                      <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/90 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-sky-400" />
                            <span>Période des rapports</span>
                          </span>
                          {(exportStartDate || exportEndDate) && (
                            <button
                              type="button"
                              onClick={() => {
                                setExportStartDate('');
                                setExportEndDate('');
                              }}
                              className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                              title="Réinitialiser la période pour exporter toutes les dates"
                            >
                              Toutes les dates
                            </button>
                          )}
                        </div>

                        {/* Champs Date début & Date fin */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label htmlFor="export-start-date" className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                              Date de début
                            </label>
                            <input
                              id="export-start-date"
                              type="date"
                              value={exportStartDate}
                              onChange={(e) => setExportStartDate(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label htmlFor="export-end-date" className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                              Date de fin
                            </label>
                            <input
                              id="export-end-date"
                              type="date"
                              value={exportEndDate}
                              onChange={(e) => setExportEndDate(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Raccourcis rapides de période */}
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => { setExportStartDate(''); setExportEndDate(''); }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                              !exportStartDate && !exportEndDate
                                ? 'bg-sky-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            Toutes
                          </button>
                          <button
                            type="button"
                            onClick={handlePresetThisMonth}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                          >
                            Ce mois
                          </button>
                          <button
                            type="button"
                            onClick={handlePresetLastMonth}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                          >
                            Mois dernier
                          </button>
                          <button
                            type="button"
                            onClick={handlePresetLast30Days}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                          >
                            30 j
                          </button>
                          <button
                            type="button"
                            onClick={handlePresetLast7Days}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                          >
                            7 j
                          </button>
                        </div>

                        {/* Indicateur dynamique du nombre de courses dans la période */}
                        <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Courses à exporter :</span>
                          <span className={`font-bold ${entriesToExport.length > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {entriesToExport.length} sur {entries.length}
                          </span>
                        </div>
                      </div>

                      {/* BOUTONS D'EXPORTATION */}
                      <div className="flex flex-col gap-1">
                        {/* PDF */}
                        <button
                          id="export-pdf-btn"
                          onClick={() => {
                            handleExportPDF();
                            setIsToolsOpen(false);
                          }}
                          disabled={entriesToExport.length === 0}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer touch-manipulation ${
                            entriesToExport.length === 0
                              ? 'opacity-50 cursor-not-allowed text-slate-500'
                              : 'text-rose-300 hover:bg-rose-950/60 active:bg-rose-900/70'
                          }`}
                        >
                          <FileDown className="w-4 h-4 text-rose-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold flex items-center justify-between">
                              <span>Enregistrer PDF</span>
                              <span className="text-[10px] text-rose-400/90 font-normal">({entriesToExport.length})</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {exportPeriodLabel}
                            </div>
                          </div>
                        </button>

                        {/* Imprimer */}
                        <button
                          id="print-btn"
                          onClick={() => {
                            handlePrint();
                            setIsToolsOpen(false);
                          }}
                          disabled={entriesToExport.length === 0}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer touch-manipulation ${
                            entriesToExport.length === 0
                              ? 'opacity-50 cursor-not-allowed text-slate-500'
                              : 'text-indigo-300 hover:bg-indigo-950/60 active:bg-indigo-900/70'
                          }`}
                        >
                          <Printer className="w-4 h-4 text-indigo-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold flex items-center justify-between">
                              <span>Imprimer</span>
                              <span className="text-[10px] text-indigo-400/90 font-normal">({entriesToExport.length})</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">Aperçu et impression de la période</div>
                          </div>
                        </button>

                        {/* CSV */}
                        <button
                          id="export-csv-btn"
                          onClick={() => {
                            handleExportCSV();
                            setIsToolsOpen(false);
                          }}
                          disabled={entriesToExport.length === 0}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer touch-manipulation ${
                            entriesToExport.length === 0
                              ? 'opacity-50 cursor-not-allowed text-slate-500'
                              : 'text-emerald-300 hover:bg-emerald-950/60 active:bg-emerald-900/70'
                          }`}
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold flex items-center justify-between">
                              <span>Export Excel / CSV</span>
                              <span className="text-[10px] text-emerald-400/90 font-normal">({entriesToExport.length})</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">Fichier tableur filtré par la période</div>
                          </div>
                        </button>
                      </div>

                      <div className="border-t border-slate-800 my-0.5"></div>

                      {/* Importer */}
                      <button
                        onClick={() => {
                          triggerImportFile();
                          setIsToolsOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-950/60 active:bg-amber-900/70 transition-colors text-left cursor-pointer touch-manipulation"
                      >
                        <Upload className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="font-bold">Importer un fichier</div>
                          <div className="text-[10px] text-slate-400">Restaurer fichier CSV ou sauvegarde</div>
                        </div>
                      </button>

                      {entries.length > 0 && (
                        <>
                          <div className="border-t border-slate-800 my-0.5"></div>
                          <button
                            onClick={() => {
                              triggerDeleteAll();
                              setIsToolsOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/60 active:bg-rose-900/70 transition-colors text-left cursor-pointer touch-manipulation"
                          >
                            <Trash className="w-4 h-4 text-rose-400 shrink-0" />
                            <div>
                              <div className="font-bold">Tout effacer</div>
                              <div className="text-[10px] text-rose-400/80">Supprimer toutes les courses</div>
                            </div>
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {(searchQuery || selectedBrandFilter || brandSortOrder !== 'none') && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-sky-400 font-medium">
                    {filteredEntries.length} résultat{filteredEntries.length > 1 ? 's' : ''} sur {entries.length}
                  </span>
                  {selectedBrandFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-950 border border-sky-800/80 text-[11px] font-semibold text-sky-300">
                      <span>Marque : {selectedBrandFilter}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedBrandFilter('')}
                        className="hover:text-white cursor-pointer ml-0.5 p-0.5 rounded hover:bg-sky-900/50"
                        title="Retirer ce filtre"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {brandSortOrder !== 'none' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-semibold text-slate-300">
                      <span>Tri : {brandSortOrder === 'asc' ? 'A ➔ Z' : 'Z ➔ A'}</span>
                      <button
                        type="button"
                        onClick={() => setBrandSortOrder('none')}
                        className="hover:text-white cursor-pointer ml-0.5 p-0.5 rounded hover:bg-slate-800"
                        title="Annuler le tri"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Droite : Switcher Buttons */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800/80 shadow-sm">
              <button
                id="switch-mode-list-btn"
                type="button"
                onClick={() => handleViewModeChange('list')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                  viewMode === 'list'
                    ? 'bg-sky-600 text-white shadow shadow-sky-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="Affichage style tableur dense"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Tableau</span>
              </button>

              <button
                id="switch-mode-grid-btn"
                type="button"
                onClick={() => handleViewModeChange('grid')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                  viewMode === 'grid'
                    ? 'bg-sky-600 text-white shadow shadow-sky-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="Affichage en grille de cartes"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cartes</span>
              </button>
            </div>
          </div>
        </section>

        {/* List of Entries */}
        <section id="rides-section" className="mb-4">
          
          {filteredEntries.length === 0 ? (
            <motion.div 
              key="no-entries-state"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-slate-950/40 rounded-xl sm:rounded-2xl border border-slate-800/60 p-6 sm:p-8 text-center flex flex-col items-center justify-center"
            >
              <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-500">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-slate-300 font-semibold text-base sm:text-lg">Aucune course trouvée</p>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-xs">
                {searchQuery || selectedBrandFilter
                  ? "Essayez d'ajuster vos critères ou d'effacer les filtres."
                  : "Appuyez sur '+ Ajouter' pour ajouter votre premier trajet."}
              </p>
              {(searchQuery || selectedBrandFilter || brandSortOrder !== 'none') && (
                <button
                  id="reset-search-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedBrandFilter('');
                    setBrandSortOrder('none');
                  }}
                  className="mt-3 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Effacer les filtres
                </button>
              )}
            </motion.div>
          ) : viewMode === 'list' ? (
            /* Professional Sheets / PDF Data Table Mode */
            <div id="rides-table-container" className="w-full overflow-x-auto bg-slate-950/60 rounded-xl sm:rounded-2xl border border-slate-800 shadow-xl">
              <div className="px-3 sm:px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200">Tableau Sheets des Courses</span>
                  <span className="text-[11px] text-sky-400 hidden sm:inline">• Cliquez sur une ligne pour ouvrir sa fiche exécutable</span>
                </div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
                  {filteredEntries.length} ligne{filteredEntries.length > 1 ? 's' : ''}
                </span>
              </div>

              <table id="rides-table" className="w-full border-collapse text-left min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider select-none">
                    <th className="py-2.5 px-3 text-center w-12 text-slate-500 font-mono text-[11px]">N°</th>
                    <th className="py-3.5 px-4">Véhicule</th>
                    <th className="py-3.5 px-4">Carburant (DT)</th>
                    <th className="py-3.5 px-4">Dates (Dép. ➔ Ret.)</th>
                    <th className="py-3.5 px-4">Chauffeur</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Notes</th>
                    <th className="py-3.5 px-4 text-right">Fiche & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredEntries.map((entry, index) => (
                    <tr 
                      key={entry.id} 
                      onClick={() => setSelectedEntry(entry)}
                      className="group hover:bg-sky-950/30 active:bg-sky-900/40 cursor-pointer transition-colors even:bg-slate-950/40 odd:bg-slate-900/20"
                      title="Cliquez pour ouvrir la fiche de mission exécutable"
                    >
                      {/* Index */}
                      <td className="py-3.5 px-3 text-center text-slate-500 font-mono text-xs group-hover:text-sky-400 transition-colors">
                        {index + 1}
                      </td>

                      {/* Voiture */}
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-sky-400 shrink-0" />
                            <span className="group-hover:text-sky-300 transition-colors">{entry.voiture}</span>
                          </div>
                          {entry.matricule && (
                            <div className="pl-6">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black text-amber-300 border border-slate-700 font-mono font-bold text-[11px] tracking-wider shadow-sm select-all">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                                {entry.matricule}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Carburant (DT) avec date automatique */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {entry.carburant ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/60 text-amber-300 font-mono font-black text-xs shadow-sm">
                                <Fuel className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>{entry.carburant} DT</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickFuelEntry(entry);
                                  setQuickFuelAmount('');
                                  setQuickFuelNote('');
                                }}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                                title="Ajouter un ravitaillement rapide en DT"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            {entry.dateCarburant && (
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 pt-0.5">
                                <Clock className="w-2.5 h-2.5 text-slate-500" />
                                <span>{entry.dateCarburant}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setQuickFuelEntry(entry);
                              setQuickFuelAmount('');
                              setQuickFuelNote('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-950/50 border border-slate-800 hover:border-amber-700/50 text-slate-400 hover:text-amber-300 text-xs font-semibold transition-all cursor-pointer"
                            title="Ajouter du carburant en DT avec date automatique"
                          >
                            <Fuel className="w-3 h-3 text-amber-400" />
                            <span>+ Carburant</span>
                          </button>
                        )}
                      </td>

                        {/* Dates */}
                        <td className="py-3.5 px-4 text-xs text-slate-300">
                          {entry.dateDepart || entry.dateRetour ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Dép:</span>
                                <span>{entry.dateDepart ? formatDateDisplay(entry.dateDepart) : '—'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Ret:</span>
                                <span>{entry.dateRetour ? formatDateDisplay(entry.dateRetour) : '—'}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600 italic">Non définie</span>
                          )}
                        </td>

                        {/* Chauffeur */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-200 text-xs sm:text-sm">{entry.chauffeurNom}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-slate-400 text-xs">
                                {formatFullPhoneDisplay(entry.chauffeurTel, entry.chauffeurIndicatif)}
                              </span>
                              <a
                                href={getPhoneCallLink(entry.chauffeurTel, entry.chauffeurIndicatif)}
                                title={`Appeler ${entry.chauffeurNom}`}
                                className="p-1 rounded-md bg-sky-950/80 border border-sky-800/50 hover:bg-sky-900 text-sky-400 text-xs transition-colors"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                              <a
                                href={getWhatsAppDriverLink(entry)}
                                target="_blank"
                                rel="noreferrer"
                                title={`WhatsApp ${entry.chauffeurNom}`}
                                className="p-1 rounded-md bg-emerald-950/80 border border-emerald-800/50 hover:bg-emerald-900 text-emerald-400 text-xs transition-colors"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Client */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-200 text-xs sm:text-sm">
                              {entry.clientNom || <span className="text-slate-500 italic text-xs">Non spécifié</span>}
                            </span>
                            {entry.clientTel ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-slate-400 text-xs">
                                  {formatFullPhoneDisplay(entry.clientTel, entry.clientIndicatif)}
                                </span>
                                <a
                                  href={getPhoneCallLink(entry.clientTel, entry.clientIndicatif)}
                                  title={`Appeler ${entry.clientNom || 'le client'}`}
                                  className="p-1 rounded-md bg-sky-950/80 border border-sky-800/50 hover:bg-sky-900 text-sky-400 text-xs transition-colors"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                                <a
                                  href={getWhatsAppClientLink(entry)}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={`WhatsApp ${entry.clientNom || 'le client'}`}
                                  className="p-1 rounded-md bg-emerald-950/80 border border-emerald-800/50 hover:bg-emerald-900 text-emerald-400 text-xs transition-colors"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs italic">Non fourni</span>
                            )}
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="py-3.5 px-4 text-xs text-slate-400 max-w-xs truncate" title={entry.notes}>
                          {entry.notes || <span className="text-slate-600 italic">Aucune note</span>}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedEntry(entry)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-950/80 border border-sky-800/50 hover:bg-sky-900 text-sky-300 text-xs font-bold transition-all cursor-pointer"
                              title="Ouvrir la fiche de mission exécutable"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">Fiche</span>
                            </button>
                            <button
                              onClick={() => handleOpenEdit(entry)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => triggerDelete(entry.id)}
                              className="p-1.5 rounded-lg bg-rose-950/50 border border-rose-900/30 hover:bg-rose-900/80 text-rose-400 hover:text-white transition-colors cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          ) : (
            /* Modern Bento Cards Grid Mode */
            <motion.div 
              id="rides-grid-list" 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 w-full"
            >
              <AnimatePresence mode="popLayout">
                {filteredEntries.map((entry, index) => {
                  const duration = calculateTripDuration(entry.dateDepart, entry.dateRetour);
                  return (
                    <motion.div 
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 14, scale: 0.94, transition: { duration: 0.18 } }}
                      transition={{
                        duration: 0.3,
                        delay: Math.min(index * 0.035, 0.28),
                        ease: [0.22, 1, 0.36, 1],
                        layout: { duration: 0.28, ease: 'easeOut' }
                      }}
                      whileHover={{ y: -2, transition: { duration: 0.18 } }}
                      className="bg-slate-950/80 border border-slate-800/90 hover:border-sky-500/40 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col justify-between gap-2.5 sm:gap-3.5 transition-colors group w-full"
                    >
                      {/* Card Header: Clickable to open executable details */}
                    <div 
                      onClick={() => setSelectedEntry(entry)}
                      className="flex items-center justify-between border-b border-slate-800/80 pb-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800/50 flex items-center justify-center text-sky-400 group-hover:bg-sky-900 group-hover:text-white transition-colors">
                          <Car className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <span className="font-extrabold text-white text-sm sm:text-base leading-tight block group-hover:text-sky-300 transition-colors">
                            {entry.voiture}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {entry.matricule && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black text-amber-300 border border-slate-700 font-mono font-bold text-[10px] tracking-wider select-all shadow-sm">
                                <span className="w-1 h-1 rounded-full bg-red-600"></span>
                                {entry.matricule}
                              </span>
                            )}
                            {duration && (
                              <span className="text-[10px] text-emerald-400 font-semibold">
                                {duration}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEntry(entry);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/80 border border-sky-800/60 hover:bg-sky-900 text-sky-300 text-xs font-bold transition-all cursor-pointer touch-manipulation"
                        title="Ouvrir la fiche de mission exécutable"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Fiche</span>
                      </button>
                    </div>

                    {/* Fuel (DT) Bar with quick add & automatic date */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickFuelEntry(entry);
                        setQuickFuelAmount('');
                        setQuickFuelNote('');
                      }}
                      className="bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-amber-500/50 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs transition-all cursor-pointer group/fuel"
                      title="Gérer le carburant en DT (date automatique)"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 group-hover/fuel:scale-105 transition-transform">
                          <Fuel className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Carburant</span>
                          {entry.carburant ? (
                            <span className="font-mono font-black text-amber-300 text-xs">
                              {entry.carburant} DT
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Non renseigné</span>
                          )}
                        </div>
                      </div>

                      {entry.dateCarburant ? (
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-semibold text-slate-500 block">Ajouté le</span>
                          <span className="text-[10px] font-mono text-slate-300">{entry.dateCarburant}</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-950/70 border border-amber-800/50 text-amber-300 text-[10px] font-bold">
                          + Ajouter DT
                        </span>
                      )}
                    </div>

                    {/* Dates Bar */}
                    {(entry.dateDepart || entry.dateRetour) && (
                      <div 
                        onClick={() => setSelectedEntry(entry)}
                        className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-slate-900/80 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">Dép.</span>
                            <span className="font-semibold text-slate-200 text-xs">
                              {entry.dateDepart ? formatDateDisplay(entry.dateDepart) : '—'}
                            </span>
                          </div>
                        </div>

                        <span className="text-slate-600 font-bold text-xs">➔</span>

                        <div className="flex items-center gap-1.5 text-right">
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">Ret.</span>
                            <span className="font-semibold text-slate-200 text-xs">
                              {entry.dateRetour ? formatDateDisplay(entry.dateRetour) : '—'}
                            </span>
                          </div>
                          <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        </div>
                      </div>
                    )}

                    {/* Chauffeur row with direct executable buttons */}
                    <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>CHAUFFEUR</span>
                        </div>
                        <span className="text-xs font-bold text-slate-200 truncate max-w-[140px]">{entry.chauffeurNom}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-slate-800/40 pt-2">
                        <span className="font-mono text-xs text-slate-300">
                          {formatFullPhoneDisplay(entry.chauffeurTel, entry.chauffeurIndicatif)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={getPhoneCallLink(entry.chauffeurTel, entry.chauffeurIndicatif)}
                            title={`Appeler ${entry.chauffeurNom}`}
                            className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white transition-all cursor-pointer touch-manipulation"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={getWhatsAppDriverLink(entry)}
                            target="_blank"
                            rel="noreferrer"
                            title={`WhatsApp ${entry.chauffeurNom}`}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-all cursor-pointer touch-manipulation"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Client row with direct executable buttons */}
                    <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>CLIENT</span>
                        </div>
                        <span className="text-xs font-bold text-slate-200 truncate max-w-[140px]">
                          {entry.clientNom || <span className="text-slate-500 italic font-normal text-[11px]">Non spécifié</span>}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-slate-800/40 pt-2">
                        {entry.clientTel ? (
                          <>
                            <span className="font-mono text-xs text-slate-300">
                              {formatFullPhoneDisplay(entry.clientTel, entry.clientIndicatif)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <a
                                href={getPhoneCallLink(entry.clientTel, entry.clientIndicatif)}
                                title={`Appeler ${entry.clientNom || 'le client'}`}
                                className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white transition-all cursor-pointer touch-manipulation"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={getWhatsAppClientLink(entry)}
                                target="_blank"
                                rel="noreferrer"
                                title={`WhatsApp ${entry.clientNom || 'le client'}`}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-all cursor-pointer touch-manipulation"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </>
                        ) : (
                          <span className="text-xs italic text-slate-500">Non fourni</span>
                        )}
                      </div>
                    </div>

                    {/* Notes snippet */}
                    {entry.notes && (
                      <div 
                        onClick={() => setSelectedEntry(entry)}
                        className="bg-slate-900/30 border border-slate-800/40 rounded-xl p-2.5 flex items-start gap-1.5 text-xs text-slate-400 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <p className="line-clamp-2">{entry.notes}</p>
                      </div>
                    )}

                    {/* Card Footer: Details button + edit/delete */}
                    <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between">
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>Détails & Actions</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(entry)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => triggerDelete(entry.id)}
                          className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-900/30 hover:bg-rose-900/70 text-rose-400 hover:text-white transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        </section>
      </main>

      {/* 3. Footer Branding / Instructions for large screen */}
      <footer className="w-full text-center py-6 border-t border-slate-800 bg-slate-950/20 text-xs text-slate-500 max-w-5xl mx-auto px-4">
        <p>© 2026 Gestion Voitures. PWA installable et utilisable hors connexion.</p>
        <p className="mt-1">Optimisé pour Android Chrome et iOS Safari.</p>
      </footer>

      {/* 3.5. Executable Details Modal (Fiche de Mission Interactive) */}
      {selectedEntry && (
        <div 
          id="executable-details-overlay" 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4"
          onClick={() => setSelectedEntry(null)}
        >
          <div 
            id="executable-details-container"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col animate-slide-up"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-800/60 flex items-center justify-center text-sky-400">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block">FICHE DE COURSE EXÉCUTABLE</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-white leading-tight">{selectedEntry.voiture}</h3>
                    {selectedEntry.matricule && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-black text-amber-300 border border-slate-700 font-mono font-bold text-xs tracking-wider shadow-sm select-all">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                        {selectedEntry.matricule}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedEntry(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              
              {/* Trip Dates & Duration Banner */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Planning de la Course</span>
                  </div>
                  {calculateTripDuration(selectedEntry.dateDepart, selectedEntry.dateRetour) && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-xs font-bold">
                      <Clock className="w-3 h-3" />
                      {calculateTripDuration(selectedEntry.dateDepart, selectedEntry.dateRetour)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Date & Heure de Départ</span>
                    <span className="text-sm font-semibold text-slate-100">
                      {selectedEntry.dateDepart ? formatDateDisplay(selectedEntry.dateDepart) : 'Non définie'}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Date & Heure de Retour</span>
                    <span className="text-sm font-semibold text-slate-100">
                      {selectedEntry.dateRetour ? formatDateDisplay(selectedEntry.dateRetour) : 'Non définie'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SUIVI DU CARBURANT (DT) & DATE AUTOMATIQUE */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800/60 flex items-center justify-center text-amber-400">
                      <Fuel className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">CARBURANT EN DINARS (DT)</span>
                      <div className="flex items-center gap-2">
                        {selectedEntry.carburant ? (
                          <span className="text-base sm:text-lg font-black text-amber-300 font-mono">
                            {selectedEntry.carburant} DT
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-slate-400 italic">Non renseigné</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickFuelEntry(selectedEntry);
                      setQuickFuelAmount('');
                      setQuickFuelNote('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer touch-manipulation"
                    title="Ajouter un ravitaillement de carburant en DT"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Ravitaillement</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Dernier ajout enregistré :</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {selectedEntry.dateCarburant || 'Aucune date'}
                  </span>
                </div>

                {/* Historique des ravitaillements si disponible */}
                {selectedEntry.carburantHistorique && selectedEntry.carburantHistorique.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/60 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Historique des ajouts de carburant ({selectedEntry.carburantHistorique.length}) :
                    </span>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {selectedEntry.carburantHistorique.map((rec) => (
                        <div key={rec.id} className="flex items-center justify-between bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-amber-300">+{rec.montant} DT</span>
                            {rec.note && <span className="text-slate-400 text-[11px]">({rec.note})</span>}
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">{rec.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Executable Chauffeur Card */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800/60 flex items-center justify-center text-sky-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CHAUFFEUR</span>
                      <span className="text-sm sm:text-base font-bold text-white">{selectedEntry.chauffeurNom}</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {formatFullPhoneDisplay(selectedEntry.chauffeurTel, selectedEntry.chauffeurIndicatif)}
                  </span>
                </div>

                {/* Executable action buttons for Chauffeur */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <a
                    href={getPhoneCallLink(selectedEntry.chauffeurTel, selectedEntry.chauffeurIndicatif)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-md transition-all touch-manipulation"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Appeler</span>
                  </a>
                  <a
                    href={getWhatsAppDriverLink(selectedEntry)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all touch-manipulation"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <button
                    onClick={() => copyToClipboard(formatFullPhoneDisplay(selectedEntry.chauffeurTel, selectedEntry.chauffeurIndicatif), 'Numéro Chauffeur')}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer touch-manipulation"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier Tél</span>
                  </button>
                </div>
              </div>

              {/* Executable Client Card */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-800/60 flex items-center justify-center text-teal-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CLIENT</span>
                      <span className="text-sm sm:text-base font-bold text-white">
                        {selectedEntry.clientNom || <span className="text-slate-400 italic font-normal">Non spécifié</span>}
                      </span>
                    </div>
                  </div>
                  {selectedEntry.clientTel ? (
                    <span className="font-mono text-xs font-semibold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {formatFullPhoneDisplay(selectedEntry.clientTel, selectedEntry.clientIndicatif)}
                    </span>
                  ) : (
                    <span className="text-xs italic text-slate-500">Non communiqué</span>
                  )}
                </div>

                {/* Executable action buttons for Client */}
                {selectedEntry.clientTel && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <a
                      href={getPhoneCallLink(selectedEntry.clientTel, selectedEntry.clientIndicatif)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-md transition-all touch-manipulation"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Appeler</span>
                    </a>
                    <a
                      href={getWhatsAppClientLink(selectedEntry)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all touch-manipulation"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                    <button
                      onClick={() => copyToClipboard(formatFullPhoneDisplay(selectedEntry.clientTel, selectedEntry.clientIndicatif), 'Numéro Client')}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer touch-manipulation"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier Tél</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Notes Card */}
              {selectedEntry.notes && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Instructions & Notes</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 whitespace-pre-wrap">
                    {selectedEntry.notes}
                  </p>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleExportSinglePDF(selectedEntry)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer touch-manipulation"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>PDF Course</span>
                  </button>

                  <button
                    onClick={() => handleShareEntry(selectedEntry)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 active:bg-sky-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer touch-manipulation"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Partager</span>
                  </button>
                </div>

                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    onClick={() => {
                      const toEdit = selectedEntry;
                      setSelectedEntry(null);
                      handleOpenEdit(toEdit);
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>

                  <button
                    onClick={() => {
                      const idToDelete = selectedEntry.id;
                      setSelectedEntry(null);
                      triggerDelete(idToDelete);
                    }}
                    className="flex items-center justify-center p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/30 hover:bg-rose-900/70 text-rose-400 hover:text-white transition-colors cursor-pointer"
                    title="Supprimer la course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 4. Form Overlay Modal (Add / Edit) */}
      {isFormOpen && (
        <div id="form-modal-overlay" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <div 
            id="form-modal-container"
            className="w-full sm:max-w-xl max-h-[92vh] sm:max-h-[85vh] overflow-y-auto bg-[#0b1329] border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col animate-slide-up"
          >
            {/* Modal Header */}
            <header className="sticky top-0 bg-[#0b1329]/95 backdrop-blur border-b border-slate-800 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">FICHE VÉHICULE</p>
                <h3 className="text-lg font-extrabold text-white">
                  {currentEntryId ? 'Modifier l\'entrée' : 'Ajouter une entrée'}
                </h3>
              </div>
              <button
                id="close-form-btn"
                onClick={() => setIsFormOpen(false)}
                className="p-2.5 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-400 cursor-pointer touch-manipulation flex items-center justify-center"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Modal Body / Form */}
            <form id="vehicle-form" onSubmit={handleSaveEntry} className="p-5 flex-1 space-y-6">
              
              {/* VÉHICULE SECTION */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 w-full border-b border-slate-800/80 pb-1.5 mb-2">
                  <Car className="w-3.5 h-3.5 text-sky-400" />
                  <span>VÉHICULE</span>
                </legend>
                
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                  {/* Brand select */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="form-brand" className="text-xs font-semibold text-slate-300">Marque</label>
                    <div className="relative">
                      <select
                        id="form-brand"
                        value={formBrand}
                        onChange={handleBrandChange}
                        className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500 text-sm cursor-pointer appearance-none"
                        style={{ minHeight: '44px' }}
                      >
                        <option value="">Choisir une marque</option>
                        {carSuggestions.map((item) => (
                          <option key={item.brand} value={item.brand}>
                            {item.brand}
                          </option>
                        ))}
                        <option value="__custom_brand__" className="text-sky-400 font-bold">➕ Ajouter Marque & Modèle...</option>
                        <option value="Autre / Custom">Autre / Saisie libre</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Model select / suggest */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="form-model" className="text-xs font-semibold text-slate-300">Modèle / voiture</label>
                    <div className="relative">
                      <select
                        id="form-model"
                        value={formModel}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormModel(val);
                          if (val === '__custom_model__') {
                            setShowCustomFields(true);
                          } else if (formBrand !== '__custom_brand__') {
                            setShowCustomFields(false);
                          }
                        }}
                        disabled={!formBrand || formBrand === 'Autre / Custom' || formBrand === '__custom_brand__'}
                        className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-sky-500 text-sm appearance-none"
                        style={{ minHeight: '44px' }}
                      >
                        <option value="">
                          {formBrand === '__custom_brand__' 
                            ? "Saisir ci-dessous" 
                            : !formBrand 
                            ? "Choisir d'abord une marque" 
                            : "Choisir un modèle"}
                        </option>
                        {formBrand && formBrand !== 'Autre / Custom' && formBrand !== '__custom_brand__' && (
                          <>
                            {carSuggestions.find(item => item.brand === formBrand)?.models.map((mod) => (
                              <option key={mod} value={mod}>
                                {mod}
                              </option>
                            ))}
                            <option value="__custom_model__" className="text-sky-400 font-bold">➕ Ajouter un Modèle personnalisé...</option>
                          </>
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* DYNAMIC NEW BRAND & MODEL INPUT FIELDSET */}
                {(formBrand === '__custom_brand__' || formModel === '__custom_model__' || showCustomFields) && (
                  <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-800/40 space-y-3.5 animate-fade-in no-print">
                    <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold">
                      <Plus className="w-4 h-4" />
                      <span>AJOUTER MARQUE / MODÈLE À LA LISTE</span>
                    </div>

                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                      {/* Custom Brand input */}
                      {formBrand === '__custom_brand__' ? (
                        <div className="flex flex-col gap-1">
                          <label htmlFor="custom-brand-input" className="text-[10px] font-bold text-slate-400">Marque personnalisée</label>
                          <input
                            id="custom-brand-input"
                            type="text"
                            value={customBrandInput}
                            onChange={(e) => setCustomBrandInput(e.target.value)}
                            placeholder="Ex. Isuzu, Mercedes, BMW..."
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400">Marque sélectionnée</label>
                          <div className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold">
                            {formBrand}
                          </div>
                        </div>
                      )}

                      {/* Custom Model input */}
                      <div className="flex flex-col gap-1">
                        <label htmlFor="custom-model-input" className="text-[10px] font-bold text-slate-400">Modèle personnalisé</label>
                        <input
                          id="custom-model-input"
                          type="text"
                          value={customModelInput}
                          onChange={(e) => setCustomModelInput(e.target.value)}
                          placeholder="Ex. D-Max, Classe C, Golf 8..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      💡 En enregistrant ce trajet, cette marque et ce modèle seront conservés et consultables dans votre menu déroulant !
                    </p>
                  </div>
                )}

                {/* Autre/Custom input text */}
                {formBrand === 'Autre / Custom' && (
                  <div className="flex flex-col gap-1.5 mt-2 animate-fade-in">
                    <label htmlFor="form-custom-voiture" className="text-xs font-semibold text-slate-300">
                      Saisir le nom du véhicule
                    </label>
                    <input
                      id="form-custom-voiture"
                      type="text"
                      value={formCustomVoiture}
                      onChange={(e) => setFormCustomVoiture(e.target.value)}
                      placeholder="Ex. Peugeot 208, Isuzu D-Max..."
                      className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
                      style={{ minHeight: '44px' }}
                    />
                  </div>
                )}

                {/* Matricule Tunisien intelligent (Auto-format) & Contrôle d'unicité par véhicule */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="form-matricule" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <span>Matricule (Immatriculation TN)</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Optionnel)</span>
                    </label>
                    {formMatricule && !matriculeConflict?.isDifferentCar && (
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Format Tunisie
                      </span>
                    )}
                    {matriculeConflict?.isDifferentCar && (
                      <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Conflit véhicule
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1">
                      <input
                        id="form-matricule"
                        type="text"
                        value={formMatricule}
                        onChange={handleMatriculeChange}
                        onKeyDown={handleMatriculeKeyDown}
                        placeholder="Ex. 1234 TU 258 ou 123 TU 258"
                        maxLength={13}
                        className={`w-full px-3.5 py-3 rounded-xl bg-slate-900 border font-mono tracking-wider font-semibold placeholder-slate-500 text-sm transition-colors ${
                          matriculeConflict?.isDifferentCar
                            ? 'border-rose-500 text-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-500'
                            : 'border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500'
                        }`}
                        style={{ minHeight: '44px' }}
                      />
                    </div>

                    {/* Plaque d'immatriculation tunisienne en direct */}
                    {formMatricule ? (
                      <div 
                        className={`flex items-center justify-center gap-2.5 px-3.5 py-2 rounded-xl bg-black border-2 text-white font-mono font-black text-sm tracking-widest shadow-md select-none shrink-0 ${
                          matriculeConflict?.isDifferentCar ? 'border-rose-600' : 'border-slate-700'
                        }`}
                        title={matriculeConflict?.isDifferentCar ? 'Immatriculation déjà utilisée par un autre véhicule' : 'Aperçu de la plaque tunisienne'}
                      >
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shadow-sm"></span>
                          <span className="text-[10px] text-slate-400 font-sans font-extrabold tracking-normal">TN</span>
                        </div>
                        <span className={matriculeConflict?.isDifferentCar ? 'text-rose-400 drop-shadow-sm line-through' : 'text-amber-300 drop-shadow-sm'}>
                          {formMatricule}
                        </span>
                      </div>
                    ) : (
                      <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-400 text-xs shrink-0 select-none">
                        <span className="font-mono text-slate-400 font-bold">🇹🇳 Ex. 1234 TU 258</span>
                      </div>
                    )}
                  </div>

                  {/* ALERTE CONFLIT : INTERDIT D'ATTRIBUER LE MÊME MATRICULE À DEUX VÉHICULES */}
                  {matriculeConflict?.isDifferentCar && (
                    <div 
                      role="alert"
                      className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-950/80 border border-rose-600/80 text-rose-200 text-xs animate-fade-in"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold text-rose-300">
                          Attribution interdite : Immatriculation déjà enregistrée
                        </div>
                        <p className="text-[11px] text-rose-200/90 leading-relaxed">
                          Le matricule <strong className="font-mono text-white underline">{matriculeConflict.matricule}</strong> est déjà attribué au véhicule <strong className="text-white">« {matriculeConflict.existingVoiture} »</strong>.
                          <br />
                          <span className="font-semibold text-rose-300">Il est strictement interdit de donner la même immatriculation à deux véhicules différents.</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* PROPOSITION AUTOMATIQUE DU MATRICULE EXISTANT POUR CE VÉHICULE */}
                  {knownMatriculeForCurrentCar && !formMatricule && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setFormMatricule(knownMatriculeForCurrentCar)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/80 border border-sky-800 hover:bg-sky-900 text-sky-300 text-xs font-semibold transition-all cursor-pointer touch-manipulation active:scale-95"
                        title="Remplir automatiquement le matricule officiel de ce véhicule"
                      >
                        <Car className="w-3.5 h-3.5 text-sky-400" />
                        <span>Matricule officiel de ce véhicule :</span>
                        <span className="font-mono font-bold text-white bg-slate-900 px-1.5 py-0.2 rounded border border-slate-700">
                          {knownMatriculeForCurrentCar}
                        </span>
                        <span className="text-[10px] text-sky-400 underline font-normal">Appliquer</span>
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 leading-tight">
                    💡 <strong className="text-slate-300">Formatage automatique :</strong> tapez 4 chiffres et le système ajoute automatiquement <span className="text-sky-400 font-mono font-bold">TU</span>. Ou tapez 1, 2 ou 3 chiffres puis appuyez sur <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">Espace</kbd> pour insérer <span className="text-sky-400 font-mono font-bold">TU</span> et terminez par les 3 chiffres (ex: <code className="text-sky-300">1234 TU 258</code> ou <code className="text-sky-300">123 TU 258</code>).
                  </p>
                </div>
              </fieldset>

              {/* CHAUFFEUR SECTION */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 w-full border-b border-slate-800/80 pb-1.5 mb-2">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>CHAUFFEUR</span>
                </legend>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="form-chauffeur-nom" className="text-xs font-semibold text-slate-300">Nom du chauffeur</label>
                    <input
                      id="form-chauffeur-nom"
                      type="text"
                      value={formChauffeurNom}
                      onChange={(e) => setFormChauffeurNom(e.target.value)}
                      placeholder="Ex. Mohamed"
                      required
                      className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
                      style={{ minHeight: '44px' }}
                    />
                  </div>

                  {/* Phone with Indicatif */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="form-chauffeur-tel" className="text-xs font-semibold text-slate-300">
                      Téléphone du chauffeur
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Indicatif Selector */}
                      <div className="flex items-center gap-1">
                        <select
                          id="form-chauffeur-indicatif-select"
                          value={isChauffeurCustomIndicatif ? 'custom' : formChauffeurIndicatif}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setIsChauffeurCustomIndicatif(true);
                            } else {
                              setIsChauffeurCustomIndicatif(false);
                              setFormChauffeurIndicatif(e.target.value);
                            }
                          }}
                          className="px-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                          style={{ minHeight: '44px' }}
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.label} ({c.code})
                            </option>
                          ))}
                        </select>

                        {/* Editable custom indicatif */}
                        {isChauffeurCustomIndicatif && (
                          <input
                            id="form-chauffeur-indicatif-custom"
                            type="text"
                            value={formChauffeurIndicatif}
                            onChange={(e) => setFormChauffeurIndicatif(e.target.value)}
                            placeholder="+216"
                            className="w-20 px-2.5 py-3 rounded-xl bg-slate-950 border border-sky-600 text-sky-300 text-xs font-mono font-bold focus:outline-none"
                            style={{ minHeight: '44px' }}
                          />
                        )}
                      </div>

                      {/* Number Input */}
                      <input
                        id="form-chauffeur-tel"
                        type="tel"
                        inputMode="numeric"
                        value={formChauffeurTel}
                        onChange={(e) => setFormChauffeurTel(e.target.value)}
                        placeholder="22 123 456"
                        required
                        className="flex-1 px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm font-mono font-semibold"
                        style={{ minHeight: '44px' }}
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* CLIENT SECTION (OPTIONNEL) */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between w-full border-b border-slate-800/80 pb-1.5 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>CLIENT</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold normal-case">Optionnel / Facultatif</span>
                </legend>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="form-client-nom" className="text-xs font-semibold text-slate-300">
                      Nom du client <span className="text-[10px] text-slate-500 font-normal">(facultatif)</span>
                    </label>
                    <input
                      id="form-client-nom"
                      type="text"
                      value={formClientNom}
                      onChange={(e) => setFormClientNom(e.target.value)}
                      placeholder="Ex. Ahmed (facultatif)"
                      className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
                      style={{ minHeight: '44px' }}
                    />
                  </div>

                  {/* Phone with Indicatif */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="form-client-tel" className="text-xs font-semibold text-slate-300">
                      Téléphone du client <span className="text-[10px] text-slate-500 font-normal">(facultatif)</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Indicatif Selector */}
                      <div className="flex items-center gap-1">
                        <select
                          id="form-client-indicatif-select"
                          value={isClientCustomIndicatif ? 'custom' : formClientIndicatif}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setIsClientCustomIndicatif(true);
                            } else {
                              setIsClientCustomIndicatif(false);
                              setFormClientIndicatif(e.target.value);
                            }
                          }}
                          className="px-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                          style={{ minHeight: '44px' }}
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.label} ({c.code})
                            </option>
                          ))}
                        </select>

                        {/* Editable custom indicatif */}
                        {isClientCustomIndicatif && (
                          <input
                            id="form-client-indicatif-custom"
                            type="text"
                            value={formClientIndicatif}
                            onChange={(e) => setFormClientIndicatif(e.target.value)}
                            placeholder="+216"
                            className="w-20 px-2.5 py-3 rounded-xl bg-slate-950 border border-sky-600 text-sky-300 text-xs font-mono font-bold focus:outline-none"
                            style={{ minHeight: '44px' }}
                          />
                        )}
                      </div>

                      {/* Number Input */}
                      <input
                        id="form-client-tel"
                        type="tel"
                        inputMode="numeric"
                        value={formClientTel}
                        onChange={(e) => setFormClientTel(e.target.value)}
                        placeholder="98 654 321 (facultatif)"
                        className="flex-1 px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm font-mono font-semibold"
                        style={{ minHeight: '44px' }}
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* MISSION, CALENDRIER & NOTES SECTION (OPTIONNEL) */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between w-full border-b border-slate-800/80 pb-1.5 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    <span>MISSION & DATES (MODE CALENDRIER)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold normal-case">Optionnel / Facultatif</span>
                </legend>

                {/* Dates Depart / Retour */}
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                  {/* Date Depart */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="form-date-depart" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Date de départ (Calendrier)</span>
                    </label>
                    <input
                      id="form-date-depart"
                      type="date"
                      value={formDateDepart}
                      onChange={(e) => setFormDateDepart(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500 text-sm cursor-pointer"
                      style={{ minHeight: '44px', colorScheme: 'dark' }}
                    />
                  </div>

                  {/* Date Retour */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="form-date-retour" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Date de retour (Calendrier)</span>
                    </label>
                    <input
                      id="form-date-retour"
                      type="date"
                      value={formDateRetour}
                      min={formDateDepart || undefined}
                      onChange={(e) => setFormDateRetour(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500 text-sm cursor-pointer"
                      style={{ minHeight: '44px', colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                {/* CARBURANT EN DT & DATE AUTOMATIQUE */}
                <div className="pt-2 border-t border-slate-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                      <Fuel className="w-3.5 h-3.5" />
                      <span>Carburant (DT) & Date d'ajout automatique</span>
                    </div>
                    <span className="text-[10px] text-amber-300 font-semibold bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full">
                      Dinars Tunisiens (DT)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                    {/* Montant Carburant */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="form-carburant" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Montant de carburant</span>
                        <span className="text-[10px] text-amber-400 font-bold">En DT</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="form-carburant"
                          type="number"
                          step="0.001"
                          min="0"
                          value={formCarburant}
                          onChange={handleCarburantChange}
                          placeholder="Ex. 50 ou 80"
                          className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono font-bold text-sm pr-14"
                          style={{ minHeight: '44px' }}
                        />
                        <div className="absolute right-2 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/50 text-amber-400 font-extrabold text-xs select-none">
                          DT
                        </div>
                      </div>
                    </div>

                    {/* Date d'ajout automatique */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="form-date-carburant" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          <span>Date d'ajout</span>
                        </label>
                        {formDateCarburant && (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" />
                            <span>Auto</span>
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <input
                          id="form-date-carburant"
                          type="text"
                          value={formDateCarburant}
                          onChange={(e) => setFormDateCarburant(e.target.value)}
                          placeholder="Générée auto lors de la saisie"
                          className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500 pr-24"
                          style={{ minHeight: '44px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormDateCarburant(getAutomaticCurrentDateTime())}
                          className="absolute right-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Actualiser à la date et heure courantes"
                        >
                          Maintenant
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-tight">
                    ⚡ <strong className="text-slate-300">Automatique :</strong> chaque fois que vous tapez ou modifiez le montant en DT, la date et l'heure du jour sont automatiquement enregistrées.
                  </p>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="form-notes" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Notes / Informations complémentaires</span>
                  </label>
                  <textarea
                    id="form-notes"
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Ex. Départ à 08:00 de l'Aéroport de Tunis-Carthage, retour prévu dimanche..."
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm leading-relaxed"
                  />
                </div>
              </fieldset>

              {/* Modal Footer actions */}
              <footer className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/60 mt-6">
                <button
                  id="cancel-form-btn"
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-3.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 font-bold text-sm cursor-pointer active:scale-98 transition-all touch-manipulation"
                  style={{ minHeight: '44px', minWidth: '100px' }}
                >
                  Annuler
                </button>
                <button
                  id="submit-form-btn"
                  type="submit"
                  disabled={Boolean(matriculeConflict?.isDifferentCar)}
                  className={`px-6 py-3.5 rounded-xl font-bold text-sm shadow transition-all touch-manipulation ${
                    matriculeConflict?.isDifferentCar
                      ? 'bg-rose-950/70 border border-rose-800/80 text-rose-300 opacity-60 cursor-not-allowed shadow-none'
                      : 'bg-sky-600 hover:bg-sky-500 active:scale-98 text-white shadow-sky-950/50 cursor-pointer'
                  }`}
                  title={matriculeConflict?.isDifferentCar ? "Action interdite : Cette immatriculation est déjà attribuée à un autre véhicule" : undefined}
                  style={{ minHeight: '44px', minWidth: '120px' }}
                >
                  {currentEntryId ? 'Enregistrer les modifications' : 'Enregistrer'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* 5. Deletion Confirmation Modal */}
      {isDeleteOpen && (
        <div id="delete-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div 
            id="delete-modal-container"
            className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col gap-5 text-center animate-fade-in"
          >
            <div className="w-12 h-12 rounded-full bg-rose-950/50 border border-rose-900/50 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-white">Supprimer l'entrée ?</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                « Voulez-vous vraiment supprimer cette entrée ? » Cette action est irréversible.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="cancel-delete-btn"
                onClick={() => {
                  setIsDeleteOpen(false);
                  setDeleteTargetId(null);
                }}
                className="w-full py-3 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer active:scale-98 transition-all touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                Annuler
              </button>
              <button
                id="confirm-delete-btn"
                onClick={confirmDelete}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer active:scale-98 transition-all touch-manipulation shadow shadow-rose-950/40"
                style={{ minHeight: '44px' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.5. Quick Fuel Modal (Ravitaillement Rapide en DT avec Date Automatique) */}
      {quickFuelEntry && (
        <div 
          id="quick-fuel-modal-overlay" 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setQuickFuelEntry(null)}
        >
          <div 
            id="quick-fuel-modal"
            className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-800/60 flex items-center justify-center text-amber-400">
                  <Fuel className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Ajout Carburant (DT)</h3>
                  <p className="text-xs text-slate-400">
                    {quickFuelEntry.voiture} {quickFuelEntry.matricule ? `[${quickFuelEntry.matricule}]` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickFuelEntry(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuickFuel} className="p-5 space-y-4">
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-3 text-xs text-amber-200/90 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-300">Horodatage automatique :</span>
                  <span>Date & heure de l'ajout enregistrées automatiquement : <code className="text-amber-400 font-mono font-bold">{getAutomaticCurrentDateTime()}</code></span>
                </div>
              </div>

              {/* Montant */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="quick-fuel-input" className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span>Montant de carburant à ajouter</span>
                  <span className="text-amber-400 font-bold">En Dinars Tunisiens (DT)</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="quick-fuel-input"
                    type="number"
                    step="0.001"
                    min="1"
                    autoFocus
                    required
                    value={quickFuelAmount}
                    onChange={(e) => setQuickFuelAmount(e.target.value)}
                    placeholder="Ex. 50 ou 80"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono font-bold text-lg pr-14"
                    style={{ minHeight: '48px' }}
                  />
                  <div className="absolute right-3 px-2 py-1 rounded-md bg-amber-950 border border-amber-800/60 text-amber-400 font-black text-xs select-none">
                    DT
                  </div>
                </div>
                {quickFuelEntry.carburant ? (
                  <span className="text-[11px] text-slate-400">
                    Carburant actuel : <strong className="text-slate-200 font-mono">{quickFuelEntry.carburant} DT</strong> ➔ Nouveau total : <strong className="text-amber-300 font-mono">{Math.round(((quickFuelEntry.carburant || 0) + (parseFloat(quickFuelAmount.replace(',', '.')) || 0)) * 1000) / 1000} DT</strong>
                  </span>
                ) : null}
              </div>

              {/* Note optionnelle */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="quick-fuel-note" className="text-xs font-semibold text-slate-300">
                  Note / Station-service <span className="text-slate-500 font-normal">(Optionnel)</span>
                </label>
                <input
                  id="quick-fuel-note"
                  type="text"
                  value={quickFuelNote}
                  onChange={(e) => setQuickFuelNote(e.target.value)}
                  placeholder="Ex. Station Agil Ennasr, plein complet..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setQuickFuelEntry(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-lg transition-all cursor-pointer"
                >
                  <Fuel className="w-3.5 h-3.5" />
                  <span>Enregistrer le carburant</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Phone Installation Guide Dialog */}
      {showInstallGuide && (
        <div id="install-guide-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
              <ArrowDownToLine className="w-6 h-6 animate-bounce" />
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-extrabold text-white">Ajouter comme application au téléphone</h3>
              <p className="text-slate-400 text-xs leading-relaxed text-left">
                Installez <strong>Gestion Voitures</strong> sur l'écran d'accueil de votre smartphone pour une utilisation rapide, plein écran et sans connexion :
              </p>

              {/* Android instructions */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-left space-y-1.5">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>📱 Sur Android (Google Chrome)</span>
                </div>
                <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside pl-1">
                  <li>Appuyez sur les <strong>3 points verticaux (⋮)</strong> en haut à droite du navigateur.</li>
                  <li>Sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</li>
                  <li>Confirmez l'installation sur votre téléphone.</li>
                </ol>
              </div>

              {/* iOS instructions */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-left space-y-1.5">
                <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <span>🍏 Sur iPhone / iPad (Safari)</span>
                </div>
                <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside pl-1">
                  <li>Appuyez sur le bouton <strong>Partager</strong> (icône carré avec une flèche vers le haut).</li>
                  <li>Faites défiler vers le bas et appuyez sur <strong>« Sur l'écran d'accueil »</strong>.</li>
                  <li>Appuyez sur <strong>« Ajouter »</strong> en haut à droite.</li>
                </ol>
              </div>
            </div>

            <button
              id="close-install-guide-btn"
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs cursor-pointer active:scale-98 transition-all touch-manipulation shadow-md shadow-emerald-950/40"
              style={{ minHeight: '42px' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Bouton Flottant Plein Écran pour Smartphone (Discret, Fullscreen API) */}
      <button
        id="floating-fullscreen-btn"
        onClick={toggleFullscreen}
        className="md:hidden fixed bottom-18 right-3.5 z-40 p-2.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-slate-700/90 shadow-xl backdrop-blur-md active:scale-90 transition-all touch-manipulation cursor-pointer flex items-center justify-center"
        title={isFullscreen ? "Quitter le plein écran" : "Passer en Plein Écran Smartphone (masquer la barre du navigateur)"}
        aria-label="Mode Plein Écran Smartphone"
      >
        {isFullscreen ? (
          <Minimize2 className="w-5 h-5 text-sky-400" />
        ) : (
          <Maximize2 className="w-5 h-5 text-sky-400" />
        )}
      </button>

      {/* 7. Bottom Navigation Bar for Mobile */}
      <nav id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 px-3 py-2 flex items-center justify-around safe-bottom">
        <button
          id="nav-home-btn"
          onClick={handleNavHome}
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-slate-400 active:text-sky-400 cursor-pointer touch-manipulation"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">Accueil</span>
        </button>

        {/* Mobile Rapport Button */}
        <button
          id="nav-report-btn"
          onClick={() => setIsReportOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-cyan-400 active:text-cyan-300 cursor-pointer touch-manipulation"
          title="Ouvrir le rapport par chauffeur et nombre de jours"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-bold">Rapport</span>
        </button>

        {/* Bouton Rond Central Ajouter (+) */}
        <button
          id="nav-add-btn"
          onClick={handleOpenAdd}
          className="flex flex-col items-center justify-center w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white shadow-lg border-4 border-slate-950 active:scale-90 transition-transform cursor-pointer touch-manipulation"
          title="Ajouter une course"
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
        </button>

        {/* Petit bouton flèche en bas pour ajouter comme application au téléphone */}
        <button
          id="nav-install-btn"
          onClick={handleInstallClick}
          className="flex flex-col items-center gap-1 py-1 px-2 text-emerald-400 active:text-emerald-300 cursor-pointer touch-manipulation"
          title={isInstalled ? "Application installée sur le téléphone" : "Ajouter comme application au téléphone"}
        >
          <div className="relative flex items-center justify-center">
            <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
            {!isInstalled && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">{isInstalled ? 'Appli OK' : 'Installer'}</span>
        </button>

        <button
          id="nav-search-btn"
          onClick={handleNavSearch}
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-slate-400 active:text-sky-400 cursor-pointer touch-manipulation"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-bold">Recherche</span>
        </button>
      </nav>

      {/* Petit bouton flèche flottant en bas pour grand écran */}
      {!isInstalled && (
        <button
          id="desktop-install-quick-btn"
          onClick={handleInstallClick}
          className="hidden md:flex fixed bottom-4 right-4 z-40 items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-2xl backdrop-blur-md active:scale-95 transition-all cursor-pointer touch-manipulation group"
          title="Ajouter comme application au téléphone ou à l'ordinateur"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">Ajouter au téléphone</span>
        </button>
      )}

      {/* 6b. Delete All Confirmation Modal */}
      {isDeleteAllOpen && (
        <div id="delete-all-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div 
            id="delete-all-modal-container"
            className="w-full max-w-sm rounded-2xl bg-slate-900 border border-red-950/60 p-6 shadow-2xl flex flex-col gap-5 text-center animate-fade-in"
          >
            <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-900/50 text-red-500 flex items-center justify-center mx-auto">
              <Trash className="w-6 h-6" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-white text-red-400">Tout supprimer ?</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                « Attention : Voulez-vous vraiment supprimer TOUTES les courses enregistrées dans l'application ? » Cette action effacera définitivement toutes les données de votre téléphone.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="cancel-delete-all-btn"
                onClick={() => {
                  setIsDeleteAllOpen(false);
                }}
                className="w-full py-3 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer active:scale-98 transition-all touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                Annuler
              </button>
              <button
                id="confirm-delete-all-btn"
                onClick={confirmDeleteAll}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer active:scale-98 transition-all touch-manipulation shadow shadow-red-950/40"
                style={{ minHeight: '44px' }}
              >
                Supprimer Tout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6c. Modal Rapport Synthétique par Chauffeur & Nombre de Jours */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        entries={entries}
      />

      {/* 8. Toast Feedback Indicators */}
      <div id="toast-container" className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:w-80 z-50 flex flex-col gap-2.5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-semibold shadow-lg border animate-slide-up ${
              toast.type === 'success'
                ? 'bg-slate-900 border-emerald-800/80 text-emerald-400'
                : toast.type === 'error'
                ? 'bg-slate-900 border-rose-800/80 text-rose-400'
                : 'bg-slate-900 border-sky-800/80 text-sky-400'
            }`}
          >
            {toast.type === 'success' && <Check className="w-4 h-4 shrink-0 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
            {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-sky-400" />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* 9. Offline Status Toast Banner */}
      {!isOnline && (
        <div id="offline-banner" className="fixed bottom-22 md:bottom-6 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/95 border border-amber-400/30 px-3.5 py-2 text-xs font-bold text-white shadow-xl">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Mode Hors Ligne — Écran d'accueil actif</span>
        </div>
      )}

    </div>
  );
}
