
import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { RawRow, ReportMetadata, MASTER_OFFICE_LIST } from '../types';
import { Upload, AlertCircle, Link, Globe, Files, Loader2, CheckCircle2, Database, Info, Clock, Sparkles, PlusCircle, ShieldCheck, FileBarChart } from 'lucide-react';
import { parseGoogleSheetUrl, normalizeData, formatDateIndian } from '../utils/helpers';

interface InventorySummary {
  officeId: string;
  officeName: string;
  minDate: string;
  maxDate: string;
  rowCount: number;
}

interface FileUploadProps {
  onDataLoaded: (data: RawRow[], meta: ReportMetadata) => void;
  isAppendMode?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, isAppendMode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAndFinalize = (jsonData: any[]) => {
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error("The data source is empty.");
    }

    const normalized = normalizeData(jsonData);
    
    // Auto-detect date range from data
    const dates = normalized
      .map(r => r.trans_date)
      .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const meta: ReportMetadata = {
      periodName: 'Consolidated Report',
      divisionName: 'Dhenkanal Division', // Default
      fromDate: dates.length > 0 ? formatDateIndian(dates[0]) : 'N/A',
      toDate: dates.length > 0 ? formatDateIndian(dates[dates.length - 1]) : 'N/A',
      officeName: 'Consolidated Units',
      officeId: 'MULTIPLE',
      generatedDate: new Date().toLocaleDateString('en-IN')
    };

    onDataLoaded(normalized, meta);
  };

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: files.length });

    try {
      const allJsonData: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ current: i + 1, total: files.length });
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result as string);
          reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
          reader.readAsBinaryString(file);
        });
        const workbook = XLSX.read(data, { type: 'binary' });
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" }) as any[];
          allJsonData.push(...jsonData);
        });
      }
      processAndFinalize(allJsonData);
    } catch (err: any) {
      setError(err.message || "An error occurred while processing the batch.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleFetchSheet = async () => {
    const csvUrl = parseGoogleSheetUrl(sheetUrl);
    if (!csvUrl) {
      setError("Please paste a valid Google Sheets URL.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(csvUrl);
      const text = await response.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const allJsonData: any[] = [];
      workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        allJsonData.push(...XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" }));
      });
      processAndFinalize(allJsonData);
    } catch (err: any) {
      setError(err.message || "Could not load data from the link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side: Information & Branding */}
        <div className="lg:col-span-5 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffcc00]/20 text-[#c1272d] rounded-full text-[10px] font-black uppercase tracking-widest border border-[#ffcc00]/30">
              <Sparkles className="w-3 h-3" /> Official Philately Tool
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-[#c1272d] uppercase tracking-tighter leading-[0.9]">
              Consolidate <br />
              <span className="text-slate-900">Your Inventory</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-md">
              A professional-grade tool for Dhenkanal Postal Division to merge, analyze, and report on stamp inventory across multiple offices.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: <Files className="w-5 h-5" />, title: "Multi-File", desc: "Upload multiple Excel dumps at once" },
              { icon: <Database className="w-5 h-5" />, title: "Auto-Sync", desc: "Connect directly to Google Sheets" },
              { icon: <FileBarChart className="w-5 h-5" />, title: "Analytics", desc: "Instant valuation & category reports" },
              { icon: <CheckCircle2 className="w-5 h-5" />, title: "Print Ready", desc: "Official formats for division reports" },
            ].map((feature, i) => (
              <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[#c1272d] mb-3">
                  {feature.icon}
                </div>
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-tight">{feature.title}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight leading-tight">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-900 uppercase tracking-tight">Privacy First</p>
              <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-tight">All data is processed locally in your browser.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Upload Interface */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-slate-100 p-8 md:p-12 relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 blur-3xl pointer-events-none"></div>
            
            <div className="mb-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#c1272d] text-white rounded-2xl shadow-xl ring-4 ring-[#ffcc00]/20">
                  {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                </div>
                {isAppendMode && (
                  <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-2">
                    <PlusCircle className="w-3 h-3" /> Append Mode
                  </div>
                )}
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                {isAppendMode ? 'Add Records' : 'Import Dataset'}
              </h2>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">
                Select your Excel or CSV inventory dumps
              </p>
            </div>

            <div className="space-y-6 relative z-10">
              {!showLinkInput ? (
                <div className="flex flex-col gap-6">
                  <label 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
                    className={`relative cursor-pointer group flex flex-col items-center justify-center border-4 border-dashed rounded-[2.5rem] p-12 transition-all duration-500 ${
                      isDragging ? 'border-[#c1272d] bg-red-50 scale-[0.98]' : 'border-slate-100 hover:border-[#ffcc00] bg-slate-50/50 hover:bg-white hover:shadow-xl'
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".xlsx, .xls, .csv" 
                      multiple 
                      onChange={(e) => e.target.files && handleFiles(e.target.files)}
                      disabled={loading}
                    />
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className="p-4 bg-white rounded-2xl shadow-lg text-[#c1272d] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                        <Files className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-800 uppercase tracking-tight">Drop files here</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em]">
                          or click to browse local storage
                        </p>
                      </div>
                    </div>
                  </label>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-white px-4 text-slate-300">OR</span></div>
                  </div>

                  <button 
                    onClick={() => setShowLinkInput(true)}
                    className="w-full py-5 bg-[#ffcc00] hover:bg-[#e6b800] text-[#c1272d] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg border-b-4 border-black/10 active:translate-y-1 active:border-b-0"
                  >
                    <Globe className="w-5 h-5" />
                    Sync from Google Sheets
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 animate-fadeIn">
                  <div className="relative group">
                    <Link className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c1272d]" />
                    <input 
                      type="text"
                      placeholder="Paste Google Sheet Public Link..."
                      className="w-full pl-14 pr-4 py-5 bg-[#fffcf0] border-2 border-[#ffcc00]/30 rounded-2xl focus:border-[#c1272d] outline-none font-black text-slate-700 placeholder:text-slate-300 shadow-inner"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFetchSheet()}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={handleFetchSheet}
                      className="flex-[2] px-8 py-5 bg-[#c1272d] text-white font-black uppercase tracking-widest rounded-2xl hover:bg-[#a12126] transition-all shadow-lg border-b-4 border-black/20 active:translate-y-1 active:border-b-0"
                      disabled={loading}
                    >
                      {loading ? 'Fetching...' : 'Connect & Sync'}
                    </button>
                    <button onClick={() => setShowLinkInput(false)} className="flex-1 px-6 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase tracking-widest hover:bg-slate-200 transition-colors">Back</button>
                  </div>
                </div>
              )}
            </div>

            {progress && (
              <div className="mt-8 w-full animate-fadeIn">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Processing Files</span>
                  <span className="text-[10px] font-black uppercase text-[#c1272d]">{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-[#c1272d] to-[#ffcc00] rounded-full transition-all duration-500" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 w-full font-black animate-shake">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] uppercase tracking-tight leading-tight">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Instructions */}
      <div className="mt-20 pt-20 border-t border-slate-100">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">How it works</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Follow these simple steps to generate your report</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { step: "01", title: "Export Data", desc: "Export your inventory dumps from the SAP/CSI system as Excel or CSV files." },
            { step: "02", title: "Upload Files", desc: "Drag and drop all your office files into the import zone. We'll merge them instantly." },
            { step: "03", title: "Analyze & Print", desc: "Browse the consolidated dashboards and print official reports for the division." },
          ].map((item, i) => (
            <div key={i} className="relative">
              <span className="absolute -top-10 left-0 text-6xl font-black text-slate-50 opacity-10 select-none">{item.step}</span>
              <h3 className="text-lg font-black text-[#c1272d] uppercase tracking-tight mb-3">{item.title}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
