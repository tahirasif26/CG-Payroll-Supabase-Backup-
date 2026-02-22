export const workLocationCountries = [
  "Saudi Arabia",
  "UAE",
  "Qatar",
  "Bahrain",
  "Kuwait",
  "Oman",
  "Egypt",
  "Jordan",
  "United Kingdom",
  "United States",
] as const;

export type WorkLocationCountry = typeof workLocationCountries[number];

export interface CompensationSetting {
  id: string;
  name: string;
  isActive: boolean;
  appliesTo?: "all" | "direct" | "contractor";
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
  { id: "1", name: "Basic Salary", isActive: true },
  { id: "2", name: "Housing Allowance", isActive: true },
  { id: "3", name: "Travel Allowance", isActive: true },
  { id: "4", name: "Medical Allowance", isActive: true },
  { id: "5", name: "Other Allowances", isActive: true },
  { id: "6", name: "One Off", isActive: true },
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

export const userPermissions: UserPermission[] = [
  { id: "1", userId: "7", userName: "Layla Qasim", role: "admin", canApproveExpenses: true, canApproveLeave: true, canRunPayroll: true, canManageEmployees: true },
  { id: "2", userId: "2", userName: "Omar Al-Faisal", role: "manager", canApproveExpenses: true, canApproveLeave: true, canRunPayroll: false, canManageEmployees: false },
  { id: "3", userId: "4", userName: "Khalid Nasser", role: "manager", canApproveExpenses: true, canApproveLeave: true, canRunPayroll: false, canManageEmployees: false },
  { id: "4", userId: "8", userName: "Tariq Zaman", role: "manager", canApproveExpenses: false, canApproveLeave: true, canRunPayroll: false, canManageEmployees: false },
];

export const availableCurrencies: CurrencySetting[] = [
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AED", name: "UAE Dirham", symbol: "AED" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KWD" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BHD" },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR" },
  { code: "OMR", name: "Omani Rial", symbol: "OMR" },
];
