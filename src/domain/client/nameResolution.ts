/**
 * @file nameResolution.ts
 * @description Domain logic for resolving caller vs. registered licensed client accounts.
 *
 * Operational Rule:
 * When an employee or representative calls on behalf of a licensed account, the entry is logged
 * as "Caller(Licensed Owner)", e.g. "Jim(Michael Scott)".
 *
 * This function resolves:
 * - canonicalClientName: The licensed entity ("Michael Scott") under which the equipment and
 *   primary CRM record must be registered.
 * - callerName: The individual employee/operator ("Jim") who initiated the interaction.
 */

export interface ClientNameResolution {
  rawInput: string;
  canonicalClientName: string;
  callerName?: string;
}

/**
 * Resolves a raw client name string into its canonical owner and optional caller.
 *
 * Examples:
 * - "Jim(Michael Scott)" -> { canonicalClientName: "Michael Scott", callerName: "Jim" }
 * - "Sarah (Apex Photo Co.)" -> { canonicalClientName: "Apex Photo Co.", callerName: "Sarah" }
 * - "Apex Photo Co." -> { canonicalClientName: "Apex Photo Co.", callerName: undefined }
 */
export function resolveClientName(input: string | undefined | null): ClientNameResolution {
  if (!input || !input.trim()) {
    return { rawInput: '', canonicalClientName: '' };
  }

  const trimmed = input.trim();
  const match = trimmed.match(/^([^(]+)\s*\(([^)]+)\)$/);

  if (match) {
    const caller = match[1].trim();
    const owner = match[2].trim();

    if (owner) {
      return {
        rawInput: trimmed,
        canonicalClientName: owner,
        callerName: caller || undefined,
      };
    }
  }

  return {
    rawInput: trimmed,
    canonicalClientName: trimmed,
  };
}
