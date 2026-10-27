/**
 * WhatsApp Helper for Bangladesh Click-to-Chat URLs
 * Standard BD Mobile prefixes: 013, 014, 015, 016, 017, 018, 019
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalizedNumber: string; // "8801XXXXXXXXX"
  displayNumber: string; // "01XXXXXXXXX"
  error?: string;
}

/**
 * Normalizes any Bangladeshi phone number to international wa.me format: 8801XXXXXXXXX
 */
export function normalizeBdPhoneNumber(rawPhone: string): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      isValid: false,
      normalizedNumber: '',
      displayNumber: '',
      error: 'Phone number is required',
    };
  }

  // Remove whitespace, hyphens, plus, parenthesis
  let cleaned = rawPhone.replace(/[\s\-\+\(\)]/g, '');

  // Handle leading "88"
  if (cleaned.startsWith('8801')) {
    cleaned = cleaned.slice(2); // now starts with 01
  }

  // Handle number without leading 0 (e.g. 1711223344)
  if (cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }

  // Validate format: must start with 01 and have 11 digits
  // Valid BD operator codes: 013 (GP), 014 (Banglalink), 015 (Teletalk), 016 (Airtel), 017 (GP), 018 (Robi), 019 (Banglalink)
  const bdPhoneRegex = /^01[3-9]\d{8}$/;
  if (!bdPhoneRegex.test(cleaned)) {
    return {
      isValid: false,
      normalizedNumber: '',
      displayNumber: cleaned,
      error: 'Invalid Bangladesh mobile number. Must be an 11-digit number starting with 013-019.',
    };
  }

  const normalizedNumber = `88${cleaned}`; // 8801XXXXXXXXX
  return {
    isValid: true,
    normalizedNumber,
    displayNumber: cleaned,
  };
}

/**
 * Replaces placeholders like {{student_name}}, {{outstanding_amount}} in templates.
 * Replaces undefined/null safely with blank string or fallback text.
 */
export function interpolateTemplate(template: string, variables: Record<string, string | number | undefined | null>): string {
  let result = template;
  for (const [key, val] of Object.entries(variables)) {
    const safeVal = val !== undefined && val !== null ? String(val) : '';
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, safeVal);
  }
  // Remove any leftover unresolved variables
  result = result.replace(/\{\{\s*[\w_]+\s*\}\}/g, '');
  return result.trim();
}

/**
 * Generates a standard free WhatsApp click-to-chat URL
 * https://wa.me/8801XXXXXXXXX?text=...
 */
export function generateWhatsAppLink(rawPhone: string, messageText: string): {
  success: boolean;
  url?: string;
  normalizedPhone?: string;
  error?: string;
} {
  const phoneValidation = normalizeBdPhoneNumber(rawPhone);
  if (!phoneValidation.isValid) {
    return {
      success: false,
      error: phoneValidation.error || 'Invalid phone number',
    };
  }

  // Use standard encodeURIComponent for complete unicode preservation (Bangla characters, ৳, emojis, linebreaks)
  const encodedText = encodeURIComponent(messageText);
  const url = `https://wa.me/${phoneValidation.normalizedNumber}?text=${encodedText}`;

  return {
    success: true,
    url,
    normalizedPhone: phoneValidation.normalizedNumber,
  };
}
