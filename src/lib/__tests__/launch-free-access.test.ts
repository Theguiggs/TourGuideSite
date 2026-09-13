import {launchFreeAccess, resolveLaunchFreeAccess} from '../launch-free-access';

const values = {
  startAt: '2026-10-01T00:00:00.000Z',
  endAt: '2026-11-01T00:00:00.000Z',
};

describe('offre de lancement', () => {
  it('est active uniquement entre les deux dates', () => {
    expect(resolveLaunchFreeAccess(values, Date.parse('2026-10-01T00:00:00Z')).active).toBe(true);
    expect(resolveLaunchFreeAccess(values, Date.parse('2026-11-01T00:00:00Z')).active).toBe(false);
  });

  it('reste désactivée si les dates sont invalides', () => {
    expect(resolveLaunchFreeAccess({})).toEqual({active: false});
    expect(resolveLaunchFreeAccess({...values, endAt: 'invalide'})).toEqual({active: false});
    expect(resolveLaunchFreeAccess({...values, startAt: '2026-10-01T00:00:00'})).toEqual({active: false});
    expect(resolveLaunchFreeAccess({...values, startAt: '2026-02-30T00:00:00.000Z'})).toEqual({active: false});
  });

  it('ne complète pas une variable publique partielle avec les outputs', () => {
    const previousStart = process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_START_AT;
    const previousEnd = process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_END_AT;
    process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_START_AT = values.startAt;
    delete process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_END_AT;
    try {
      expect(launchFreeAccess(Date.parse('2026-10-15T00:00:00.000Z'))).toEqual({active: false});
    } finally {
      if (previousStart === undefined) delete process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_START_AT;
      else process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_START_AT = previousStart;
      if (previousEnd === undefined) delete process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_END_AT;
      else process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_END_AT = previousEnd;
    }
  });
});
