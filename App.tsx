
import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import DashboardOverview from './src/components/DashboardOverview';
import { motion, AnimatePresence } from 'motion/react';
import { RawRow, DashboardPage, CATEGORY_LIST, PRODUCT_LIST, OfficeMap, HOStructure, MetricGroup, ReportMetadata, MASTER_OFFICE_LIST } from './types';
import { aggregateDataByField, parseGoogleSheetUrl, formatDateIndian } from './utils/helpers';
import { loadFullDataset, saveFullDataset, clearInventoryData } from './utils/db';
import FileUpload from './components/FileUpload';
import MetricCard from './components/MetricCard';
import OfficeReportTable from './components/OfficeReportTable';
import DivisionReportTable from './components/DivisionReportTable';
import ItemsReportTable from './components/ItemsReportTable';
import { LayoutGrid, PackageSearch, BarChart3, Building2, FileBarChart, List, Trash2, Calendar, Building, Upload, Home, ShieldCheck, Loader2, CheckCircle2, AlertCircle, PlusCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const MASTER_DATA_URL = "https://docs.google.com/spreadsheets/d/1sqgOjtJ5uaiI6qIG_LZMZ-D0yaUhJG_FVxZLDeQORFA/edit?gid=0#gid=0";

const DASHBOARD_COLORS = [
  'indigo', 'emerald', 'amber', 'rose', 'cyan', 'violet', 
  'orange', 'teal', 'blue', 'fuchsia', 'lime', 'sky', 
  'pink', 'purple', 'slate'
];

const MAIN_CATEGORIES = [
  "Commemorative",
  "Definitive-Public Postage stamp",
  "My stamp",
  "Postal Stationary",
  "Revenue stamps",
  "Service Stamps",
  "Gangajal",
  "Maxim cards"
];

interface InventorySummary {
  officeId: string;
  officeName: string;
  minDate: string;
  maxDate: string;
  rowCount: number;
}

const App: React.FC = () => {
  const [data, setData] = useState<RawRow[]>([]);
  const [meta, setMeta] = useState<ReportMetadata | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAppendMode, setIsAppendMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [firebaseStatus, setFirebaseStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<DashboardPage>(DashboardPage.UPLOAD);
  const [officeMap, setOfficeMap] = useState<OfficeMap>({});
  const [hoStructure, setHoStructure] = useState<HOStructure>({});
  const [activeFilter, setActiveFilter] = useState<{ value: string, type: 'MAIN_CATEGORY' | 'SUB_CATEGORY' | 'PRODUCT' } | null>(null);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');

  const deferredFromDate = useDeferredValue(filterFromDate);
  const deferredToDate = useDeferredValue(filterToDate);

  useEffect(() => {
    const map: OfficeMap = {};
    MASTER_OFFICE_LIST.forEach(o => { map[o.id] = o.name; });
    
    const fetchMasterData = async () => {
      const csvUrl = parseGoogleSheetUrl(MASTER_DATA_URL);
      if (!csvUrl) { setOfficeMap(map); return; }
      try {
        const response = await fetch(csvUrl);
        const text = await response.text();
        const workbook = XLSX.read(text, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        const structure: HOStructure = {
          "DHENKANAL H.O": { offices: [], displayName: "Dhenkanal H.O & S.Os/B.Os" },
          "ANGUL H.O": { offices: [], displayName: "Angul H.O & S.Os/B.Os" }
        };
        rows.slice(1).forEach(row => {
          const officeId = String(row[0] || '').trim();
          const officeName = String(row[1] || '').trim();
          const hoName = String(row[4] || '').trim().toUpperCase();
          if (officeId) {
            map[officeId] = officeName || officeId;
            if (hoName.includes("DHENKANAL")) structure["DHENKANAL H.O"].offices.push(officeId);
            else if (hoName.includes("ANGUL")) structure["ANGUL H.O"].offices.push(officeId);
          }
        });
        setOfficeMap(map);
        setHoStructure(structure);
      } catch (e) {
        console.error("Failed to load master data", e);
        setOfficeMap(map);
      }
    };

    const init = async () => {
      await fetchMasterData();
      try {
        const { data: savedData, meta: savedMeta } = await loadFullDataset();
        if (savedData && savedData.length > 0) {
          setData(savedData);
          setMeta(savedMeta);
          setSyncStatus('SUCCESS');
          setFirebaseStatus('SUCCESS');
          setCurrentPage(DashboardPage.OVERVIEW);
          
          // Set filters
          const dates = savedData
            .map(r => r.trans_date)
            .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());
          
          if (dates.length > 0) {
            const toISO = (d: Date) => d.toISOString().split('T')[0];
            setFilterFromDate(toISO(dates[0]));
            setFilterToDate(toISO(dates[dates.length - 1]));
          }
        }
      } catch (e) {
        console.error("Failed to load saved data", e);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  const handleDataLoaded = async (newData: RawRow[], newMeta: ReportMetadata) => {
    const combinedData = isAppendMode ? [...data, ...newData] : newData;
    setData(combinedData);
    
    // Recalculate meta for combined data
    const dates = combinedData
      .map(r => r.trans_date)
      .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const finalMeta: ReportMetadata = {
      ...newMeta,
      fromDate: dates.length > 0 ? formatDateIndian(dates[0]) : 'N/A',
      toDate: dates.length > 0 ? formatDateIndian(dates[dates.length - 1]) : 'N/A',
      periodName: isAppendMode ? 'Combined Report' : newMeta.periodName
    };
    
    setMeta(finalMeta);
    setIsAppendMode(false); // Reset mode
    
    // Set initial filters from detected range
    if (dates.length > 0) {
      const toISO = (d: Date) => d.toISOString().split('T')[0];
      setFilterFromDate(toISO(dates[0]));
      setFilterToDate(toISO(dates[dates.length - 1]));
    }

    setSyncStatus('SYNCING');
    setFirebaseStatus('SYNCING');
    setSyncError(null);
    try {
      await saveFullDataset(combinedData, finalMeta);
      setSyncStatus('SUCCESS');
      setFirebaseStatus('SUCCESS');
    } catch (e: any) {
      console.error("Failed to save data to Cloud", e);
      setSyncStatus('ERROR');
      setFirebaseStatus('ERROR');
      setSyncError(e.message);
    }

    setCurrentPage(DashboardPage.OVERVIEW);
  };

  const filteredData = useMemo(() => {
    if (!deferredFromDate && !deferredToDate) return data;
    
    let from: Date | null = null;
    if (deferredFromDate) {
      const p = deferredFromDate.split('-');
      from = new Date(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 0, 0, 0, 0));
    }
    
    let to: Date | null = null;
    if (deferredToDate) {
      const p = deferredToDate.split('-');
      to = new Date(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 0, 0, 0, 0));
    }
    
    return data.filter(r => {
      if (!r.trans_date) return false;
      if (from && r.trans_date < from) return false;
      if (to && r.trans_date > to) return false;
      return true;
    });
  }, [data, deferredFromDate, deferredToDate]);

  const mainCategoryAggregated = useMemo(() => aggregateDataByField(data, 'main_category', deferredFromDate, deferredToDate), [data, deferredFromDate, deferredToDate]);
  const subCategoryAggregated = useMemo(() => aggregateDataByField(data, 'category_desc', deferredFromDate, deferredToDate), [data, deferredFromDate, deferredToDate]);
  const productAggregated = useMemo(() => aggregateDataByField(data, 'product_category', deferredFromDate, deferredToDate), [data, deferredFromDate, deferredToDate]);
  const netValuation = useMemo(() => Object.values(mainCategoryAggregated).reduce((sum: number, metrics: MetricGroup) => sum + metrics.closingAmt, 0), [mainCategoryAggregated]);

  const handleMainCardClick = (item: string) => {
    if (item === 'Commemorative') {
      setSelectedMainCategory(item);
      setCurrentPage(DashboardPage.SUB_CATEGORY);
    } else {
      setActiveFilter({ value: item, type: 'MAIN_CATEGORY' });
      setCurrentPage(DashboardPage.ITEMS);
    }
  };

  const handleSubCardClick = (item: string) => {
    setActiveFilter({ value: item, type: 'SUB_CATEGORY' });
    setCurrentPage(DashboardPage.ITEMS);
  };

  const handleProductCardClick = (item: string) => {
    setActiveFilter({ value: item, type: 'PRODUCT' });
    setCurrentPage(DashboardPage.ITEMS);
  };

  const isStale = deferredFromDate !== filterFromDate || deferredToDate !== filterToDate;

  const renderContent = () => {
    if (currentPage === DashboardPage.UPLOAD) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <FileUpload onDataLoaded={handleDataLoaded} isAppendMode={isAppendMode} />
        </motion.div>
      );
    }
    if (data.length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-100"
        >
          <Upload className="w-16 h-16 text-slate-200 mb-4" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No consolidated data. Please upload records.</p>
          <button onClick={() => setCurrentPage(DashboardPage.UPLOAD)} className="mt-4 px-8 py-4 bg-[#c1272d] text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-red-100 hover:bg-black transition-all">Start Upload</button>
        </motion.div>
      );
    }
    return (
      <div className={`transition-opacity duration-300 ${isStale ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {(() => {
              switch (currentPage) {
                case DashboardPage.OVERVIEW:
                  return <DashboardOverview mainCategoryAggregated={mainCategoryAggregated} netValuation={netValuation} />;
                case DashboardPage.ITEMS:
                  return <ItemsReportTable 
                    data={filteredData} 
                    allData={data} 
                    initialFilter={activeFilter} 
                    filterFromDate={deferredFromDate}
                    onClearFilter={() => setActiveFilter(null)} 
                    onGoToOfficeWise={() => {}}
                  />;
                case DashboardPage.PRODUCT_CATEGORY:
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-2 print:gap-4">
                      {PRODUCT_LIST.map((item, index) => {
                        const metrics = productAggregated[item] || { openingQty: 0, openingAmt: 0, issuesQty: 0, issuesAmt: 0, receiptsQty: 0, receiptsAmt: 0, closingQty: 0, closingAmt: 0 };
                        return <MetricCard key={item} title={item} metrics={metrics} colorScheme={DASHBOARD_COLORS[index % DASHBOARD_COLORS.length]} onClick={() => handleProductCardClick(item)} />;
                      })}
                    </div>
                  );
                case DashboardPage.SUB_CATEGORY:
                  const subCategories = Array.from(new Set(filteredData.filter(r => r.main_category === selectedMainCategory).map(r => r.category_desc))).sort() as string[];
                  return (
                    <div className="flex flex-col gap-6">
                      <button onClick={() => setCurrentPage(DashboardPage.MAIN_CATEGORY)} className="flex items-center gap-2 text-[#c1272d] font-black uppercase text-xs hover:underline">
                        ← Back to Main Categories
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {subCategories.map((item, index) => {
                          const metrics = subCategoryAggregated[item] || { openingQty: 0, openingAmt: 0, issuesQty: 0, issuesAmt: 0, receiptsQty: 0, receiptsAmt: 0, closingQty: 0, closingAmt: 0 };
                          return <MetricCard key={item} title={item} metrics={metrics} colorScheme={DASHBOARD_COLORS[index % DASHBOARD_COLORS.length]} onClick={() => handleSubCardClick(item)} />;
                        })}
                      </div>
                    </div>
                  );
                default:
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-2 print:gap-4">
                      {MAIN_CATEGORIES.map((item, index) => {
                        const metrics = mainCategoryAggregated[item] || { openingQty: 0, openingAmt: 0, issuesQty: 0, issuesAmt: 0, receiptsQty: 0, receiptsAmt: 0, closingQty: 0, closingAmt: 0 };
                        return <MetricCard key={item} title={item} metrics={metrics} colorScheme={DASHBOARD_COLORS[index % DASHBOARD_COLORS.length]} onClick={() => handleMainCardClick(item)} />;
                      })}
                    </div>
                  );
              }
            })()}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fffcf0]"><BarChart3 className="w-12 h-12 text-[#c1272d] animate-bounce" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#fffcf0] pb-12 print:bg-white print:pb-0 print:h-auto print:overflow-visible">
      <nav className="sticky top-0 z-50 bg-[#c1272d] border-b-4 border-[#ffcc00] shadow-md px-4 md:px-8 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          <button onClick={() => setCurrentPage(DashboardPage.OVERVIEW)} className="flex items-center gap-3 group transition-all hover:scale-105">
            <div className="p-2 bg-[#ffcc00] rounded-full text-[#c1272d] shadow-inner group-hover:rotate-12 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-black text-white leading-tight tracking-tight uppercase">India Post</h1>
              <p className="text-[10px] text-[#ffcc00] font-bold uppercase tracking-[0.2em]">Consolidated Philately</p>
            </div>
          </button>
          
          <div className="flex flex-wrap items-center justify-center gap-2 p-1 bg-black/10 rounded-xl">
            <button onClick={() => setCurrentPage(DashboardPage.UPLOAD)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all ${currentPage === DashboardPage.UPLOAD ? 'bg-white text-[#c1272d] shadow-md' : 'text-white hover:bg-white/10'}`}>
              <Home className="w-3.5 h-3.5" /> Home
            </button>
            {data.length > 0 && [
              { id: DashboardPage.OVERVIEW, label: 'Overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
              { id: DashboardPage.MAIN_CATEGORY, label: 'Categories', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
              { id: DashboardPage.PRODUCT_CATEGORY, label: 'Product Category', icon: <PackageSearch className="w-3.5 h-3.5" /> },
              { id: DashboardPage.ITEMS, label: 'Full Items List', icon: <List className="w-3.5 h-3.5" /> },
            ].map((btn) => (
              <button key={btn.id} onClick={() => { setCurrentPage(btn.id as DashboardPage); setActiveFilter(null); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all ${currentPage === btn.id ? 'bg-[#ffcc00] text-[#c1272d] shadow-md' : 'text-white hover:bg-white/10'}`}>
                {btn.icon} {btn.label}
              </button>
            ))}
          </div>

            <div className="flex flex-col items-end gap-1">
              {syncStatus !== 'IDLE' && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    syncStatus === 'SUCCESS' ? 'bg-emerald-500' : 
                    syncStatus === 'SYNCING' ? 'bg-blue-500 animate-pulse' : 
                    'bg-rose-500'
                  }`} />
                  <span className="text-[10px] font-bold text-white uppercase">Supabase: {syncStatus}</span>
                </div>
              )}
              {firebaseStatus !== 'IDLE' && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    firebaseStatus === 'SUCCESS' ? 'bg-emerald-500' : 
                    firebaseStatus === 'SYNCING' ? 'bg-blue-500 animate-pulse' : 
                    'bg-rose-500'
                  }`} />
                  <span className="text-[10px] font-bold text-white uppercase">Firebase: {firebaseStatus}</span>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-white/20 mx-2" />

            <button 
              onClick={async () => {
                if (window.confirm('WARNING: This will permanently delete all inventory data from the database. Are you sure?')) {
                  try {
                    setSyncStatus('SYNCING');
                    setFirebaseStatus('SYNCING');
                    await clearInventoryData();
                    setData([]);
                    setMeta(null);
                    setSyncStatus('IDLE');
                    setFirebaseStatus('IDLE');
                    setCurrentPage(DashboardPage.UPLOAD);
                  } catch (e: any) {
                    console.error("Failed to clear data", e);
                    setSyncStatus('ERROR');
                    setSyncError(e.message);
                  }
                }
              }} 
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase hover:bg-rose-700 transition-all shadow-lg shadow-rose-900/20 group"
            >
              <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Delete All Data
            </button>
            <button 
              onClick={() => {
                setIsAppendMode(true);
                setCurrentPage(DashboardPage.UPLOAD);
              }} 
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase shadow-lg hover:bg-emerald-700 transition-all group"
            >
              <PlusCircle className="w-4 h-4 group-hover:scale-110 transition-transform" /> Append Data
            </button>
            <button onClick={() => { setIsAppendMode(false); setCurrentPage(DashboardPage.UPLOAD); }} className="flex items-center gap-2 px-4 py-2 bg-[#ffcc00] text-[#c1272d] rounded-xl text-xs font-black uppercase shadow-lg hover:bg-white transition-all group">
              <Upload className="w-4 h-4 group-hover:-translate-y-1 transition-transform" /> New Upload
            </button>
          </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-10 print:mt-4 print:px-0 print:max-w-none print:bg-white overflow-visible print:h-auto">
        <div className="space-y-8 print:space-y-6 print:h-auto print:overflow-visible">
          {currentPage !== DashboardPage.UPLOAD && data.length > 0 && (
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-l-4 border-[#c1272d] pl-6 print:border-none print:pl-0">
              <div className="print:w-full">
                <div className="flex flex-wrap items-center gap-2 mb-3 print:hidden">
                  <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    Total Consolidated Data
                  </div>
                </div>
                <h2 className="text-4xl font-black text-[#c1272d] tracking-tight uppercase print:text-black print:text-2xl print:m-0 print:text-center">
                  {currentPage === DashboardPage.OVERVIEW ? 'Dashboard Overview' :
                   currentPage === DashboardPage.MAIN_CATEGORY ? 'Main Categories' : 
                   currentPage === DashboardPage.PRODUCT_CATEGORY ? 'Product Categories' :
                   currentPage === DashboardPage.SUB_CATEGORY ? `Commemorative Sub-Categories` : 
                   currentPage === DashboardPage.ITEMS ? 'Detailed Items Summary' : 'Report View'}
                </h2>
                <div className="flex flex-wrap items-center gap-4 mt-4 print:hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From:</span>
                    <input 
                      type="date" 
                      value={filterFromDate}
                      onChange={(e) => setFilterFromDate(e.target.value)}
                      className="px-3 py-1.5 bg-white border-2 border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-[#c1272d] shadow-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To:</span>
                    <input 
                      type="date" 
                      value={filterToDate}
                      onChange={(e) => setFilterToDate(e.target.value)}
                      className="px-3 py-1.5 bg-white border-2 border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-[#c1272d] shadow-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#c1272d]/5 rounded-xl text-[9px] font-black text-[#c1272d] uppercase tracking-widest border border-[#c1272d]/10">
                    <Calendar className="w-3 h-3" />
                    Active Period
                  </div>
                </div>
                {/* Print-only period display */}
                <div className="hidden print:flex print:items-center print:gap-2 print:mt-2 print:text-[10px] print:font-black print:text-black print:uppercase print:tracking-widest print:justify-center">
                  Period: {filterFromDate ? formatDateIndian(new Date(Date.UTC(parseInt(filterFromDate.split('-')[0]), parseInt(filterFromDate.split('-')[1]) - 1, parseInt(filterFromDate.split('-')[2])))) : 'N/A'} To {filterToDate ? formatDateIndian(new Date(Date.UTC(parseInt(filterToDate.split('-')[0]), parseInt(filterToDate.split('-')[1]) - 1, parseInt(filterToDate.split('-')[2])))) : 'N/A'}
                </div>
              </div>
              <div className="bg-[#c1272d] rounded-[2rem] px-10 py-5 flex items-center gap-6 shadow-2xl shadow-red-200 border-b-8 border-black/10 print:hidden transform hover:scale-[1.02] transition-transform">
                 <div className="flex flex-col">
                   <span className="text-[10px] text-[#ffcc00] font-black uppercase tracking-[0.2em] mb-1">Total Vault Valuation</span>
                   <span className="text-2xl font-black text-white leading-none">
                     {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(netValuation)}
                   </span>
                 </div>
              </div>
            </header>
          )}
          <div className="print:w-full print:h-auto print:overflow-visible print:block">{renderContent()}</div>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @media print {
          @page { size: auto; margin: 10mm; }
          html, body { height: auto; overflow: visible; background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
