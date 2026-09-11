import { RateLimiter } from '../proxy-rate-limit';

describe('RateLimiter', () => {
  it('lets a burst through up to the capacity, then refuses', () => {
    const limiter = new RateLimiter({ capacity: 3, refillWindowMs: 60_000 });
    const t0 = 1_000_000;
    expect(limiter.consume('a', t0).allowed).toBe(true);
    expect(limiter.consume('a', t0).allowed).toBe(true);
    expect(limiter.consume('a', t0).allowed).toBe(true);
    const refused = limiter.consume('a', t0);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('keeps accounts independent — one looping guide does not starve another', () => {
    const limiter = new RateLimiter({ capacity: 2, refillWindowMs: 60_000 });
    const t0 = 0;
    limiter.consume('looper', t0);
    limiter.consume('looper', t0);
    expect(limiter.consume('looper', t0).allowed).toBe(false);
    expect(limiter.consume('someone-else', t0).allowed).toBe(true);
  });

  it('refills over time', () => {
    const limiter = new RateLimiter({ capacity: 2, refillWindowMs: 10_000 });
    limiter.consume('a', 0);
    limiter.consume('a', 0);
    expect(limiter.consume('a', 0).allowed).toBe(false);
    // Half the window later, one token is back.
    expect(limiter.consume('a', 5_000).allowed).toBe(true);
    expect(limiter.consume('a', 5_000).allowed).toBe(false);
  });

  it('forgets idle buckets so memory stays bounded', () => {
    const limiter = new RateLimiter({ capacity: 1, refillWindowMs: 1_000, idleEvictionMs: 2_000 });
    for (let i = 0; i < 50; i++) limiter.consume(`sub-${i}`, 0);
    expect(limiter.size()).toBe(50);
    limiter.consume('fresh', 10_000);
    expect(limiter.size()).toBe(1);
  });
});
