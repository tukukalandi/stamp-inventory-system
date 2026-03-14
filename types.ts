
export interface ReportMetadata {
  periodName: string;
  divisionName: string;
  fromDate: string;
  toDate: string;
  officeName: string;
  officeId: string;
  generatedDate: string;
}

export interface RawRow {
  trans_date: any;
  office_id: any;
  denomination_id: any;
  opening_bal: number;
  issues: number;
  receipts: number;
  closing_bal: number;
  denomination_desc: string;
  denomination_value: number;
  category_id: any;
  category_desc: string;
  product_category: string;
  main_category: string;
  Total: number;
  // Metadata tags
  report_period?: string;
  report_division?: string;
}

export interface MetricGroup {
  openingQty: number;
  openingAmt: number;
  issuesQty: number;
  issuesAmt: number;
  receiptsQty: number;
  receiptsAmt: number;
  closingQty: number;
  closingAmt: number;
}

export interface AggregatedData {
  [key: string]: MetricGroup;
}

export enum DashboardPage {
  UPLOAD = 'UPLOAD',
  MAIN_CATEGORY = 'MAIN_CATEGORY',
  SUB_CATEGORY = 'SUB_CATEGORY',
  PRODUCT_CATEGORY = 'PRODUCT_CATEGORY',
  ITEMS = 'ITEMS'
}

export interface OfficeMap {
  [key: string]: string;
}

export interface HOStructure {
  [hoName: string]: {
    offices: string[]; // List of Office IDs
    displayName: string;
  };
}

export const CATEGORY_LIST = [
  "COM - Event Stamps",
  "COM - Institution Stamps",
  "COM - Miniature Sheet Event St",
  "COM - Miniature Sheet Personal",
  "COM - Miniature Sheet Thematic",
  "COM - Personality Stamps",
  "COM - Sheetlet Personality Sta",
  "COM - Sheetlet Thematic Stamps",
  "COM - Souvenir Sheet",
  "COM - Special Covers",
  "COM - Thematic Stamps",
  "Definitive - PUBLIC POSTAGE ST",
  "Gangajal",
  "My Stamp",
  "Postal Stationary",
  "Revenue Stamps",
  "SERVICE STAMPS"
].sort((a, b) => a.localeCompare(b));

export const PRODUCT_LIST = [
  "Commemorative Stamps",
  "Definitive Stamps",
  "First Day Covers",
  "Miniature Sheets",
  "My Stamp",
  "Postal Stationery",
  "Retail Post",
  "Revenue Stamps",
  "Service Stamps",
  "Sheetlets"
].sort((a, b) => a.localeCompare(b));

export const MASTER_OFFICE_LIST = [
  { name: "Angul Bazar S.O", id: "26660617" },
  { name: "Angul H.O", id: "26360015" },
  { name: "Anlabereni S.O", id: "26660618" },
  { name: "Athamallik S.O", id: "26660619" },
  { name: "Badasuanlo S.O", id: "26660620" },
  { name: "Bagedia S.O", id: "26660621" },
  { name: "Balanda S.O", id: "26660622" },
  { name: "Balimi S.O", id: "26660623" },
  { name: "Banarpal S.O", id: "26660624" },
  { name: "Bantala S.O", id: "26660625" },
  { name: "Bhapur S.O (Dhenkanal)", id: "26660626" },
  { name: "Bhuban S.O", id: "26660627" },
  { name: "Chhendipada S.O", id: "26660628" },
  { name: "Deepasikha S.O", id: "26660629" },
  { name: "Dera S.O", id: "26660630" },
  { name: "Deulbera Colliery S.O", id: "26660631" },
  { name: "Dhenkanal College S.O", id: "26660632" },
  { name: "Dhenkanal H.O", id: "26360016" },
  { name: "Dhenkanal R S S.O", id: "26660633" },
  { name: "Gadasila S.O", id: "26660634" },
  { name: "Gondiapatna S.O", id: "26660635" },
  { name: "Gopalprasad S.O", id: "26660636" },
  { name: "Govindpur S.O (Dhenkanal)", id: "26660637" },
  { name: "Hakimpada S.O", id: "26660638" },
  { name: "Hindol Road R.S. S.O", id: "26660639" },
  { name: "Hindol S.O", id: "26660640" },
  { name: "Hulurisinga S.O", id: "26660641" },
  { name: "Igit Sarang S.O", id: "26660642" },
  { name: "JARAPADA S.O", id: "26660643" },
  { name: "Jindal Nagar S.O", id: "26660644" },
  { name: "Jubuli Town S.O", id: "26660645" },
  { name: "Kamakhyanagar S.O", id: "26660646" },
  { name: "Kaniha S.O", id: "26660647" },
  { name: "Kankadahad S.O", id: "26660648" },
  { name: "Khamar S.O", id: "26660649" },
  { name: "Kishoreganj S.O", id: "26660650" },
  { name: "Kosala S.O", id: "26660651" },
  { name: "Mahabirod S.O", id: "26660652" },
  { name: "Mahimagadi S.O", id: "2666053" },
  { name: "Marthapur S.O", id: "26660654" },
  { name: "Mathakargola S.O", id: "26660655" },
  { name: "Meramandali S.O", id: "26660656" },
  { name: "Nalconagar S.O", id: "26660657" },
  { name: "Nehru Satabdi Nagar(Bharatpu) S.O", id: "26660658" },
  { name: "P.T.C.Angul S.O", id: "26660659" },
  { name: "Pabitranagar S.O", id: "26660660" },
  { name: "Pallahara S.O", id: "26660661" },
  { name: "Parjang S.O", id: "26660662" },
  { name: "Rajkishorenagar S.O", id: "26660663" },
  { name: "Rasol S.O", id: "26660664" },
  { name: "Rengali Dam Site S.O", id: "26660665" },
  { name: "Samal Barrage Township S.O", id: "26660666" },
  { name: "Talcher S.O", id: "26660667" },
  { name: "Talcher Thermal S.O", id: "26660668" },
  { name: "Talcher Town S.O", id: "26660669" },
  { name: "Talmul S.O", id: "26660670" },
  { name: "Vikrampur S.O", id: "26660671" }
].sort((a, b) => a.name.localeCompare(b.name));
