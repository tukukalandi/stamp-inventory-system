
import { RawRow, MetricGroup, AggregatedData } from '../types';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number): string => {
  if (value === 0) return '0';
  if (!value) return '0';
  return new Intl.NumberFormat('en-IN').format(value);
};

/**
 * Format a Date object to Indian Style DD.MM.YYYY
 */
export const formatDateIndian = (date: Date | null): string => {
  if (!date || isNaN(date.getTime())) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
};

/**
 * Strict Manual Date Parser
 * Specifically designed to prioritize DD.MM.YYYY and handle Excel serials.
 * Bypasses new Date(string) to prevent browser locale swapping.
 */
export const parseDate = (val: any): Date | null => {
  if (!val) return null;
  
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  
  let str = String(val).trim();
  if (!str) return null;

  // Handle Excel Serial Numbers
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const date = new Date(Math.round((Number(str) - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }

  // Remove time component if present
  const dateStr = str.split(/\s+/)[0];
  const parts = dateStr.split(/[-/.]/);
  
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    if (isNaN(p0) || isNaN(p1) || isNaN(p2)) return null;

    let day: number, month: number, year: number;

    // Pattern: 01.11.2025 or 01-11-2025 or 01/11/2025 (Indian Style Priority)
    if (parts[2].length === 4) {
      day = p0;
      month = p1;
      year = p2;
    } 
    // Pattern: 2025-11-01 (ISO Style Fallback)
    else if (parts[0].length === 4) {
      year = p0;
      month = p1;
      day = p2;
    } else {
      // Ambiguous short year (e.g. 01/11/25), assume Indian DD/MM/YY
      day = p0;
      month = p1;
      year = 2000 + p2;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year > 1900) {
      const d = new Date(year, month - 1, day, 0, 0, 0, 0);
      // Verify date didn't roll over (e.g. Feb 31 -> Mar 3)
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return d;
      }
    }
  }
  return null;
};

export const normalizeData = (data: any[]): RawRow[] => {
  const mapping: Record<string, string> = {
    'trans_date': 'trans_date', 'date': 'trans_date', 'transaction date': 'trans_date', 'trans date': 'trans_date',
    'opening_bal': 'opening_bal', 'opening balance': 'opening_bal', 'opening bal': 'opening_bal', 'op bal': 'opening_bal', 'op_bal': 'opening_bal', 'opening': 'opening_bal', 'opening balance (qty)': 'opening_bal',
    'issues': 'issues', 'issue': 'issues', 'sold': 'issues', 'item sold': 'issues', 'qty sold': 'issues', 'outward': 'issues', 'qty issues': 'issues',
    'receipts': 'receipts', 'receipt': 'receipts', 'items received': 'receipts', 'qty recd': 'receipts', 'qty_recd': 'receipts', 'inward': 'receipts', 'qty receipts': 'receipts',
    'closing_bal': 'closing_bal', 'closing balance': 'closing_bal', 'closing bal': 'closing_bal', 'cl bal': 'closing_bal', 'cl_bal': 'closing_bal', 'closing': 'closing_bal', 'closing balance (qty)': 'closing_bal',
    'denomination_id': 'denomination_id', 'denom_id': 'denomination_id', 'item code': 'denomination_id', 'item_code': 'denomination_id', 'material': 'denomination_id',
    'denomination_value': 'denomination_value', 'denom value': 'denomination_value', 'face value': 'denomination_value', 'denomination': 'denomination_value', 'value': 'denomination_value', 'deno': 'denomination_value',
    'denomination_desc': 'denomination_desc', 'description': 'denomination_desc', 'item name': 'denomination_desc', 'name of item': 'denomination_desc', 'material description': 'denomination_desc',
    'category_desc': 'category_desc', 'category description': 'category_desc', 'category': 'category_desc',
    'product_category': 'product_category', 'product category': 'product_category', 'product': 'product_category',
    'total': 'Total', 'grand total': 'Total', 'amount': 'Total', 'closing amount': 'Total', 'valution': 'Total', 'total value': 'Total'
  };

  return data.map(row => {
    const normalized: any = {};
    normalized.office_id = row.office_id || row['Office ID'] || row['Customer ID'] || row['Office'] || 'Unknown';
    
    Object.keys(row).forEach(key => {
      const lowerKey = key.toLowerCase().trim();
      const targetKey = mapping[lowerKey];
      if (targetKey) normalized[targetKey] = row[key];
    });

    normalized.trans_date = parseDate(normalized.trans_date);
    
    const toNum = (v: any) => {
      if (typeof v === 'string') v = v.replace(/,/g, '');
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    normalized.opening_bal = toNum(normalized.opening_bal);
    normalized.issues = toNum(normalized.issues);
    normalized.receipts = toNum(normalized.receipts);
    normalized.closing_bal = toNum(normalized.closing_bal);
    normalized.denomination_value = toNum(normalized.denomination_value);

    if (normalized.Total === undefined || isNaN(normalized.Total) || Number(normalized.Total) === 0) {
      normalized.Total = normalized.closing_bal * normalized.denomination_value;
    } else {
      normalized.Total = toNum(normalized.Total);
    }
    
    return normalized as RawRow;
  });
};

export const aggregateDataByField = (
  filteredData: RawRow[], 
  field: keyof RawRow, 
  allData: RawRow[], 
  startDateStr?: string
): AggregatedData => {
  const result: AggregatedData = {};
  
  let startDate: Date | null = null;
  if (startDateStr) {
    const parts = startDateStr.split('-');
    if (parts.length === 3) {
      startDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
    }
  }

  const fieldGroups: { [key: string]: RawRow[] } = {};
  allData.forEach(row => {
    const key = String(row[field] || 'Uncategorized');
    if (!fieldGroups[key]) fieldGroups[key] = [];
    fieldGroups[key].push(row);
  });

  Object.entries(fieldGroups).forEach(([groupKey, groupRows]) => {
    const uniqueItems: { [key: string]: RawRow[] } = {};
    groupRows.forEach(row => {
      const itemKey = `${row.office_id}_${row.denomination_id}_${row.denomination_value}`;
      if (!uniqueItems[itemKey]) uniqueItems[itemKey] = [];
      uniqueItems[itemKey].push(row);
    });

    const metrics: MetricGroup = {
      openingQty: 0, openingAmt: 0,
      issuesQty: 0, issuesAmt: 0,
      receiptsQty: 0, receiptsAmt: 0,
      closingQty: 0, closingAmt: 0
    };

    Object.values(uniqueItems).forEach(records => {
      const sorted = [...records].sort((a, b) => (a.trans_date?.getTime() || 0) - (b.trans_date?.getTime() || 0));
      const faceValue = Number(sorted[0].denomination_value) || 0;

      const inRangeRecords = sorted.filter(r => filteredData.some(fr => fr === r));

      let itemOpeningQty = 0;
      if (startDate) {
        const recordsBefore = sorted.filter(r => r.trans_date && r.trans_date < startDate!);
        if (recordsBefore.length > 0) {
          itemOpeningQty = Number(recordsBefore[recordsBefore.length - 1].closing_bal) || 0;
        } else if (inRangeRecords.length > 0) {
          itemOpeningQty = Number(inRangeRecords[0].opening_bal) || 0;
        }
      } else if (sorted.length > 0) {
        itemOpeningQty = Number(sorted[0].opening_bal) || 0;
      }

      metrics.openingQty += itemOpeningQty;
      metrics.openingAmt += itemOpeningQty * faceValue;

      const rSum = inRangeRecords.reduce((sum, r) => sum + (Number(r.receipts) || 0), 0);
      const iSum = inRangeRecords.reduce((sum, r) => sum + (Number(r.issues) || 0), 0);

      metrics.receiptsQty += rSum;
      metrics.receiptsAmt += rSum * faceValue;
      metrics.issuesQty += iSum;
      metrics.issuesAmt += iSum * faceValue;

      const itemClosingQty = itemOpeningQty + rSum - iSum;
      metrics.closingQty += itemClosingQty;
      metrics.closingAmt += itemClosingQty * faceValue;
    });

    result[groupKey] = metrics;
  });

  return result;
};

export const parseGoogleSheetUrl = (url: string): string | null => {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return null;
  const idMatch = trimmedUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch) {
    const id = idMatch[1];
    const gidMatch = trimmedUrl.match(/gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  }
  return null;
};
