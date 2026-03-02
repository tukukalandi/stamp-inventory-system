
import React, { useState, useMemo, useEffect } from 'react';
import { RawRow, DashboardPage, CATEGORY_LIST, PRODUCT_LIST, OfficeMap, HOStructure, MetricGroup, ReportMetadata, MASTER_OFFICE_LIST } from './types';
import { aggregateDataByField, parseGoogleSheetUrl, formatDateIndian } from './utils/helpers';
import { loadFullDataset, saveFullDataset, clearInventoryData } from './utils/db';
import FileUpload from './components/FileUpload';
import MetricCard from './components/MetricCard';
import OfficeReportTable from './components/OfficeReportTable';
import DivisionReportTable from './components/DivisionReportTable';
import ItemsReportTable from './components/ItemsReportTable';
import { LayoutGrid, PackageSearch, BarChart3, Building2, FileBarChart, List, Trash2, Calendar, Building, Upload, Home, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

const MASTER_DATA_URL = "https://docs.google.com/spreadsheets/d/1sqgOjtJ5uaiI6qIG_LZMZ-D0yaUhJG_FVxZLDeQORFA/edit?gid=0#gid=0";

const DASHBOARD_COLORS = [
  'indigo', 'emerald', 'amber', 'rose', 'cyan', 'violet', 
  'orange', 'teal', 'blue', 'fuchsia', 'lime', 'sky', 
  'pink', 'purple', 'slate'
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
  const [currentPage, setCurrentPage] = useState<DashboardPage>(DashboardPage.UPLOAD);
  const [officeMap, setOfficeMap] = useState<OfficeMap>({});
  const [hoStructure, setHoStructure] = useState<HOStructure>({});
  const [activeFilter, setActiveFilter] = useState<{ value: string, type: 'CATEGORY' | 'PRODUCT' } | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: savedData, meta: savedMeta } = await loadFullDataset();
        if (savedData.length > 0) {
          setData(savedData);
          setMeta(savedMeta);
          setCurrentPage(DashboardPage.CATEGORY);
        } else {
          setCurrentPage(DashboardPage.UPLOAD);
        }
      } catch (err) {
        console.error("Failed to load persistent data", err);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

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
    fetchMasterData();
  }, []);

  const savedSummaries = useMemo((): InventorySummary[] => {
    if (data.length === 0) return [];
    const summaries: { [key: string]: { id: string, name: string, dates: Date[], count: number } } = {};
    data.forEach(row => {
      const id = String(row.office_id);
      if (!summaries[id]) {
        summaries[id] = { id, name: officeMap[id] || row.office_name || id, dates: [], count: 0 };
      }
      if (row.trans_date instanceof Date) summaries[id].dates.push(row.trans_date);
      summaries[id].count++;
    });
    return Object.values(summaries).map(s => {
      const sortedDates = s.dates.sort((a, b) => a.getTime() - b.getTime());
      return {
        officeId: s.id,
        officeName: s.name,
        minDate: sortedDates.length > 0 ? formatDateIndian(sortedDates[0]) : 'N/A',
        maxDate: sortedDates.length > 0 ? formatDateIndian(sortedDates[sortedDates.length - 1]) : 'N/A',
        rowCount: s.count
      };
    }).sort((a, b) => a.officeName.localeCompare(b.officeName));
  }, [data, officeMap]);

  const handleDataLoaded = async (newData: RawRow[], newMeta: ReportMetadata) => {
    let finalData = newData;
    if (data.length > 0) {
      if (window.confirm("Global Vault has existing data. APPEND this batch for total consolidation? (Cancel to clear and overwrite)")) {
        finalData = [...data, ...newData];
      }
    }
    setData(finalData);
    setMeta(newMeta);
    setCurrentPage(DashboardPage.CATEGORY);
    try {
      await saveFullDataset(finalData, newMeta);
    } catch (err) {
      console.error("Failed to save data permanently", err);
    }
  };

  const categoryAggregated = useMemo(() => aggregateDataByField(data, 'category_desc', data), [data]);
  const productAggregated = useMemo(() => aggregateDataByField(data, 'product_category', data), [data]);
  const netValuation = useMemo(() => Object.values(categoryAggregated).reduce((sum: number, metrics: MetricGroup) => sum + metrics.closingAmt, 0), [categoryAggregated]);

  const clearDatabase = async () => {
    if (window.confirm("Permanently clear the Global Vault? This cannot be undone.")) {
      setData([]);
      setMeta(null);
      setActiveFilter(null);
      setCurrentPage(DashboardPage.UPLOAD);
      try {
        await clearInventoryData();
      } catch (err) {
        console.error("Failed to clear persistent data", err);
      }
    }
  };

  const handleCardClick = (item: string, type: 'CATEGORY' | 'PRODUCT') => {
    setActiveFilter({ value: item, type });
    setCurrentPage(DashboardPage.ITEMS); // Navigating to ITEMS view instead of OFFICE
  };

  const renderContent = () => {
    if (currentPage === DashboardPage.UPLOAD) {
      return (
        <div className="flex flex-col items-center justify-center py-12 animate-fadeIn">
          <FileUpload onDataLoaded={handleDataLoaded} savedSummaries={savedSummaries} />
        </div>
      );
    }
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <Upload className="w-16 h-16 text-slate-200 mb-4" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No consolidated data. Please upload records.</p>
          <button onClick={() => setCurrentPage(DashboardPage.UPLOAD)} className="mt-4 px-6 py-3 bg-[#c1272d] text-white rounded-xl font-bold uppercase text-xs">Start Upload</button>
        </div>
      );
    }
    switch (currentPage) {
      case DashboardPage.OFFICE:
        return <OfficeReportTable data={data} allData={data} officeMap={officeMap} hoStructure={hoStructure} initialFilter={activeFilter || undefined} />;
      case DashboardPage.DIVISION:
        return <DivisionReportTable data={data} allData={data} meta={meta} />;
      case DashboardPage.ITEMS:
        return <ItemsReportTable 
          data={data} 
          allData={data} 
          initialFilter={activeFilter} 
          onClearFilter={() => setActiveFilter(null)} 
          onGoToOfficeWise={() => setCurrentPage(DashboardPage.OFFICE)}
        />;
      default:
        const isCategory = currentPage === DashboardPage.CATEGORY;
        const list = isCategory ? CATEGORY_LIST : PRODUCT_LIST;
        const aggregated = isCategory ? categoryAggregated : productAggregated;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn print:grid-cols-2 print:gap-4">
            {list.map((item, index) => {
              const metrics = aggregated[item] || { openingQty: 0, openingAmt: 0, issuesQty: 0, issuesAmt: 0, receiptsQty: 0, receiptsAmt: 0, closingQty: 0, closingAmt: 0 };
              return <MetricCard key={item} title={item} metrics={metrics} colorScheme={DASHBOARD_COLORS[index % DASHBOARD_COLORS.length]} onClick={() => handleCardClick(item, isCategory ? 'CATEGORY' : 'PRODUCT')} />;
            })}
          </div>
        );
    }
  };

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fffcf0]"><BarChart3 className="w-12 h-12 text-[#c1272d] animate-bounce" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#fffcf0] pb-12 print:bg-white print:pb-0 print:h-auto print:overflow-visible">
      <nav className="sticky top-0 z-50 bg-[#c1272d] border-b-4 border-[#ffcc00] shadow-md px-4 md:px-8 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          <button onClick={() => setCurrentPage(DashboardPage.UPLOAD)} className="flex items-center gap-3 group transition-all hover:scale-105">
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
              { id: DashboardPage.CATEGORY, label: 'Category Total', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
              { id: DashboardPage.PRODUCT, label: 'Product Total', icon: <PackageSearch className="w-3.5 h-3.5" /> },
              { id: DashboardPage.ITEMS, label: 'Full Items List', icon: <List className="w-3.5 h-3.5" /> },
              { id: DashboardPage.OFFICE, label: 'By Office', icon: <Building2 className="w-3.5 h-3.5" /> },
              { id: DashboardPage.DIVISION, label: 'Consolidated Statement', icon: <FileBarChart className="w-3.5 h-3.5" /> },
            ].map((btn) => (
              <button key={btn.id} onClick={() => { setCurrentPage(btn.id as DashboardPage); setActiveFilter(null); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all ${currentPage === btn.id ? 'bg-[#ffcc00] text-[#c1272d] shadow-md' : 'text-white hover:bg-white/10'}`}>
                {btn.icon} {btn.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentPage(DashboardPage.UPLOAD)} className="flex items-center gap-2 px-4 py-2 bg-[#ffcc00] text-[#c1272d] rounded-xl text-xs font-black uppercase shadow-lg hover:bg-white transition-all group">
              <Upload className="w-4 h-4 group-hover:-translate-y-1 transition-transform" /> Sync Vault
            </button>
            {data.length > 0 && (
              <button onClick={clearDatabase} className="p-2 text-[#ffcc00] hover:text-white transition-colors" title="Wipe Vault"><Trash2 className="w-5 h-5" /></button>
            )}
          </div>
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
                  {meta?.fromDate && meta?.toDate && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                      <Calendar className="w-3 h-3 text-[#c1272d]" />
                      {meta.fromDate} — {meta.toDate}
                    </div>
                  )}
                </div>
                <h2 className="text-4xl font-black text-[#c1272d] tracking-tight uppercase print:text-black print:text-2xl print:m-0 print:text-center">
                  {currentPage === DashboardPage.CATEGORY ? 'Category-wise Totals' : 
                   currentPage === DashboardPage.PRODUCT ? 'Product-wise Totals' : 
                   currentPage === DashboardPage.ITEMS ? 'Detailed Items Summary' :
                   currentPage === DashboardPage.DIVISION ? 'Global Division Report' : 'Office-Wise Breakdown'}
                </h2>
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
