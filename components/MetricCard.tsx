
import React from 'react';
import { MetricGroup } from '../types';
import { formatCurrency, formatNumber } from '../utils/helpers';
import { TrendingUp, ArrowDownRight, ArrowUpRight, Package, Calculator, Search } from 'lucide-react';

interface MetricCardProps {
  title: string;
  metrics: MetricGroup;
  colorScheme?: string; // Tailwind color name like 'emerald', 'indigo', etc.
  onClick?: () => void;
}

// Map of Tailwind color themes for explicit class safety in esm.sh environments
const THEME_MAP: Record<string, {
  border: string, 
  title: string, 
  bg: string, 
  hoverBg: string, 
  closingBg: string, 
  closingText: string,
  iconBg: string
}> = {
  indigo: { border: 'border-indigo-600', title: 'text-indigo-600', bg: 'bg-indigo-50', hoverBg: 'group-hover/card:bg-indigo-600/10', closingBg: 'bg-indigo-600', closingText: 'text-indigo-600', iconBg: 'bg-indigo-100 text-indigo-600' },
  emerald: { border: 'border-emerald-600', title: 'text-emerald-600', bg: 'bg-emerald-50', hoverBg: 'group-hover/card:bg-emerald-600/10', closingBg: 'bg-emerald-600', closingText: 'text-emerald-600', iconBg: 'bg-emerald-100 text-emerald-600' },
  amber: { border: 'border-amber-500', title: 'text-amber-600', bg: 'bg-amber-50', hoverBg: 'group-hover/card:bg-amber-500/10', closingBg: 'bg-amber-500', closingText: 'text-amber-600', iconBg: 'bg-amber-100 text-amber-600' },
  rose: { border: 'border-rose-600', title: 'text-rose-600', bg: 'bg-rose-50', hoverBg: 'group-hover/card:bg-rose-600/10', closingBg: 'bg-rose-600', closingText: 'text-rose-600', iconBg: 'bg-rose-100 text-rose-600' },
  cyan: { border: 'border-cyan-600', title: 'text-cyan-600', bg: 'bg-cyan-50', hoverBg: 'group-hover/card:bg-cyan-600/10', closingBg: 'bg-cyan-600', closingText: 'text-cyan-600', iconBg: 'bg-cyan-100 text-cyan-600' },
  violet: { border: 'border-violet-600', title: 'text-violet-600', bg: 'bg-violet-50', hoverBg: 'group-hover/card:bg-violet-600/10', closingBg: 'bg-violet-600', closingText: 'text-violet-600', iconBg: 'bg-violet-100 text-violet-600' },
  orange: { border: 'border-orange-500', title: 'text-orange-600', bg: 'bg-orange-50', hoverBg: 'group-hover/card:bg-orange-500/10', closingBg: 'bg-orange-500', closingText: 'text-orange-600', iconBg: 'bg-orange-100 text-orange-600' },
  teal: { border: 'border-teal-600', title: 'text-teal-600', bg: 'bg-teal-50', hoverBg: 'group-hover/card:bg-teal-600/10', closingBg: 'bg-teal-600', closingText: 'text-teal-600', iconBg: 'bg-teal-100 text-teal-600' },
  blue: { border: 'border-blue-600', title: 'text-blue-600', bg: 'bg-blue-50', hoverBg: 'group-hover/card:bg-blue-600/10', closingBg: 'bg-blue-600', closingText: 'text-blue-600', iconBg: 'bg-blue-100 text-blue-600' },
  fuchsia: { border: 'border-fuchsia-600', title: 'text-fuchsia-600', bg: 'bg-fuchsia-50', hoverBg: 'group-hover/card:bg-fuchsia-600/10', closingBg: 'bg-fuchsia-600', closingText: 'text-fuchsia-600', iconBg: 'bg-fuchsia-100 text-fuchsia-600' },
  lime: { border: 'border-lime-500', title: 'text-lime-700', bg: 'bg-lime-50', hoverBg: 'group-hover/card:bg-lime-500/10', closingBg: 'bg-lime-600', closingText: 'text-lime-700', iconBg: 'bg-lime-100 text-lime-700' },
  sky: { border: 'border-sky-500', title: 'text-sky-600', bg: 'bg-sky-50', hoverBg: 'group-hover/card:bg-sky-500/10', closingBg: 'bg-sky-600', closingText: 'text-sky-600', iconBg: 'bg-sky-100 text-sky-600' },
  pink: { border: 'border-pink-600', title: 'text-pink-600', bg: 'bg-pink-50', hoverBg: 'group-hover/card:bg-pink-600/10', closingBg: 'bg-pink-600', closingText: 'text-pink-600', iconBg: 'bg-pink-100 text-pink-600' },
  purple: { border: 'border-purple-600', title: 'text-purple-600', bg: 'bg-purple-50', hoverBg: 'group-hover/card:bg-purple-600/10', closingBg: 'bg-purple-600', closingText: 'text-purple-600', iconBg: 'bg-purple-100 text-purple-600' },
  slate: { border: 'border-slate-600', title: 'text-slate-600', bg: 'bg-slate-50', hoverBg: 'group-hover/card:bg-slate-600/10', closingBg: 'bg-slate-600', closingText: 'text-slate-600', iconBg: 'bg-slate-100 text-slate-600' },
};

const MetricRow: React.FC<{ label: string, qty: number, amt: number, colorClass: string, icon: React.ReactNode, closing?: boolean }> = ({ label, qty, amt, colorClass, icon, closing }) => (
  <div className={`flex flex-col gap-1 p-3 rounded-xl bg-white border border-slate-100 transition-all group-hover/card:border-slate-200 group ${closing ? 'shadow-sm ring-1 ring-slate-100' : ''}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${colorClass} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest ${closing ? 'text-slate-800' : 'text-slate-500'}`}>{label}</span>
      </div>
    </div>
    <div className="flex justify-between items-end mt-2">
      <div className="flex flex-col">
        <span className="text-[9px] text-slate-400 font-bold uppercase">Qty</span>
        <span className="text-sm font-bold text-slate-700">{formatNumber(qty)}</span>
      </div>
      <div className="flex flex-col text-right">
        <span className="text-[9px] text-slate-400 font-bold uppercase">Amt</span>
        <span className={`text-sm font-black ${closing ? 'text-slate-900' : 'text-[#c1272d]'}`}>{formatCurrency(amt)}</span>
      </div>
    </div>
  </div>
);

const MetricCard: React.FC<MetricCardProps> = ({ title, metrics, colorScheme = 'indigo', onClick }) => {
  const theme = THEME_MAP[colorScheme] || THEME_MAP.indigo;

  return (
    <button 
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border-t-4 ${theme.border} overflow-hidden flex flex-col text-left transition-all hover:shadow-xl hover:-translate-y-1 group/card w-full outline-none focus:ring-2 focus:ring-slate-200 print:border-l-4 print:border-t-0 print:shadow-none`}
    >
      <div className={`p-4 border-b border-slate-100 ${theme.bg} ${theme.hoverBg} transition-colors flex justify-between items-center`}>
        <h3 className={`text-sm font-black ${theme.title} uppercase tracking-tight truncate pr-4`} title={title}>
          {title}
        </h3>
        <Search className={`w-4 h-4 ${theme.title} opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden`} />
      </div>
      
      <div className="p-4 grid grid-cols-1 gap-2.5">
        <MetricRow 
          label="Opening Bal" 
          qty={metrics.openingQty} 
          amt={metrics.openingAmt} 
          colorClass="bg-slate-100 text-slate-600"
          icon={<Calculator className="w-3.5 h-3.5" />}
        />
        <MetricRow 
          label="Issues" 
          qty={metrics.issuesQty} 
          amt={metrics.issuesAmt} 
          colorClass="bg-red-50 text-red-600"
          icon={<ArrowDownRight className="w-3.5 h-3.5" />}
        />
        <MetricRow 
          label="Receipts" 
          qty={metrics.receiptsQty} 
          amt={metrics.receiptsAmt} 
          colorClass="bg-green-50 text-green-600"
          icon={<ArrowUpRight className="w-3.5 h-3.5" />}
        />
        <div className="mt-1 border-t border-dashed border-slate-200 pt-3">
          <MetricRow 
            label="Closing Bal" 
            qty={metrics.closingQty} 
            amt={metrics.closingAmt} 
            colorClass={theme.iconBg}
            icon={<Package className="w-3.5 h-3.5" />}
            closing
          />
        </div>
      </div>
      <div className={`px-4 py-2 bg-slate-50 text-[9px] font-bold uppercase ${theme.closingText} tracking-widest text-center opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden`}>
        Click to view office-wise breakdown
      </div>
    </button>
  );
};

export default MetricCard;
