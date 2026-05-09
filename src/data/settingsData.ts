import { COUNTRY_NAMES } from "@/lib/countries";

// Full world country list — kept here as a runtime array so existing
// `.map(...)` consumers keep working.
export const workLocationCountries: readonly string[] = COUNTRY_NAMES;

export type WorkLocationCountry = string;

export interface CompensationSetting {
  id: string;
  name: string;
  isActive: boolean;
  appliesTo?: string[];
  appliesToCountries?: string[];
}

export interface JobTitle {
  id: string;
  title: string;
  level: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  division: string;
  headId: string | null;
  isActive: boolean;
}

export interface Division {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  maxAmount: number | null;
  requiresApproval: boolean;
  isActive: boolean;
}

export interface UserPermission {
  id: string;
  userId: string;
  userName: string;
  role: "admin" | "manager" | "employee";
  canApproveExpenses: boolean;
  canApproveLeave: boolean;
  canRunPayroll: boolean;
  canManageEmployees: boolean;
}

export interface CurrencySetting {
  code: string;
  name: string;
  symbol: string;
}

export const compensationSettings: CompensationSetting[] = [
  { id: "1", name: "Basic Salary", isActive: true, appliesTo: ["direct", "contractor", "it_developer", "intern"] },
  { id: "2", name: "Housing Allowance", isActive: true, appliesTo: ["direct", "it_developer"] },
  { id: "3", name: "Travel Allowance", isActive: true, appliesTo: ["direct", "contractor"] },
  { id: "4", name: "Medical Allowance", isActive: true, appliesTo: ["direct", "it_developer", "intern"] },
  { id: "5", name: "Other Allowances", isActive: true, appliesTo: ["direct"] },
  { id: "6", name: "One Off", isActive: true, appliesTo: ["direct", "contractor", "it_developer", "intern"] },
  { id: "7", name: "Tech Equipment Allowance", isActive: true, appliesTo: ["it_developer"] },
  { id: "8", name: "Internship Stipend", isActive: true, appliesTo: ["intern"] },
];

export const jobTitles: JobTitle[] = [
  { id: "1", title: "Partner", level: "Leadership", isActive: true },
  { id: "2", title: "Senior Manager", level: "Management", isActive: true },
  { id: "3", title: "Manager", level: "Management", isActive: true },
  { id: "4", title: "Senior Associate", level: "Professional", isActive: true },
  { id: "5", title: "Associate", level: "Professional", isActive: true },
  { id: "6", title: "Staff", level: "Entry", isActive: true },
];

export const departments: Department[] = [
  { id: "1", name: "Assurance", division: "Professional Services", headId: "7", isActive: true },
  { id: "2", name: "Tax", division: "Professional Services", headId: "2", isActive: true },
  { id: "3", name: "Advisory", division: "Professional Services", headId: "7", isActive: true },
  { id: "4", name: "Strategy", division: "Consulting", headId: "4", isActive: true },
  { id: "5", name: "Technology", division: "Operations", headId: "8", isActive: true },
];

export const divisions: Division[] = [
  { id: "1", name: "Professional Services", isActive: true },
  { id: "2", name: "Consulting", isActive: true },
  { id: "3", name: "Operations", isActive: true },
];

export const expenseCategories: ExpenseCategory[] = [
  { id: "1", name: "Travel", maxAmount: 10000, requiresApproval: true, isActive: true },
  { id: "2", name: "Client Entertainment", maxAmount: 5000, requiresApproval: true, isActive: true },
  { id: "3", name: "Training", maxAmount: 15000, requiresApproval: true, isActive: true },
  { id: "4", name: "Equipment", maxAmount: 3000, requiresApproval: true, isActive: true },
  { id: "5", name: "Office Supplies", maxAmount: 500, requiresApproval: false, isActive: true },
];

export const userPermissions: UserPermission[] = [];

// Full list of currencies derived from the world country list.
const _currencyMeta: Record<string, { name: string; symbol: string }> = {
  AED: { name: "UAE Dirham", symbol: "AED" },
  AFN: { name: "Afghan Afghani", symbol: "؋" },
  ALL: { name: "Albanian Lek", symbol: "L" },
  AMD: { name: "Armenian Dram", symbol: "֏" },
  ARS: { name: "Argentine Peso", symbol: "$" },
  AUD: { name: "Australian Dollar", symbol: "A$" },
  AZN: { name: "Azerbaijani Manat", symbol: "₼" },
  BAM: { name: "Bosnia Convertible Mark", symbol: "KM" },
  BDT: { name: "Bangladeshi Taka", symbol: "৳" },
  BGN: { name: "Bulgarian Lev", symbol: "лв" },
  BHD: { name: "Bahraini Dinar", symbol: "BHD" },
  BOB: { name: "Bolivian Boliviano", symbol: "Bs." },
  BRL: { name: "Brazilian Real", symbol: "R$" },
  BYN: { name: "Belarusian Ruble", symbol: "Br" },
  CAD: { name: "Canadian Dollar", symbol: "C$" },
  CHF: { name: "Swiss Franc", symbol: "CHF" },
  CLP: { name: "Chilean Peso", symbol: "$" },
  CNY: { name: "Chinese Yuan", symbol: "¥" },
  COP: { name: "Colombian Peso", symbol: "$" },
  CRC: { name: "Costa Rican Colon", symbol: "₡" },
  CUP: { name: "Cuban Peso", symbol: "$" },
  CZK: { name: "Czech Koruna", symbol: "Kč" },
  DKK: { name: "Danish Krone", symbol: "kr" },
  DOP: { name: "Dominican Peso", symbol: "RD$" },
  DZD: { name: "Algerian Dinar", symbol: "DA" },
  EGP: { name: "Egyptian Pound", symbol: "E£" },
  ETB: { name: "Ethiopian Birr", symbol: "Br" },
  EUR: { name: "Euro", symbol: "€" },
  GBP: { name: "British Pound", symbol: "£" },
  GEL: { name: "Georgian Lari", symbol: "₾" },
  GHS: { name: "Ghanaian Cedi", symbol: "₵" },
  GTQ: { name: "Guatemalan Quetzal", symbol: "Q" },
  HKD: { name: "Hong Kong Dollar", symbol: "HK$" },
  HNL: { name: "Honduran Lempira", symbol: "L" },
  HUF: { name: "Hungarian Forint", symbol: "Ft" },
  IDR: { name: "Indonesian Rupiah", symbol: "Rp" },
  ILS: { name: "Israeli Shekel", symbol: "₪" },
  INR: { name: "Indian Rupee", symbol: "₹" },
  IQD: { name: "Iraqi Dinar", symbol: "ع.د" },
  IRR: { name: "Iranian Rial", symbol: "﷼" },
  ISK: { name: "Icelandic Krona", symbol: "kr" },
  JMD: { name: "Jamaican Dollar", symbol: "J$" },
  JOD: { name: "Jordanian Dinar", symbol: "JOD" },
  JPY: { name: "Japanese Yen", symbol: "¥" },
  KES: { name: "Kenyan Shilling", symbol: "KSh" },
  KGS: { name: "Kyrgyzstani Som", symbol: "с" },
  KHR: { name: "Cambodian Riel", symbol: "៛" },
  KRW: { name: "South Korean Won", symbol: "₩" },
  KWD: { name: "Kuwaiti Dinar", symbol: "KWD" },
  KZT: { name: "Kazakhstani Tenge", symbol: "₸" },
  LAK: { name: "Lao Kip", symbol: "₭" },
  LBP: { name: "Lebanese Pound", symbol: "L£" },
  LKR: { name: "Sri Lankan Rupee", symbol: "Rs" },
  LYD: { name: "Libyan Dinar", symbol: "ل.د" },
  MAD: { name: "Moroccan Dirham", symbol: "MAD" },
  MDL: { name: "Moldovan Leu", symbol: "L" },
  MMK: { name: "Myanmar Kyat", symbol: "K" },
  MNT: { name: "Mongolian Tugrik", symbol: "₮" },
  MOP: { name: "Macanese Pataca", symbol: "MOP$" },
  MVR: { name: "Maldivian Rufiyaa", symbol: "Rf" },
  MXN: { name: "Mexican Peso", symbol: "$" },
  MYR: { name: "Malaysian Ringgit", symbol: "RM" },
  NGN: { name: "Nigerian Naira", symbol: "₦" },
  NIO: { name: "Nicaraguan Córdoba", symbol: "C$" },
  NOK: { name: "Norwegian Krone", symbol: "kr" },
  NPR: { name: "Nepalese Rupee", symbol: "Rs" },
  NZD: { name: "New Zealand Dollar", symbol: "NZ$" },
  OMR: { name: "Omani Rial", symbol: "OMR" },
  PAB: { name: "Panamanian Balboa", symbol: "B/." },
  PEN: { name: "Peruvian Sol", symbol: "S/." },
  PHP: { name: "Philippine Peso", symbol: "₱" },
  PKR: { name: "Pakistani Rupee", symbol: "Rs" },
  PLN: { name: "Polish Zloty", symbol: "zł" },
  PYG: { name: "Paraguayan Guarani", symbol: "₲" },
  QAR: { name: "Qatari Riyal", symbol: "QAR" },
  RON: { name: "Romanian Leu", symbol: "lei" },
  RSD: { name: "Serbian Dinar", symbol: "дин" },
  RUB: { name: "Russian Ruble", symbol: "₽" },
  RWF: { name: "Rwandan Franc", symbol: "FRw" },
  SAR: { name: "Saudi Riyal", symbol: "SAR" },
  SDG: { name: "Sudanese Pound", symbol: "ج.س." },
  SEK: { name: "Swedish Krona", symbol: "kr" },
  SGD: { name: "Singapore Dollar", symbol: "S$" },
  SYP: { name: "Syrian Pound", symbol: "£" },
  THB: { name: "Thai Baht", symbol: "฿" },
  TMT: { name: "Turkmenistani Manat", symbol: "T" },
  TND: { name: "Tunisian Dinar", symbol: "د.ت" },
  TRY: { name: "Turkish Lira", symbol: "₺" },
  TWD: { name: "New Taiwan Dollar", symbol: "NT$" },
  TZS: { name: "Tanzanian Shilling", symbol: "TSh" },
  UAH: { name: "Ukrainian Hryvnia", symbol: "₴" },
  UGX: { name: "Ugandan Shilling", symbol: "USh" },
  USD: { name: "US Dollar", symbol: "$" },
  UYU: { name: "Uruguayan Peso", symbol: "$U" },
  UZS: { name: "Uzbekistani Som", symbol: "лв" },
  VES: { name: "Venezuelan Bolívar", symbol: "Bs.S" },
  VND: { name: "Vietnamese Dong", symbol: "₫" },
  XAF: { name: "Central African CFA Franc", symbol: "FCFA" },
  YER: { name: "Yemeni Rial", symbol: "﷼" },
  ZAR: { name: "South African Rand", symbol: "R" },
  ZMW: { name: "Zambian Kwacha", symbol: "ZK" },
  ZWL: { name: "Zimbabwean Dollar", symbol: "Z$" },
};

import { CURRENCIES as _ALL_CURRENCY_CODES } from "@/lib/countries";

export const availableCurrencies: CurrencySetting[] = _ALL_CURRENCY_CODES.map(code => ({
  code,
  name: _currencyMeta[code]?.name ?? code,
  symbol: _currencyMeta[code]?.symbol ?? code,
}));

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toReportingRate: number;
  lastUpdated: string;
}


export const defaultExchangeRates: ExchangeRate[] = [
  { id: "1", fromCurrency: "USD", toReportingRate: 3.75, lastUpdated: "2025-02-01" },
  { id: "2", fromCurrency: "EUR", toReportingRate: 4.05, lastUpdated: "2025-02-01" },
  { id: "3", fromCurrency: "GBP", toReportingRate: 4.72, lastUpdated: "2025-02-01" },
  { id: "4", fromCurrency: "AED", toReportingRate: 1.02, lastUpdated: "2025-02-01" },
  { id: "5", fromCurrency: "KWD", toReportingRate: 12.18, lastUpdated: "2025-02-01" },
  { id: "6", fromCurrency: "BHD", toReportingRate: 9.95, lastUpdated: "2025-02-01" },
  { id: "7", fromCurrency: "QAR", toReportingRate: 1.03, lastUpdated: "2025-02-01" },
  { id: "8", fromCurrency: "OMR", toReportingRate: 9.74, lastUpdated: "2025-02-01" },
  { id: "9", fromCurrency: "EGP", toReportingRate: 0.076, lastUpdated: "2025-02-01" },
  { id: "10", fromCurrency: "JOD", toReportingRate: 5.29, lastUpdated: "2025-02-01" },
];

export interface MileageSettings {
  defaultRate: number;
  ratesByVehicle: { car: number; motorcycle: number; bicycle: number };
  dailyDistanceCap: number;
  requireGPS: boolean;
}

export const defaultMileageSettings: MileageSettings = {
  defaultRate: 5,
  ratesByVehicle: { car: 5, motorcycle: 3, bicycle: 1 },
  dailyDistanceCap: 200,
  requireGPS: false,
};
