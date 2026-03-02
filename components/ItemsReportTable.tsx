
import React, { useState, useMemo } from 'react';
import { RawRow } from '../types';
import { formatNumber } from '../utils/helpers';
import { Search, FileSpreadsheet, Package, Landmark, Printer, X, ArrowLeft, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ItemsReportTableProps {
  data: RawRow[];
  allData: RawRow[];
  initialFilter?: { value: string, type: 'CATEGORY' | 'PRODUCT' } | null;
  onClearFilter?: () => void;
  onGoToOfficeWise?: () => void;
}

interface ItemSummary {
  name: string;
  denominationValue: number; 
  itemCode: string | number;
  openingQty: number;
  openingAmt: number;
  receiptsQty: number;
  receiptsAmt: number;
  issuesQty: number;
  issuesAmt: number;
  closingQty: number;
  closingAmt: number;
}

const ItemsReportTable: React.FC<ItemsReportTableProps> = ({ data, allData, initialFilter, onClearFilter, onGoToOfficeWise }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handlePrint = () => {
    window.print();
  };

  // Filter the source data if a category/product filter is active
  const filteredSourceData = useMemo(() => {
    if (!initialFilter) return { data, allData };
    
    const filterFn = (r: RawRow) => {
      if (initialFilter.type === 'CATEGORY') {
        return r.category_desc === initialFilter.value;
      } else {
        return r.product_category === initialFilter.value;
      }
    };

    return {
      data: data.filter(filterFn),
      allData: allData.filter(filterFn)
    };
  }, [data, allData, initialFilter]);

  const reportData = useMemo(() => {
    const { data: periodData, allData: fullData } = filteredSourceData;
    
    const itemDefinitions: { [key: string]: { name: string, value: number, code: any } } = {};
    fullData.forEach(row => {
      const nameStr = String(row.denomination_desc || 'Unnamed Item').trim();
      const faceVal = Number(row.denomination_value) || 0;
      const code = row.denomination_id || 'N/A';
      
      const key = `${nameStr}_${faceVal}`;
      if (!itemDefinitions[key]) {
        itemDefinitions[key] = { 
          name: nameStr, 
          value: faceVal,
          code: code
        };
      }
    });

    const summaries: ItemSummary[] = Object.values(itemDefinitions).map((def) => {
      let totalOpeningQty = 0;
      let totalReceiptsQty = 0;
      let totalIssuesQty = 0;

      const thisItemAllRecords = fullData.filter(r => 
        String(r.denomination_desc || '').trim() === def.name && 
        Number(r.denomination_value || 0) === def.value
      );

      const officeGroups: { [key: string]: RawRow[] } = {};
      thisItemAllRecords.forEach(r => {
        const key = `${r.office_id}_${r.denomination_id}`;
        if (!officeGroups[key]) officeGroups[key] = [];
        officeGroups[key].push(r);
      });

      Object.values(officeGroups).forEach(records => {
        const sorted = [...records].sort((a, b) => (a.trans_date?.getTime() || 0) - (b.trans_date?.getTime() || 0));
        
        const officeItemOpeningQty = Number(sorted[0].opening_bal) || 0;
        totalOpeningQty += officeItemOpeningQty;

        const periodRecordsForThisOfficeItem = sorted.filter(r => periodData.some(dr => dr === r));
        const rSum = periodRecordsForThisOfficeItem.reduce((sum, r) => sum + (Number(r.receipts) || 0), 0);
        const iSum = periodRecordsForThisOfficeItem.reduce((sum, r) => sum + (Number(r.issues) || 0), 0);
        totalReceiptsQty += rSum;
        totalIssuesQty += iSum;
      });

      const openingAmt = totalOpeningQty * def.value;
      const receiptsAmt = totalReceiptsQty * def.value;
      const issuesAmt = totalIssuesQty * def.value;
      const closingQty = totalOpeningQty + totalReceiptsQty - totalIssuesQty;
      const closingAmt = closingQty * def.value;

      return {
        name: def.name,
        denominationValue: def.value,
        itemCode: def.code,
        openingQty: totalOpeningQty,
        openingAmt,
        receiptsQty: totalReceiptsQty,
        receiptsAmt,
        issuesQty: totalIssuesQty,
        issuesAmt,
        closingQty,
        closingAmt
      };
    });

    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredSourceData]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return reportData;
    const lower = searchTerm.toLowerCase();
    return reportData.filter(d => 
      d.name.toLowerCase().includes(lower) || 
      String(d.denominationValue).toLowerCase().includes(lower) ||
      String(d.itemCode).toLowerCase().includes(lower)
    );
  }, [reportData, searchTerm]);

  const grandTotals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      openingQty: acc.openingQty + curr.openingQty,
      openingAmt: acc.openingAmt + curr.openingAmt,
      receiptsQty: acc.receiptsQty + curr.receiptsQty,
      receiptsAmt: acc.receiptsAmt + curr.receiptsAmt,
      issuesQty: acc.issuesQty + curr.issuesQty,
      issuesAmt: acc.issuesAmt + curr.issuesAmt,
      closingQty: acc.closingQty + curr.closingQty,
      closingAmt: acc.closingAmt + curr.closingAmt,
    }), { 
      openingQty: 0, openingAmt: 0, 
      receiptsQty: 0, receiptsAmt: 0, 
      issuesQty: 0, issuesAmt: 0, 
      closingQty: 0, closingAmt: 0 
    });
  }, [filteredData]);

  const handleExportXLSX = () => {
    const exportData = filteredData.map((r, idx) => ({
      'Sl No': idx + 1,
      'Item Description': r.name,
      'Denomination': r.denominationValue,
      'Opening Qty': r.openingQty,
      'Opening Value': r.openingAmt,
      'Receipts Qty': r.receiptsQty,
      'Receipts Value': r.receiptsAmt,
      'Issues Qty': r.issuesQty,
      'Issues Value': r.issuesAmt,
      'Closing Qty': r.closingQty,
      'Closing Value': r.closingAmt
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Items Detailed Report");
    XLSX.writeFile(wb, `${initialFilter?.value || 'Consolidated'}_Items_Report.xlsx`);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn print:block print:h-auto print:overflow-visible">
      {/* Filter Info Header */}
      {initialFilter && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm print:hidden">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#fffcf0] rounded-2xl">
              <Package className="w-8 h-8 text-[#c1272d]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Viewing Results for</span>
                <span className="px-2 py-0.5 bg-[#c1272d]/10 text-[#c1272d] text-[9px] font-black uppercase rounded">{initialFilter.type}</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mt-1">{initialFilter.value}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onGoToOfficeWise}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase hover:border-[#c1272d] hover:text-[#c1272d] transition-all"
            >
              <Building2 className="w-4 h-4" /> View Office-Wise
            </button>
            <button 
              onClick={onClearFilter}
              className="flex items-center gap-2 px-6 py-3 bg-[#c1272d] text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all"
            >
              <X className="w-4 h-4" /> Clear Selection
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c1272d]" />
          <input 
            type="text"
            placeholder="Search items by name or face value..."
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-[#c1272d] font-bold text-sm shadow-sm text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handlePrint} 
            className="flex items-center gap-2 px-8 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-black transition-all group"
          >
            <Printer className="w-4 h-4" /> 
            Print Table
          </button>
          <button 
            type="button"
            onClick={handleExportXLSX} 
            className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-emerald-700 transition-all group"
          >
            <FileSpreadsheet className="w-4 h-4" /> 
            Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white border-[2px] border-black shadow-xl overflow-hidden overflow-x-auto print:border-black print:shadow-none print:overflow-visible print:h-auto">
        <table className="w-full text-left border-collapse min-w-[1300px] print:min-w-0 print:w-full print:overflow-visible print:table">
          <thead>
            <tr className="bg-slate-100 border-b-[2px] border-black print:bg-white print:border-black">
              <th className="px-2 py-4 border-r-[2px] border-black text-[10px] font-black uppercase w-16 text-center text-black print:border-black">Sl No</th>
              <th className="px-4 py-4 border-r-[2px] border-black text-[10px] font-black uppercase text-black print:border-black">Stamp Name / Description</th>
              <th className="px-4 py-4 border-r-[2px] border-black text-[10px] font-black uppercase text-black print:border-black text-center">Face Value</th>
              <th className="px-4 py-4 border-r-[2px] border-black text-[10px] font-black uppercase text-center text-black print:border-black">Opening (Qty | Amt)</th>
              <th className="px-4 py-4 border-r-[2px] border-black text-[10px] font-black uppercase text-center text-black print:border-black">Receipts (Qty | Amt)</th>
              <th className="px-4 py-4 border-r-[2px] border-black text-[10px] font-black uppercase text-center text-black print:border-black">Issues (Qty | Amt)</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase text-center text-[#c1272d] bg-red-50/50 print:bg-white print:text-black">Closing (Qty | Amt)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/20 print:divide-black">
            {filteredData.length > 0 ? filteredData.map((row, idx) => (
              <tr key={`${row.name}_${row.denominationValue}`} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-2 py-4 border-r-[2px] border-black text-center font-bold text-slate-400 text-[11px] print:border-black print:text-black">{idx + 1}</td>
                <td className="px-4 py-4 border-r-[2px] border-black print:border-black">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-800 uppercase text-[11px] leading-tight print:text-black">{row.name}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 print:text-black">Item ID: {row.itemCode}</span>
                  </div>
                </td>
                <td className="px-4 py-4 border-r-[2px] border-black print:border-black text-center font-black text-slate-800 text-[12px]">₹{row.denominationValue}</td>
                <td className="px-4 py-4 border-r-[2px] border-black print:border-black text-center">
                   <div className="flex flex-col text-[11px]">
                     <span className="font-bold text-slate-600 print:text-black">Q: {formatNumber(row.openingQty)}</span>
                     <span className="font-black text-slate-800 print:text-black">A: {formatNumber(row.openingAmt)}</span>
                   </div>
                </td>
                <td className="px-4 py-4 border-r-[2px] border-black print:border-black text-center">
                   <div className="flex flex-col text-[11px]">
                     <span className="font-bold text-slate-400 print:text-black">Q: {formatNumber(row.receiptsQty)}</span>
                     <span className="font-black text-emerald-600 print:text-black">A: {formatNumber(row.receiptsAmt)}</span>
                   </div>
                </td>
                <td className="px-4 py-4 border-r-[2px] border-black print:border-black text-center">
                   <div className="flex flex-col text-[11px]">
                     <span className="font-bold text-slate-400 print:text-black">Q: {formatNumber(row.issuesQty)}</span>
                     <span className="font-black text-red-600 print:text-black">A: {formatNumber(row.issuesAmt)}</span>
                   </div>
                </td>
                <td className="px-4 py-4 bg-red-50/30 print:bg-white text-center">
                   <div className="flex flex-col">
                     <span className="text-[11px] font-black text-slate-900 print:text-black">Q: {formatNumber(row.closingQty)}</span>
                     <span className="text-[13px] font-black text-[#c1272d] print:text-black">A: {formatNumber(row.closingAmt)}</span>
                   </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                  No stamps found in this category.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-black text-white font-black border-t-[2px] border-black print:bg-white print:text-black print:border-black">
              <td colSpan={3} className="px-4 py-6 text-center uppercase tracking-widest text-xs">Consolidated Net Valuation</td>
              <td className="px-4 py-6 text-center border-r border-white/20 text-[11px] print:border-black">A: {formatNumber(grandTotals.openingAmt)}</td>
              <td className="px-4 py-6 text-center border-r border-white/20 text-[11px] print:border-black">A: {formatNumber(grandTotals.receiptsAmt)}</td>
              <td className="px-4 py-6 text-center border-r border-white/20 text-[11px] print:border-black">A: {formatNumber(grandTotals.issuesAmt)}</td>
              <td className="px-4 py-6 text-center bg-white/10 text-[#ffcc00] print:text-black text-lg">{formatNumber(grandTotals.closingAmt)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ItemsReportTable;
