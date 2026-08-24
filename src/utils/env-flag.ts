/**
 * Parse a boolean-ish environment variable.
 *
 * Accepts the usual truthy spellings case-insensitively so that a
 * `SHOW_NON_BP_NODES=True` in a helmfile or compose file does not silently
 * no-op. Anything unrecognised — including unset — is false, so a flag has to
 * be spelled deliberately to turn on.
 */
const TRUTHY = ['true', '1', 'yes', 'on'];

export function envFlag(value: string | undefined): boolean {
  return TRUTHY.includes((value ?? '').trim().toLowerCase());
}
