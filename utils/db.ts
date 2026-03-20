
import { RawRow, ReportMetadata } from '../types';

export const saveFullDataset = async (data: RawRow[], meta: ReportMetadata): Promise<void> => {
  const response = await fetch('/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, meta }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.details || 'Failed to save data to server');
  }
};

export const loadFullDataset = async (): Promise<{ data: RawRow[], meta: ReportMetadata | null }> => {
  const response = await fetch('/api/inventory');
  if (!response.ok) throw new Error('Failed to load data from server');
  const result = await response.json();
  
  // Convert date strings back to Date objects
  const data = (result.data || []).map((row: any) => ({
    ...row,
    trans_date: row.trans_date ? new Date(row.trans_date) : null
  }));
  
  return { data, meta: result.meta || null };
};

export const clearInventoryData = async (): Promise<void> => {
  const response = await fetch('/api/inventory', {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to clear data from server');
};
