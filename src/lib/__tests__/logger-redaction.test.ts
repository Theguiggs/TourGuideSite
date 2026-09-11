/**
 * Ce qui part dans les journaux ne doit porter ni jeton, ni adresse, ni
 * secret — à quelque profondeur que ce soit, et dans les VALEURS autant que
 * dans les noms de clés.
 */

import { sanitizeContext, logger } from '../logger';

const JWT = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnopqrstuvwxyz012345';

describe('sanitizeContext', () => {
  it('masks sensitive keys at any depth', () => {
    const out = sanitizeContext({
      user: { email: 'a@b.fr', profile: { phone: '+33612345678', name: 'Guillaume' } },
      headers: { Authorization: 'Bearer abc.def.ghi', accept: 'json' },
      apiKey: 'sk_live_1234567890abcdef',
    }) as Record<string, Record<string, unknown>>;

    expect(out.user.email).toBe('[REDACTED]');
    expect((out.user.profile as Record<string, unknown>).phone).toBe('[REDACTED]');
    expect((out.user.profile as Record<string, unknown>).name).toBe('Guillaume');
    expect(out.headers.Authorization).toBe('[REDACTED]');
    expect(out.headers.accept).toBe('json');
    expect(out.apiKey).toBe('[REDACTED]');
  });

  it('masks tokens and addresses hidden inside string VALUES', () => {
    const out = sanitizeContext({
      error: `NotAuthorizedException: User does not exist: guide@murmure-visit.com (token ${JWT})`,
      detail: 'Authorization: Bearer ' + 'x'.repeat(40),
    }) as Record<string, string>;

    expect(out.error).not.toContain('guide@murmure-visit.com');
    expect(out.error).not.toContain(JWT);
    expect(out.error).toContain('User does not exist');
    expect(out.detail).toBe('Authorization: Bearer [REDACTED]');
  });

  it('masks AWS and Stripe keys by their prefix', () => {
    const out = sanitizeContext({
      note: 'clé AKIAABCDEFGHIJKLMNOP et pk_test_ABCDEFGHIJKLMNOPqrstuvwxyz',
    }) as Record<string, string>;
    expect(out.note).toBe('clé [REDACTED] et [REDACTED]');
  });

  it('walks arrays and Error instances', () => {
    const out = sanitizeContext({
      items: [{ email: 'x@y.z' }, 'contact me@example.org'],
      err: new Error('failed for someone@example.org'),
    }) as Record<string, unknown>;

    const items = out.items as unknown[];
    expect((items[0] as Record<string, unknown>).email).toBe('[REDACTED]');
    expect(items[1]).toBe('contact [REDACTED]');
    expect((out.err as Record<string, unknown>).message).toBe('failed for [REDACTED]');
  });

  it('bounds recursion so a cyclic or deep object cannot hang the logger', () => {
    type Node = { child?: Node; v: number };
    const deep: Node = { v: 0 };
    let cursor = deep;
    for (let i = 1; i < 20; i++) {
      cursor.child = { v: i };
      cursor = cursor.child;
    }
    expect(() => sanitizeContext({ deep })).not.toThrow();
    expect(JSON.stringify(sanitizeContext({ deep }))).toContain('[TRUNCATED]');
  });
});

describe('logger', () => {
  it('redacts the message line itself, not only the context', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Auth', `sign-in failed for guide@murmure-visit.com`);
    expect(spy).toHaveBeenCalledWith('[Auth] sign-in failed for [REDACTED]');
    spy.mockRestore();
  });
});
