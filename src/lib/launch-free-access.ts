import outputs from '../../amplify_outputs.json';

export interface LaunchFreeAccess {
  active: boolean;
  startAt?: string;
  endAt?: string;
}

export function resolveLaunchFreeAccess(
  values: {startAt?: unknown; endAt?: unknown},
  now = Date.now(),
): LaunchFreeAccess {
  if (typeof values.startAt !== 'string' || typeof values.endAt !== 'string') {
    return {active: false};
  }
  const strictInstant = (value: string): number | null => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
    const epoch = Date.parse(value);
    return Number.isFinite(epoch) && new Date(epoch).toISOString() === value ? epoch : null;
  };
  const start = strictInstant(values.startAt);
  const end = strictInstant(values.endAt);
  if (start == null || end == null || start >= end) return {active: false};
  return {
    active: now >= start && now < end,
    startAt: new Date(start).toISOString(),
    endAt: new Date(end).toISOString(),
  };
}

export function launchFreeAccess(now = Date.now()): LaunchFreeAccess {
  const custom = (outputs as unknown as {custom?: Record<string, unknown>}).custom;
  const publicStart = process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_START_AT;
  const publicEnd = process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_END_AT;
  // Une paire publique partielle est invalide : ne jamais la compléter avec
  // une borne potentiellement ancienne venant des outputs Amplify.
  const values = publicStart || publicEnd
    ? {startAt: publicStart, endAt: publicEnd}
    : {startAt: custom?.launchFreeAccessStartAt, endAt: custom?.launchFreeAccessEndAt};
  return resolveLaunchFreeAccess(
    values,
    now,
  );
}
