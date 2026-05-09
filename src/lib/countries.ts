// Comprehensive list of countries with default currency and timezone.
// Used across the app for country/currency dropdowns so the product is not
// limited to Gulf-only customers.

export interface CountryInfo {
  code: string;   // ISO-2
  name: string;
  currency: string; // ISO-4217
  tz: string;       // IANA timezone (default city)
}

export const COUNTRIES: CountryInfo[] = [
  { code: "AF", name: "Afghanistan", currency: "AFN", tz: "Asia/Kabul" },
  { code: "AL", name: "Albania", currency: "ALL", tz: "Europe/Tirane" },
  { code: "DZ", name: "Algeria", currency: "DZD", tz: "Africa/Algiers" },
  { code: "AR", name: "Argentina", currency: "ARS", tz: "America/Argentina/Buenos_Aires" },
  { code: "AM", name: "Armenia", currency: "AMD", tz: "Asia/Yerevan" },
  { code: "AU", name: "Australia", currency: "AUD", tz: "Australia/Sydney" },
  { code: "AT", name: "Austria", currency: "EUR", tz: "Europe/Vienna" },
  { code: "AZ", name: "Azerbaijan", currency: "AZN", tz: "Asia/Baku" },
  { code: "BH", name: "Bahrain", currency: "BHD", tz: "Asia/Bahrain" },
  { code: "BD", name: "Bangladesh", currency: "BDT", tz: "Asia/Dhaka" },
  { code: "BY", name: "Belarus", currency: "BYN", tz: "Europe/Minsk" },
  { code: "BE", name: "Belgium", currency: "EUR", tz: "Europe/Brussels" },
  { code: "BO", name: "Bolivia", currency: "BOB", tz: "America/La_Paz" },
  { code: "BA", name: "Bosnia and Herzegovina", currency: "BAM", tz: "Europe/Sarajevo" },
  { code: "BR", name: "Brazil", currency: "BRL", tz: "America/Sao_Paulo" },
  { code: "BG", name: "Bulgaria", currency: "BGN", tz: "Europe/Sofia" },
  { code: "KH", name: "Cambodia", currency: "KHR", tz: "Asia/Phnom_Penh" },
  { code: "CM", name: "Cameroon", currency: "XAF", tz: "Africa/Douala" },
  { code: "CA", name: "Canada", currency: "CAD", tz: "America/Toronto" },
  { code: "CL", name: "Chile", currency: "CLP", tz: "America/Santiago" },
  { code: "CN", name: "China", currency: "CNY", tz: "Asia/Shanghai" },
  { code: "CO", name: "Colombia", currency: "COP", tz: "America/Bogota" },
  { code: "CR", name: "Costa Rica", currency: "CRC", tz: "America/Costa_Rica" },
  { code: "HR", name: "Croatia", currency: "EUR", tz: "Europe/Zagreb" },
  { code: "CU", name: "Cuba", currency: "CUP", tz: "America/Havana" },
  { code: "CY", name: "Cyprus", currency: "EUR", tz: "Asia/Nicosia" },
  { code: "CZ", name: "Czech Republic", currency: "CZK", tz: "Europe/Prague" },
  { code: "DK", name: "Denmark", currency: "DKK", tz: "Europe/Copenhagen" },
  { code: "DO", name: "Dominican Republic", currency: "DOP", tz: "America/Santo_Domingo" },
  { code: "EC", name: "Ecuador", currency: "USD", tz: "America/Guayaquil" },
  { code: "EG", name: "Egypt", currency: "EGP", tz: "Africa/Cairo" },
  { code: "SV", name: "El Salvador", currency: "USD", tz: "America/El_Salvador" },
  { code: "EE", name: "Estonia", currency: "EUR", tz: "Europe/Tallinn" },
  { code: "ET", name: "Ethiopia", currency: "ETB", tz: "Africa/Addis_Ababa" },
  { code: "FI", name: "Finland", currency: "EUR", tz: "Europe/Helsinki" },
  { code: "FR", name: "France", currency: "EUR", tz: "Europe/Paris" },
  { code: "GE", name: "Georgia", currency: "GEL", tz: "Asia/Tbilisi" },
  { code: "DE", name: "Germany", currency: "EUR", tz: "Europe/Berlin" },
  { code: "GH", name: "Ghana", currency: "GHS", tz: "Africa/Accra" },
  { code: "GR", name: "Greece", currency: "EUR", tz: "Europe/Athens" },
  { code: "GT", name: "Guatemala", currency: "GTQ", tz: "America/Guatemala" },
  { code: "HN", name: "Honduras", currency: "HNL", tz: "America/Tegucigalpa" },
  { code: "HK", name: "Hong Kong", currency: "HKD", tz: "Asia/Hong_Kong" },
  { code: "HU", name: "Hungary", currency: "HUF", tz: "Europe/Budapest" },
  { code: "IS", name: "Iceland", currency: "ISK", tz: "Atlantic/Reykjavik" },
  { code: "IN", name: "India", currency: "INR", tz: "Asia/Kolkata" },
  { code: "ID", name: "Indonesia", currency: "IDR", tz: "Asia/Jakarta" },
  { code: "IR", name: "Iran", currency: "IRR", tz: "Asia/Tehran" },
  { code: "IQ", name: "Iraq", currency: "IQD", tz: "Asia/Baghdad" },
  { code: "IE", name: "Ireland", currency: "EUR", tz: "Europe/Dublin" },
  { code: "IL", name: "Israel", currency: "ILS", tz: "Asia/Jerusalem" },
  { code: "IT", name: "Italy", currency: "EUR", tz: "Europe/Rome" },
  { code: "JM", name: "Jamaica", currency: "JMD", tz: "America/Jamaica" },
  { code: "JP", name: "Japan", currency: "JPY", tz: "Asia/Tokyo" },
  { code: "JO", name: "Jordan", currency: "JOD", tz: "Asia/Amman" },
  { code: "KZ", name: "Kazakhstan", currency: "KZT", tz: "Asia/Almaty" },
  { code: "KE", name: "Kenya", currency: "KES", tz: "Africa/Nairobi" },
  { code: "KW", name: "Kuwait", currency: "KWD", tz: "Asia/Kuwait" },
  { code: "KG", name: "Kyrgyzstan", currency: "KGS", tz: "Asia/Bishkek" },
  { code: "LA", name: "Laos", currency: "LAK", tz: "Asia/Vientiane" },
  { code: "LV", name: "Latvia", currency: "EUR", tz: "Europe/Riga" },
  { code: "LB", name: "Lebanon", currency: "LBP", tz: "Asia/Beirut" },
  { code: "LY", name: "Libya", currency: "LYD", tz: "Africa/Tripoli" },
  { code: "LT", name: "Lithuania", currency: "EUR", tz: "Europe/Vilnius" },
  { code: "LU", name: "Luxembourg", currency: "EUR", tz: "Europe/Luxembourg" },
  { code: "MO", name: "Macau", currency: "MOP", tz: "Asia/Macau" },
  { code: "MY", name: "Malaysia", currency: "MYR", tz: "Asia/Kuala_Lumpur" },
  { code: "MV", name: "Maldives", currency: "MVR", tz: "Indian/Maldives" },
  { code: "MT", name: "Malta", currency: "EUR", tz: "Europe/Malta" },
  { code: "MX", name: "Mexico", currency: "MXN", tz: "America/Mexico_City" },
  { code: "MD", name: "Moldova", currency: "MDL", tz: "Europe/Chisinau" },
  { code: "MC", name: "Monaco", currency: "EUR", tz: "Europe/Monaco" },
  { code: "MN", name: "Mongolia", currency: "MNT", tz: "Asia/Ulaanbaatar" },
  { code: "ME", name: "Montenegro", currency: "EUR", tz: "Europe/Podgorica" },
  { code: "MA", name: "Morocco", currency: "MAD", tz: "Africa/Casablanca" },
  { code: "MM", name: "Myanmar", currency: "MMK", tz: "Asia/Yangon" },
  { code: "NP", name: "Nepal", currency: "NPR", tz: "Asia/Kathmandu" },
  { code: "NL", name: "Netherlands", currency: "EUR", tz: "Europe/Amsterdam" },
  { code: "NZ", name: "New Zealand", currency: "NZD", tz: "Pacific/Auckland" },
  { code: "NI", name: "Nicaragua", currency: "NIO", tz: "America/Managua" },
  { code: "NG", name: "Nigeria", currency: "NGN", tz: "Africa/Lagos" },
  { code: "NO", name: "Norway", currency: "NOK", tz: "Europe/Oslo" },
  { code: "OM", name: "Oman", currency: "OMR", tz: "Asia/Muscat" },
  { code: "PK", name: "Pakistan", currency: "PKR", tz: "Asia/Karachi" },
  { code: "PA", name: "Panama", currency: "PAB", tz: "America/Panama" },
  { code: "PY", name: "Paraguay", currency: "PYG", tz: "America/Asuncion" },
  { code: "PE", name: "Peru", currency: "PEN", tz: "America/Lima" },
  { code: "PH", name: "Philippines", currency: "PHP", tz: "Asia/Manila" },
  { code: "PL", name: "Poland", currency: "PLN", tz: "Europe/Warsaw" },
  { code: "PT", name: "Portugal", currency: "EUR", tz: "Europe/Lisbon" },
  { code: "QA", name: "Qatar", currency: "QAR", tz: "Asia/Qatar" },
  { code: "RO", name: "Romania", currency: "RON", tz: "Europe/Bucharest" },
  { code: "RU", name: "Russia", currency: "RUB", tz: "Europe/Moscow" },
  { code: "RW", name: "Rwanda", currency: "RWF", tz: "Africa/Kigali" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", tz: "Asia/Riyadh" },
  { code: "RS", name: "Serbia", currency: "RSD", tz: "Europe/Belgrade" },
  { code: "SG", name: "Singapore", currency: "SGD", tz: "Asia/Singapore" },
  { code: "SK", name: "Slovakia", currency: "EUR", tz: "Europe/Bratislava" },
  { code: "SI", name: "Slovenia", currency: "EUR", tz: "Europe/Ljubljana" },
  { code: "ZA", name: "South Africa", currency: "ZAR", tz: "Africa/Johannesburg" },
  { code: "KR", name: "South Korea", currency: "KRW", tz: "Asia/Seoul" },
  { code: "ES", name: "Spain", currency: "EUR", tz: "Europe/Madrid" },
  { code: "LK", name: "Sri Lanka", currency: "LKR", tz: "Asia/Colombo" },
  { code: "SD", name: "Sudan", currency: "SDG", tz: "Africa/Khartoum" },
  { code: "SE", name: "Sweden", currency: "SEK", tz: "Europe/Stockholm" },
  { code: "CH", name: "Switzerland", currency: "CHF", tz: "Europe/Zurich" },
  { code: "SY", name: "Syria", currency: "SYP", tz: "Asia/Damascus" },
  { code: "TW", name: "Taiwan", currency: "TWD", tz: "Asia/Taipei" },
  { code: "TZ", name: "Tanzania", currency: "TZS", tz: "Africa/Dar_es_Salaam" },
  { code: "TH", name: "Thailand", currency: "THB", tz: "Asia/Bangkok" },
  { code: "TN", name: "Tunisia", currency: "TND", tz: "Africa/Tunis" },
  { code: "TR", name: "Turkey", currency: "TRY", tz: "Europe/Istanbul" },
  { code: "TM", name: "Turkmenistan", currency: "TMT", tz: "Asia/Ashgabat" },
  { code: "UG", name: "Uganda", currency: "UGX", tz: "Africa/Kampala" },
  { code: "UA", name: "Ukraine", currency: "UAH", tz: "Europe/Kiev" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", tz: "Asia/Dubai" },
  { code: "GB", name: "United Kingdom", currency: "GBP", tz: "Europe/London" },
  { code: "US", name: "United States", currency: "USD", tz: "America/New_York" },
  { code: "UY", name: "Uruguay", currency: "UYU", tz: "America/Montevideo" },
  { code: "UZ", name: "Uzbekistan", currency: "UZS", tz: "Asia/Tashkent" },
  { code: "VE", name: "Venezuela", currency: "VES", tz: "America/Caracas" },
  { code: "VN", name: "Vietnam", currency: "VND", tz: "Asia/Ho_Chi_Minh" },
  { code: "YE", name: "Yemen", currency: "YER", tz: "Asia/Aden" },
  { code: "ZM", name: "Zambia", currency: "ZMW", tz: "Africa/Lusaka" },
  { code: "ZW", name: "Zimbabwe", currency: "ZWL", tz: "Africa/Harare" },
];

export const COUNTRY_NAMES: string[] = COUNTRIES.map(c => c.name);

// Unique sorted list of currencies
export const CURRENCIES: string[] = Array.from(
  new Set(COUNTRIES.map(c => c.currency))
).sort();

// Unique sorted list of timezones (plus UTC)
export const TIMEZONES: string[] = Array.from(
  new Set(["UTC", ...COUNTRIES.map(c => c.tz)])
).sort();

export function findCountry(name?: string | null): CountryInfo | undefined {
  if (!name) return undefined;
  return COUNTRIES.find(c => c.name === name);
}

export function currencyForCountry(name?: string | null): string | undefined {
  return findCountry(name)?.currency;
}

export function timezoneForCountry(name?: string | null): string | undefined {
  return findCountry(name)?.tz;
}
