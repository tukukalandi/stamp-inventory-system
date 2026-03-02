
import React, { useMemo } from 'react';
import { RawRow, ReportMetadata } from '../types';
import { formatNumber } from '../utils/helpers';
import { FileSpreadsheet, FileText, Landmark, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DivisionReportTableProps {
  data: RawRow[]; 
  allData: RawRow[];
  meta: ReportMetadata | null;
}

interface DivisionRow {
  sl: number;
  label: string;
  opening: number;
  receipts: number;
  issues: number;
  closing: number;
}

const DivisionReportTable: React.FC<DivisionReportTableProps> = ({ data, allData, meta }) => {
  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const reportRows = useMemo(() => {
    const finalRows: DivisionRow[] = [
      { sl: 1, label: 'Post Cards (PC)', opening: 0, receipts: 0, issues: 0, closing: 0 },
      { sl: 2, label: 'Meghdoot Post Card (MPC)', opening: 0, receipts: 0, issues: 0, closing: 0 },
      { sl: 3, label: 'Envelopes (Ordinary and Advertisement)', opening: 0, receipts: 0, issues: 0, closing: 0 },
      { sl: 4, label: 'Inland Letter Card (ILC)', opening: 0, receipts: 0, issues: 0, closing: 0 },
      { sl: 5, label: 'Indian Postal Order (IPO)', opening: 0, receipts: 0, issues: 0, closing: 0 },
      { sl: 6, label: 'Commemorative Postage Stamp - Miniature', opening: 0, receipts: 0, issues: 0, closing: 0 },
      { sl: 7, label: 'Commemorative Postage Stamp - Sheetlets', opening: 0, receipts: 0, issues: 0, closing: 0 },
      { sl: 8, label: 'Commemorative Postage Stamp (General)', opening: 0, receipts: 0, issues: 0, closing: 0 },
      { sl: 9, label: 'Commemorative Postage Stamp - My Stamps', opening: 0, receipts: 0, issues: 0, closing: 0 },
      { sl: 10, label: 'India Public Postage Stamp (Definitive stamps)', opening: 0, receipts: 0, issues: 0, closing: 0 },
      { sl: 11, label: 'India Service Postage Stamp', opening: 0, receipts: 0, issues: 0, closing: 0 },
      { sl: 12, label: 'Other Philately Items (Revenue, Gangajal, Retail Post, etc.)', opening: 0, receipts: 0, issues: 0, closing: 0 },
    ];

    const itemsMap: { [key: string]: RawRow[] } = {};
    allData.forEach(row => {
      const key = `${row.office_id}_${row.denomination_id}_${row.denomination_value}`;
      if (!itemsMap[key]) itemsMap[key] = [];
      itemsMap[key].push(row);
    });

    Object.values(itemsMap).forEach(records => {
      const sorted = [...records].sort((a, b) => (a.trans_date?.getTime() || 0) - (b.trans_date?.getTime() || 0));
      const first = sorted[0];
      const faceValue = Number(first.denomination_value) || 0;
      const desc = String(first.denomination_desc || '').toUpperCase();
      const cat = String(first.category_desc || '').toUpperCase();
      const prod = String(first.product_category || '').toUpperCase();

      let rowIndex = 11;
      const isIPO = desc.includes('INDIAN POSTAL ORDER') || desc.includes('POSTAL ORDER') || cat.includes('POSTAL ORDER') || desc.includes('IPO');
      
      if (isIPO) rowIndex = 4;
      else if (desc.includes('MEGHDOOT')) rowIndex = 1;
      else if (desc.includes('POST CARD') || desc.includes(' PC ')) rowIndex = 0;
      else if (desc.includes('ENVELOPE')) rowIndex = 2;
      else if (desc.includes('INLAND')) rowIndex = 3;
      else if (prod.includes('SERVICE')) rowIndex = 10;
      else if (prod.includes('MY STAMP')) rowIndex = 8;
      else if (prod.includes('MINIATURE')) rowIndex = 5;
      else if (prod.includes('SHEETLET')) rowIndex = 6;
      else if (prod.includes('DEFINITIVE')) rowIndex = 9;
      else if (prod.includes('COMMEMORATIVE')) rowIndex = 7;
      else rowIndex = 11;

      const itemOpeningQty = Number(sorted[0].opening_bal) || 0;
      const periodRecords = sorted.filter(r => data.some(dr => dr === r));
      const rSum = periodRecords.reduce((sum, r) => sum + (Number(r.receipts) || 0), 0);
      const iSum = periodRecords.reduce((sum, r) => sum + (Number(r.issues) || 0), 0);
      
      const openingAmt = itemOpeningQty * faceValue;
      const receiptsAmt = rSum * faceValue;
      const issuesAmt = iSum * faceValue;
      const closingAmt = openingAmt + receiptsAmt - issuesAmt;

      finalRows[rowIndex].opening += openingAmt;
      finalRows[rowIndex].receipts += receiptsAmt;
      finalRows[rowIndex].issues += issuesAmt;
      finalRows[rowIndex].closing += closingAmt;
    });

    return finalRows;
  }, [data, allData]);

  const grandTotals = useMemo(() => {
    return reportRows.reduce((acc, curr) => ({
      opening: acc.opening + curr.opening,
      receipts: acc.receipts + curr.receipts,
      issues: acc.issues + curr.issues,
      closing: acc.closing + curr.closing,
    }), { opening: 0, receipts: 0, issues: 0, closing: 0 });
  }, [reportRows]);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn print:block print:h-auto print:overflow-visible">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-3xl border-2 border-slate-100 shadow-sm flex-1">
          <div className="p-3 bg-[#fffcf0] rounded-2xl">
            <Landmark className="w-6 h-6 text-[#c1272d]" />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Division Context</h4>
            <p className="text-[11px] font-bold text-slate-600">{meta?.divisionName || 'Not Defined'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 px-8 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-black transition-all group">
            <Printer className="w-4 h-4" /> Generate PDF Report
          </button>
        </div>
      </div>

      <div className="bg-white border-[2px] border-black shadow-2xl print:border-black print:shadow-none overflow-hidden print:overflow-visible print:h-auto print:block">
        <div className="border-b-[2px] border-black p-6 flex flex-col items-center justify-center bg-slate-50 print:bg-white print:border-black print:p-8">
          <h2 className="text-xl font-black uppercase tracking-widest text-black text-center leading-tight">
            Statement of Philately Inventory
          </h2>
          <div className="flex flex-col items-center gap-1 mt-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 tracking-widest">
              Office: <span className="text-black font-black">{meta?.officeName} ({meta?.officeId})</span>
            </p>
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">
              Division: <span className="text-black font-black">{meta?.divisionName}</span>
            </p>
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">
              Period: <span className="text-black font-black">{meta?.fromDate} to {meta?.toDate}</span>
            </p>
          </div>
        </div>
        
        <table className="w-full text-left border-collapse table-auto print:table print:w-full print:border-black print:overflow-visible">
          <thead>
            <tr className="bg-slate-100 border-b-[2px] border-black print:bg-slate-50 print:border-black">
              <th className="px-2 py-4 border-r-[2px] border-black text-[10px] font-black uppercase w-12 text-center text-black print:border-black">Sl.No</th>
              <th className="px-4 py-4 border-r-[2px] border-black text-[10px] font-black uppercase text-black print:border-black">Name of items</th>
              <th className="px-4 py-4 border-r-[2px] border-black text-[10px] font-black uppercase text-center text-black print:border-black">Opening Value</th>
              <th className="px-4 py-4 border-r-[2px] border-black text-[10px] font-black uppercase text-center text-black print:border-black">Receipts Value</th>
              <th className="px-4 py-4 border-r-[2px] border-black text-[10px] font-black uppercase text-center text-black print:border-black">Issues Value</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase text-center text-[#c1272d] print:text-black">Closing Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/20 print:divide-black">
            {reportRows.map((row) => (
              <tr key={row.sl} className="hover:bg-slate-50/50 transition-colors print:border-black break-inside-avoid">
                <td className="px-2 py-3 border-r-[2px] border-black text-center font-bold text-black text-[11px]">{row.sl}</td>
                <td className="px-4 py-3 border-r-[2px] border-black font-black text-[11px] text-slate-800 uppercase print:border-black">{row.label}</td>
                <td className="px-4 py-3 border-r-[2px] border-black text-right text-[12px] font-medium text-slate-700">{row.opening > 0 ? formatNumber(row.opening) : '—'}</td>
                <td className="px-4 py-3 border-r-[2px] border-black text-right text-[12px] font-medium text-emerald-700">{row.receipts > 0 ? formatNumber(row.receipts) : '—'}</td>
                <td className="px-4 py-3 border-r-[2px] border-black text-right text-[12px] font-medium text-red-700">{row.issues > 0 ? formatNumber(row.issues) : '—'}</td>
                <td className="px-4 py-3 text-right text-[12px] font-black text-slate-900 bg-[#fffcf0]/30">{row.closing > 0 ? formatNumber(row.closing) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-[2px] border-black bg-slate-900 text-white font-black print:bg-slate-100 print:text-black print:border-black">
              <td colSpan={2} className="px-4 py-6 text-center uppercase text-[12px] tracking-widest border-r-[2px] border-white/20 print:border-black">Grand Total</td>
              <td className="px-4 py-6 text-right border-r-[2px] border-white/20 text-[12px]">{formatNumber(grandTotals.opening)}</td>
              <td className="px-4 py-6 text-right border-r-[2px] border-white/20 text-[12px] text-emerald-400">{formatNumber(grandTotals.receipts)}</td>
              <td className="px-4 py-6 text-right border-r-[2px] border-white/20 text-[12px] text-red-400">{formatNumber(grandTotals.issues)}</td>
              <td className="px-4 py-6 text-right text-[14px] font-black text-[#ffcc00] bg-white/10">{formatNumber(grandTotals.closing)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="hidden print:grid grid-cols-2 gap-24 mt-12 px-12 mb-12">
        <div className="flex flex-col items-center text-center">
          <div className="w-full border-b border-black mb-2"></div>
          <span className="text-[10px] font-black uppercase">Prepared By</span>
          <span className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Philately In-charge</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="w-full border-b border-black mb-2"></div>
          <span className="text-[10px] font-black uppercase">Counter Signed By</span>
          <span className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Postmaster / Superintendent</span>
        </div>
      </div>
    </div>
  );
};

export default DivisionReportTable;
