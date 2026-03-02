
import React, { useState, useMemo } from 'react';
import { RawRow } from '../types';
import { formatCurrency, formatNumber } from '../utils/helpers';
import { Search, Ticket, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DenominationReportTableProps {
  data: RawRow[];
}

const DenominationReportTable: React.FC<DenominationReportTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const aggregatedData = useMemo(() => {
    const descGroups: { [key: string]: RawRow[] } = {};
    data.forEach(row => {
      const desc = String(row.denomination_desc || 'Unspecified Stamp').trim();
      if (!descGroups[desc]) descGroups[desc] = [];
      descGroups[desc].push(row);
    });

    return Object.entries(descGroups).map(([desc, groupRows]) => {
      const itemGroups: { [key: string]: RawRow[] } = {};
      groupRows.forEach(row => {
        const key = `${row.office_id}_${row.denomination_id}`;
        if (!itemGroups[key]) itemGroups[key] = [];
        itemGroups[key].push(row);
      });

      const metrics = {
        faceValue: Number(groupRows[0].denomination_value) || 0,
        openingQty: 0, openingAmt: 0,
        issuesQty: 0, issuesAmt: 0,
        receiptsQty: 0, receiptsAmt: 0,
        closingQty: 0, closingAmt: 0
      };

      Object.values(itemGroups).forEach(records => {
        const sorted = [...records].sort((a, b) => 
          (a.trans_date?.getTime() || 0) - (b.trans_date?.getTime() || 0)
        );
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const dv = Number(first.denomination_value) || 0;

        metrics.openingQty += Number(first.opening_bal) || 0;
        metrics.openingAmt += (Number(first.opening_bal) || 0) * dv;

        const rSum = sorted.reduce((s, r) => s + (Number(r.receipts) || 0), 0);
        const iSum = sorted.reduce((s, r) => s + (Number(r.issues) || 0), 0);
        metrics.receiptsQty += rSum;
        metrics.receiptsAmt += rSum * dv;
        metrics.issuesQty += iSum;
        metrics.issuesAmt += iSum * dv;

        metrics.closingQty += Number(last.closing_bal) || 0;
        metrics.closingAmt += Number(last.Total) || (Number(last.closing_bal) || 0) * dv;
      });

      return {
        description: desc,
        ...metrics
      };
    });
  }, [data]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return aggregatedData;
    const lower = searchTerm.toLowerCase();
    return aggregatedData.filter(d => d.description.toLowerCase().includes(lower));
  }, [aggregatedData, searchTerm]);

  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      openingQty: acc.openingQty + curr.openingQty,
      openingAmt: acc.openingAmt + curr.openingAmt,
      issuesQty: acc.issuesQty + curr.issuesQty,
      issuesAmt: acc.issuesAmt + curr.issuesAmt,
      receiptsQty: acc.receiptsQty + curr.receiptsQty,
      receiptsAmt: acc.receiptsAmt + curr.receiptsAmt,
      closingQty: acc.closingQty + curr.closingQty,
      closingAmt: acc.closingAmt + curr.closingAmt,
    }), { openingQty: 0, openingAmt: 0, issuesQty: 0, issuesAmt: 0, receiptsQty: 0, receiptsAmt: 0, closingQty: 0, closingAmt: 0 });
  }, [filteredData]);

  const handleExportXLSX = () => {
    const wsData = filteredData.map(row => ({
      'Stamp Description': row.description,
      'Face Value': row.faceValue,
      'Opening (Qty)': row.openingQty,
      'Opening (Amt)': row.openingAmt,
      'Issues (Qty)': row.issuesQty,
      'Issues (Amt)': row.issuesAmt,
      'Receipts (Qty)': row.receiptsQty,
      'Receipts (Amt)': row.receiptsAmt,
      'Closing Balance (Qty)': row.closingQty,
      'Closing Balance (Amt)': row.closingAmt
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Denomination Report");
    XLSX.writeFile(wb, "Stamp_Denomination_Report.xlsx");
  };

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c1272d]" />
          <input 
            type="text"
            placeholder="Search stamp description..."
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-[#c1272d] transition-all font-bold text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportXLSX} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-emerald-700 transition-all shadow-lg">
            <FileSpreadsheet className="w-4 h-4" />
            Excel Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden overflow-x-auto print:shadow-none print:border-slate-300">
        <table className="w-full text-left border-collapse min-w-[1100px] print:min-w-0">
          <thead>
            <tr className="bg-[#fffcf0] border-b-2 border-[#ffcc00] print:bg-slate-50">
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#c1272d]">Stamp Description</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Face Value</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-50">Opening (Qty)</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Issues (Qty)</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Receipts (Qty)</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-900 text-right border-l border-slate-100 bg-slate-50/50">Closing Balance (Qty | Val)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-[13px]">
            {filteredData.map((row) => (
              <tr key={row.description} className="hover:bg-red-50/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-4 h-4 text-[#ffcc00] print:hidden" />
                    <span className="font-black text-slate-800 uppercase tracking-tight">{row.description}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="font-bold text-slate-500">₹{row.faceValue}</span>
                </td>
                <td className="px-6 py-4 text-center border-l border-slate-50">
                  <span className="font-medium text-slate-600">{formatNumber(row.openingQty)}</span>
                </td>
                <td className="px-6 py-4 text-center text-red-600">
                  <span className="font-bold">-{formatNumber(row.issuesQty)}</span>
                </td>
                <td className="px-6 py-4 text-center text-emerald-600">
                  <span className="font-bold">+{formatNumber(row.receiptsQty)}</span>
                </td>
                <td className="px-6 py-4 text-right border-l border-slate-100 bg-[#fffcf0]/30">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900">{formatNumber(row.closingQty)} Qty</span>
                    <span className="text-[11px] font-black text-[#c1272d]">{formatCurrency(row.closingAmt)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[#c1272d] text-white print:bg-slate-200 print:text-slate-900">
            <tr className="border-t-4 border-[#ffcc00]">
              <td colSpan={2} className="px-6 py-6 text-xs font-black uppercase tracking-widest text-center">Grand Summary</td>
              <td className="px-6 py-6 text-center text-sm">{formatNumber(totals.openingQty)}</td>
              <td className="px-6 py-6 text-center text-sm">-{formatNumber(totals.issuesQty)}</td>
              <td className="px-6 py-6 text-center text-sm">+{formatNumber(totals.receiptsQty)}</td>
              <td className="px-6 py-6 text-right bg-black/10 border-l border-white/10">
                <div className="flex flex-col">
                  <span className="text-sm font-black underline decoration-[#ffcc00] underline-offset-4">{formatNumber(totals.closingQty)} Qty</span>
                  <span className="text-xs text-[#ffcc00] font-black mt-1 print:text-slate-900">{formatCurrency(totals.closingAmt)}</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default DenominationReportTable;
