/**
 * Recording gates for the device-local logs a person can switch off.
 *
 * Kept deliberately dependency-free so the stores can consult it without a cycle,
 * and deliberately module-scoped rather than React state: `rememberSearch` and
 * `recordWatch` are called from event handlers and effects all over the app, and
 * threading a preference through every caller would guarantee one path that forgets
 * to check.
 *
 * The gates open by default. A signed-out visitor gets the same behaviour the app
 * has always had; a signed-in account applies its own choice on top, from
 * `AuthProvider`, on every load.
 */

export type RecordingGate = 'searchHistory' | 'watchHistory';

const gates: Record<RecordingGate, boolean> = {
  searchHistory: true,
  watchHistory: true,
};

export function setRecordingGates(next: Partial<Record<RecordingGate, boolean>>): void {
  for (const key of Object.keys(next) as RecordingGate[]) {
    const value = next[key];
    if (typeof value === 'boolean') gates[key] = value;
  }
}

export function recordingAllowed(gate: RecordingGate): boolean {
  return gates[gate];
}
