/**
 * @file passwordSecurity.ts
 * @description Privacy-preserving password breach detection using HaveIBeenPwned.org
 * k-Anonymity API and Web Crypto SHA-1.
 *
 * Security Guarantee:
 * Neither the plaintext password nor the full hash is ever sent over the network.
 * Only the first 5 characters of the SHA-1 hash are queried against the HIBP range API.
 */

export interface PasswordBreachResult {
  isPwned: boolean;
  breachCount: number;
}

/**
 * Checks if a given password has been exposed in publicly known data breaches.
 * Uses the Web Crypto API to hash the password and queries HaveIBeenPwned via k-Anonymity.
 *
 * @param {string} password - The plaintext password to evaluate.
 * @returns {Promise<PasswordBreachResult>} Whether the password is breached and occurrence count.
 */
export async function checkPasswordBreach(password: string): Promise<PasswordBreachResult> {
  if (!password || !password.trim()) {
    return { isPwned: false, breachCount: 0 };
  }

  try {
    // 1. Calculate SHA-1 hash in uppercase hex using native Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // 2. k-Anonymity: Split into 5-character prefix and 35-character suffix
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    // 3. Query HIBP range API with the 5-character prefix only
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: {
        'Add-Padding': 'true', // Prevents response length side-channel analysis
      },
    });

    if (!response.ok) {
      // If the HIBP service is unreachable, timed out, or blocked by an adblocker,
      // fail open gracefully with a console warning so users aren't locked out.
      console.warn(`HIBP range API returned status ${response.status}. Skipping breach check.`);
      return { isPwned: false, breachCount: 0 };
    }

    const responseText = await response.text();
    const lines = responseText.split('\n');

    for (const line of lines) {
      const [entrySuffix, countStr] = line.trim().split(':');
      if (entrySuffix && entrySuffix.toUpperCase() === suffix) {
        const count = parseInt(countStr, 10);
        return {
          isPwned: true,
          breachCount: Number.isNaN(count) ? 1 : count,
        };
      }
    }

    return { isPwned: false, breachCount: 0 };
  } catch (error) {
    // Network interruption, adblocker, or offline mode: fail open safely
    console.warn('Unable to verify password breach status (offline/adblocker):', error);
    return { isPwned: false, breachCount: 0 };
  }
}
