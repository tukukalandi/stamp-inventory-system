
import React, { useState, useMemo } from 'react';
import { RawRow, OfficeMap, PRODUCT_LIST, CATEGORY_LIST, HOStructure, AggregatedData } from '../types';
import { formatNumber, aggregateDataByField } from '../utils/helpers';
import { Search, Building2, Layers, Filter, FileSpreadsheet, Building, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface OfficeReportTableProps {
  data: RawRow[]; 
  allData: RawRow[];
  officeMap: OfficeMap;
  hoStructure: HOStructure;
  initialFilter?: { value: string, type: 'CATEGORY' | 'PRODUCT' };
}

const OfficeReportTable: React.FC<OfficeReportTableProps> = ({ data, allData, officeMap, hoStructure, initialFilter }) => {
  const [selectedHO, setSelectedHO] = useState<string | null>(initialFilter ? 'ALL_OFFICES' : null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'CATEGORY' | 'PRODUCT'>(initialFilter?.type || 'PRODUCT');
  const [selectedItem, setSelectedItem] = useState<string | null>(initialFilter?.value || null);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const hoOptions = Object.keys(hoStructure);

  const hoCards = useMemo(() => {
    const allOfficeIds = [...new Set(data.map(row => String(row.office_id)))];
    const totalValuation = data.reduce((sum, row) => sum + (Number(row.Total) || 0), 0);

    const base = [
      { id: 'ALL_OFFICES', name: "All Offices", val: totalValuation, count: allOfficeIds.length, icon: <Layers className="w-5 h-5" /> },
      ...hoOptions.map(ho => {
        const ids = hoStructure[ho].offices;
        const hoData = data.filter(r => ids.includes(String(r.office_id)));
        const val = hoData.reduce((s, r) => s + (Number(r.Total) || 0), 0);
        return { id: ho, name: hoStructure[ho].displayName, val, count: ids.length, icon: <Building2 className="w-5 h-5" /> };
      })
    ];
    return base;
  }, [data, hoStructure, hoOptions]);

  const currentHOOfficesData = useMemo(() => {
    if (!selectedHO) return { filtered: [], all: [] };
    if (selectedHO === 'ALL_OFFICES') return { filtered: data, all: allData };
    const officeIds = hoStructure[selectedHO]?.offices || [];
    return {
      filtered: data.filter(row => officeIds.includes(String(row.office_id))),
      all: allData.filter(row => officeIds.includes(String(row.office_id)))
    };
  }, [data, allData, selectedHO, hoStructure]);

  const tableData = useMemo(() => {
    if (!selectedHO || !selectedItem) return [];
    
    const filteredRowsForTable = currentHOOfficesData.filtered.filter(row => 
      viewMode === 'PRODUCT' 
        ? row.product_category === selectedItem 
        : row.category_desc === selectedItem
    );

    const aggregatedByOffice: AggregatedData = aggregateDataByField(
      filteredRowsForTable, 
      'office_id', 
      currentHOOfficesData.all.filter(row => 
        viewMode === 'PRODUCT' 
          ? row.product_category === selectedItem 
          : row.category_desc === selectedItem
      )
    );

    return Object.entries(aggregatedByOffice).map(([id, metrics]) => ({
      id,
      name: officeMap[id] || `Office ${id}`,
      ...metrics
    }));
  }, [currentHOOfficesData, selectedHO, selectedItem, viewMode, officeMap]);

  const filteredTableData = useMemo(() => {
    if (!searchTerm) return tableData;
    const lower = searchTerm.toLowerCase();
    return tableData.filter(d => 
      d.id.toLowerCase().includes(lower) || 
      d.name.toLowerCase().includes(lower)
    );
  }, [tableData, searchTerm]);

  const totals = useMemo(() => {
    return filteredTableData.reduce((acc, curr) => ({
      openingQty: acc.openingQty + curr.openingQty,
      openingAmt: acc.openingAmt + curr.openingAmt,
      issuesQty: acc.issuesQty + curr.issuesQty,
      issuesAmt: acc.issuesAmt + curr.issuesAmt,
      receiptsQty: acc.receiptsQty + curr.receiptsQty,
      receiptsAmt: acc.receiptsAmt + curr.receiptsAmt,
      closingQty: acc.closingQty + curr.closingQty,
      closingAmt: acc.closingAmt + curr.closingAmt,
    }), { openingQty: 0, openingAmt: 0, issuesQty: 0, issuesAmt: 0, receiptsQty: 0, receiptsAmt: 0, closingQty: 0, closingAmt: 0 });
  }, [filteredTableData]);

  const handleExportXLSX = () => {
    const wsData = filteredTableData.map(row => ({
      'Office ID': row.id,
      'Office Name': row.name,
      'Opening Qty': row.openingQty,
      'Opening Amt': row.openingAmt,
      'Issues Qty': row.issuesQty,
      'Issues Amt': row.issuesAmt,
      'Receipts Qty': row.receiptsQty,
      'Receipts Amt': row.receiptsAmt,
      'Closing Qty': row.closingQty,
      'Closing Amt': row.closingAmt
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Office Wise Report");
    XLSX.writeFile(wb, `${selectedHO}_${selectedItem}_Office_Wise_Report.xlsx`);
  };

  return (
    <div className="flex flex-col gap-8 animate-fadeIn print:block print:h-auto print:overflow-visible">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        {hoCards.map((ho) => (
          <button
            key={ho.id}
            onClick={() => { setSelectedHO(ho.id); setSelectedItem(null); }}
            className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
              selectedHO === ho.id 
                ? 'bg-[#c1272d] border-[#c1272d] text-white shadow-lg' 
                : 'bg-white border-slate-100 text-slate-600 hover:border-[#ffcc00]'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${selectedHO === ho.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                {ho.icon}
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Context</span>
                <h4 className="text-sm font-black uppercase truncate max-w-[140px] leading-none mt-0.5">{ho.name}</h4>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedHO && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b-2 border-[#ffcc00] pb-2 print:hidden">
            <div className="flex items-center gap-3">
               <Filter className="w-4 h-4 text-[#c1272d]" />
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Select Product/Category</h3>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('PRODUCT')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'PRODUCT' ? 'bg-[#c1272d] text-white shadow-md' : 'text-slate-500'}`}>Products</button>
              <button onClick={() => setViewMode('CATEGORY')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'CATEGORY' ? 'bg-[#c1272d] text-white shadow-md' : 'text-slate-500'}`}>Categories</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 print:hidden">
            {(viewMode === 'PRODUCT' ? PRODUCT_LIST : CATEGORY_LIST).map(item => {
              const isActive = selectedItem === item;
              return (
                <button
                  key={item}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${isActive ? 'bg-[#fffcf0] border-[#c1272d]' : 'bg-white border-slate-50 hover:border-slate-200'}`}
                >
                  <h5 className={`text-[10px] font-black uppercase leading-tight truncate ${isActive ? 'text-[#c1272d]' : 'text-slate-600'}`}>{item}</h5>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedItem ? (
        <div className="flex flex-col gap-6 animate-fadeIn print:block print:h-auto print:overflow-visible">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c1272d]" />
              <input 
                type="text"
                placeholder="Search unit name or ID..."
                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-[#c1272d] font-bold text-sm text-slate-900 placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={handlePrint} 
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all group"
              >
                <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                Print Office Wise
              </button>
              <button 
                type="button"
                onClick={handleExportXLSX} 
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-emerald-700 transition-all group"
              >
                <FileSpreadsheet className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                Export XLSX
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden overflow-x-auto print:shadow-none print:border-black print:overflow-visible print:h-auto">
            <table className="w-full text-left border-collapse min-w-[1100px] print:min-w-0 print:overflow-visible print:table">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-100 print:bg-white print:border-black">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 print:text-black">Unit ID & Name</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center print:text-black">Opening (Qty | Amt)</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center print:text-black">Issues (Qty | Amt)</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center print:text-black">Receipts (Qty | Amt)</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#c1272d] text-center bg-slate-50/30 print:bg-white print:text-black print:border-black">Closing (Qty | Amt)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 print:divide-black">
                {filteredTableData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-300 print:text-black">{row.id}</span>
                        <span className="font-black text-slate-800 uppercase text-[11px] leading-tight print:text-black">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-bold text-slate-600 print:text-black">Q: {formatNumber(row.openingQty)}</span>
                        <span className="text-[11px] font-black text-slate-800 print:text-black">A: {formatNumber(row.openingAmt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-bold text-red-600 print:text-black">Q: -{formatNumber(row.issuesQty)}</span>
                        <span className="text-[11px] font-black text-red-700 print:text-black">A: {formatNumber(row.issuesAmt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-bold text-emerald-600 print:text-black">Q: +{formatNumber(row.receiptsQty)}</span>
                        <span className="text-[11px] font-black text-emerald-700 print:text-black">A: {formatNumber(row.receiptsAmt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 bg-slate-50/20 print:bg-white">
                      <div className="flex flex-col items-center">
                        <span className="font-black text-slate-900 print:text-black">Q: {formatNumber(row.closingQty)}</span>
                        <span className="text-[12px] font-black text-[#c1272d] print:text-black">A: {formatNumber(row.closingAmt)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white print:bg-white print:text-black print:border-t-2 print:border-black">
                <tr>
                  <td className="px-6 py-6 text-[10px] font-black uppercase tracking-widest">Office Grand Summary</td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold">Q: {formatNumber(totals.openingQty)}</span>
                      <span className="text-[10px] text-slate-400 print:text-black">A: {formatNumber(totals.openingAmt)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-red-400 print:text-black">Q: -{formatNumber(totals.issuesQty)}</span>
                      <span className="text-[10px] text-red-300 print:text-black">A: {formatNumber(totals.issuesAmt)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-emerald-400 print:text-black">Q: +{formatNumber(totals.receiptsQty)}</span>
                      <span className="text-[10px] text-emerald-300 print:text-black">A: {formatNumber(totals.receiptsAmt)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 bg-white/10 print:bg-white">
                    <div className="flex flex-col items-center">
                      <span className="text-base font-black text-white print:text-black">Q: {formatNumber(totals.closingQty)}</span>
                      <span className="text-[11px] text-[#ffcc00] font-black print:text-black">A: {formatNumber(totals.closingAmt)}</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center border-4 border-dashed border-slate-100 rounded-3xl">
           <Building className="w-12 h-12 text-slate-200 mx-auto mb-4" />
           <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Select an office context and product category to view unit-wise performance</p>
        </div>
      )}
    </div>
  );
};

export default OfficeReportTable;
