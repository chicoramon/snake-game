// Keep enabled while Live Vs is under active preview testing. Flip this one
// default to false before production cleanup; ?vsdebug=1 can still re-enable
// diagnostics, while ?vsdebug=0 disables them immediately on any deployment.
const DEFAULT_LIVE_VS_LATENCY_DEBUG = true;

const requestedValue = new URLSearchParams(globalThis.location?.search || '').get('vsdebug');

export const LIVE_VS_LATENCY_DEBUG = requestedValue === '1'
  ? true
  : requestedValue === '0'
    ? false
    : DEFAULT_LIVE_VS_LATENCY_DEBUG;
