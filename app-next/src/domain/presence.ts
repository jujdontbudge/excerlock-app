/** Engine constants for gym presence (see PRD §3.4 and §3.8): not user-visible, not user-set. */
export const PRESENCE_CONFIRM_MS = 30000; // sustained presence before a visit counts
export const PRESENCE_EXIT_GRACE_MS = 60000; // sustained absence before a confirmed visit ends
export const PRESENCE_RETRY_MS = 30000; // pause after a failed automatic confirmation
