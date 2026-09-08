/**
 * @file phone.ts
 * @description Pure domain logic for telephone number validation, real-time input sanitization,
 * and international phone number formatting tailored for US, UK, and international clients.
 */

export const KNOWN_COUNTRY_CODES: Record<string, string> = {
  '44': '+44',  // United Kingdom
  '61': '+61',  // Australia
  '49': '+49',  // Germany
  '33': '+33',  // France
  '34': '+34',  // Spain
  '39': '+39',  // Italy
  '31': '+31',  // Netherlands
  '32': '+32',  // Belgium
  '41': '+41',  // Switzerland
  '43': '+43',  // Austria
  '46': '+46',  // Sweden
  '47': '+47',  // Norway
  '48': '+48',  // Poland
  '52': '+52',  // Mexico
  '55': '+55',  // Brazil
  '64': '+64',  // New Zealand
  '81': '+81',  // Japan
  '82': '+82',  // South Korea
  '86': '+86',  // China
  '91': '+91',  // India
  '971': '+971',// UAE
  '972': '+972',// Israel
  '353': '+353',// Ireland
  '27': '+27',  // South Africa
};

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ClientPhoneCarrier {
  phoneNumbers?: string[] | null;
  phoneNumber?: string | null;
  phone_numbers?: string[] | null;
}

/**
 * Normalizes, formats, and deduplicates client telephone numbers from
 * array or primary phone properties (supporting camelCase or snake_case).
 */
export function normalizeClientPhones(client?: ClientPhoneCarrier | null): string[] {
  if (!client) return [];

  const rawList: string[] = [];

  if (Array.isArray(client.phoneNumbers) && client.phoneNumbers.length > 0) {
    rawList.push(...client.phoneNumbers);
  } else if (Array.isArray(client.phone_numbers) && client.phone_numbers.length > 0) {
    rawList.push(...client.phone_numbers);
  } else if (client.phoneNumber) {
    rawList.push(client.phoneNumber);
  }

  return Array.from(
    new Set(
      rawList
        .map((p) => (typeof p === 'string' ? formatPhoneNumber(p.trim()) : ''))
        .filter(Boolean)
    )
  );
}

/**
 * Validates a telephone number: disallows letters and enforces 7 to 15 digits.
 */
export function validatePhoneNumber(phone: string | undefined | null): PhoneValidationResult {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: 'Phone number is required for calls' };
  }
  const trimmed = phone.trim();
  if (/[a-zA-Z]/.test(trimmed)) {
    return { isValid: false, error: 'Phone number cannot contain text or letters' };
  }
  if (!/^[\d\s+\-()./]+$/.test(trimmed)) {
    return { isValid: false, error: 'Invalid phone number characters' };
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) {
    return { isValid: false, error: 'Phone number must have at least 7 digits' };
  }
  if (digits.length > 15) {
    return { isValid: false, error: 'Phone number cannot exceed 15 digits' };
  }
  return { isValid: true };
}

/**
 * Strips non-phone characters in real time as the user types.
 */
export function sanitizePhoneInput(val: string): string {
  if (!val) return '';
  return val.replace(/[a-zA-Z]/g, '').replace(/[^\d\s+\-()./]/g, '');
}

/**
 * Checks if formatPhoneNumber defaulted to adding the +1 (US/NANP) country code
 * to an input that had no explicit country code prefix.
 */
export function didAppendUSCountryCode(rawInput: string | undefined | null, formattedResult: string): boolean {
  if (!rawInput || !formattedResult) return false;
  const trimmed = rawInput.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return false;

  // If user explicitly typed a plus sign, they supplied a country code
  if (trimmed.startsWith('+')) return false;

  // If the formatted result starts with +1 but the raw input didn't start with 1,
  // or was a 10-digit number (e.g. 2345678901 -> +1 234 567 8901), +1 was appended.
  if (formattedResult.startsWith('+1 ')) {
    return !digits.startsWith('1') || digits.length === 10;
  }

  return false;
}

/**
 * Formats a raw phone string into a clean international format (+<cc> XXX XXX XXXX).
 * Defaults to North America (+1) for 10-digit and local numbers.
 */
export function formatPhoneNumber(raw: string | undefined | null): string {
  if (!raw) return '';

  let clean = String(raw).trim().replace(/^['"=+]+/, '');
  const hadPlus = String(raw).trim().startsWith('+');

  const digits = clean.replace(/\D/g, '');
  if (!digits) return raw.trim();

  // Case 1: Standard North American 10-digit number (e.g. 2345678901) -> +1 234 567 8901
  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const line = digits.slice(6, 10);
    return `+1 ${area} ${prefix} ${line}`;
  }

  // Case 2: 11-digit North American starting with 1 -> +1 234 567 8901
  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const line = digits.slice(7, 11);
    return `+1 ${area} ${prefix} ${line}`;
  }

  // Case 3: UK numbers starting with 44 (e.g. 447123456789) -> +44 7123 456789
  if (digits.startsWith('44') && digits.length >= 10) {
    const rest = digits.slice(2);
    return formatGroupedDigits('+44', rest);
  }

  // Case 4: Other known 2-digit country codes
  const cc2 = digits.slice(0, 2);
  if (KNOWN_COUNTRY_CODES[cc2]) {
    const rest = digits.slice(2);
    return formatGroupedDigits(KNOWN_COUNTRY_CODES[cc2], rest);
  }

  // Case 5: 3-digit country codes (e.g., 971, 972, 353)
  const cc3 = digits.slice(0, 3);
  if (KNOWN_COUNTRY_CODES[cc3]) {
    const rest = digits.slice(3);
    return formatGroupedDigits(KNOWN_COUNTRY_CODES[cc3], rest);
  }

  // Case 6: Explicitly prefixed with '+'
  if (hadPlus) {
    if (digits.startsWith('1') && digits.length >= 11) {
      return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    const codeLen = digits.length > 10 ? 2 : 1;
    const code = digits.slice(0, codeLen);
    const rest = digits.slice(codeLen);
    return formatGroupedDigits(`+${code}`, rest);
  }

  // Fallback: Default to US (+1) for local 7-9 digit numbers
  if (digits.length >= 7 && digits.length <= 9) {
    return `+1 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`.trim();
  }

  // Default fallback to US (+1) if no country code specified
  return `+1 ${digits}`;
}

function formatGroupedDigits(countryCodeWithPlus: string, restDigits: string): string {
  if (restDigits.length <= 4) {
    return `${countryCodeWithPlus} ${restDigits}`.trim();
  }
  if (restDigits.length <= 7) {
    return `${countryCodeWithPlus} ${restDigits.slice(0, 3)} ${restDigits.slice(3)}`.trim();
  }
  if (restDigits.length === 10) {
    return `${countryCodeWithPlus} ${restDigits.slice(0, 3)} ${restDigits.slice(3, 6)} ${restDigits.slice(6)}`.trim();
  }
  const chunks: string[] = [];
  let idx = 0;
  while (idx < restDigits.length) {
    const remaining = restDigits.length - idx;
    const chunkSize = remaining > 4 && remaining % 3 === 0 ? 3 : remaining === 4 ? 4 : 3;
    chunks.push(restDigits.slice(idx, idx + chunkSize));
    idx += chunkSize;
  }
  return `${countryCodeWithPlus} ${chunks.join(' ')}`.trim();
}
