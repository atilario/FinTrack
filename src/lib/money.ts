export const SUPPORTED_CURRENCIES = [
  { code: "BRL", symbol: "R$", name: "Real Brasileiro", flag: "🇧🇷" },
  { code: "USD", symbol: "US$", name: "Dólar Americano", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "Libra Esterlina", flag: "🇬🇧" },
  { code: "JPY", symbol: "¥", name: "Iene Japonês", flag: "🇯🇵" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

// Base currency reference rates (relative to BRL)
// 1 USD = 5.45 BRL, 1 EUR = 5.95 BRL, 1 GBP = 7.10 BRL, 1 JPY = 0.036 BRL
export const FALLBACK_EXCHANGE_RATES: Record<string, number> = {
  BRL: 1.0,
  USD: 5.45,
  EUR: 5.95,
  GBP: 7.10,
  JPY: 0.036,
};

/**
 * Converts a floating point number or string into integer cents.
 * e.g., 42.5 -> 4250, "42,50" -> 4250, 100.99 -> 10099
 */
export function toCents(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") {
    if (isNaN(value)) return 0;
    return Math.round(value * 100);
  }
  // clean string: replace commas, keep numbers and decimal point or convert PT-BR format
  let cleaned = value.trim();
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // e.g. "1.250,50" -> "1250.50"
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  // remove non-numeric chars except minus and period
  cleaned = cleaned.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

/**
 * Converts integer cents into a float number.
 * e.g. 4250 -> 42.50
 */
export function fromCents(cents: number): number {
  if (!cents || isNaN(cents)) return 0;
  return cents / 100;
}

/**
 * Formats integer cents into formatted localized currency string.
 * e.g. 428000 -> "R$ 4.280,00"
 */
export function formatMoney(
  cents: number,
  currency: string = "BRL",
  locale: string = "pt-BR"
): string {
  const amount = fromCents(cents);
  const currencyMeta = SUPPORTED_CURRENCIES.find((c) => c.code === currency);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyMeta?.code || "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = currencyMeta?.symbol || "R$";
    return `${symbol} ${amount.toFixed(2)}`;
  }
}

/**
 * Converts amounts between currencies using exchange rates.
 * Storing rate and converted cents to maintain precision.
 */
export function convertCurrency(
  amountCents: number,
  fromCurrency: string,
  toCurrency: string,
  customRate?: number
): { convertedCents: number; rate: number } {
  if (fromCurrency === toCurrency) {
    return { convertedCents: amountCents, rate: 1.0 };
  }

  let rate = customRate;
  if (!rate || rate <= 0) {
    const fromRateToBRL = FALLBACK_EXCHANGE_RATES[fromCurrency] || 1.0;
    const toRateToBRL = FALLBACK_EXCHANGE_RATES[toCurrency] || 1.0;
    rate = fromRateToBRL / toRateToBRL;
  }

  const convertedCents = Math.round(amountCents * rate);
  return { convertedCents, rate };
}

/**
 * Splits an amount in cents into N installments, cleanly handling remainder cents.
 * e.g., 10000 cents (R$ 100,00) in 3 installments -> [3334, 3333, 3333]
 */
export function splitInstallments(totalCents: number, count: number): number[] {
  if (count <= 1) return [totalCents];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;

  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    // Distribute remainder cents to first few installments
    result.push(base + (i < remainder ? 1 : 0));
  }
  return result;
}
