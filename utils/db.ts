import { RawRow, ReportMetadata } from '../types';

const STORAGE_KEY = 'stamp_inventory_data';
const META_KEY = 'stamp_inventory_meta';

export const saveFullDataset = async (data: RawRow[], meta: ReportMetadata): Promise<void> => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
    throw new Error('Storage limit exceeded or local storage disabled');
  }
};

export const loadFullDataset = async (): Promise<{ data: RawRow[], meta: ReportMetadata | null }> => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    const rawMeta = localStorage.getItem(META_KEY);
    
    if (!rawData) return { data: [], meta: null };
    
    const parsedData = JSON.parse(rawData);
    const meta = rawMeta ? JSON.parse(rawMeta) : null;
    
    // Convert date strings back to Date objects
    const data = parsedData.map((row: any) => ({
      ...row,
      trans_date: row.trans_date ? new Date(row.trans_date) : null
    }));
    
    return { data, meta };
  } catch (e) {
    console.error('Failed to load from localStorage', e);
    return { data: [], meta: null };
  }
};

export const clearInventoryData = async (): Promise<void> => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(META_KEY);
};
