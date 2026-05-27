r"""
Scenario load test for the async microservice (pass 1+2 validation).

Simulates N guides each processing M scenes CONCURRENTLY, reproducing the real
per-scene pipeline used by the web app (executeBatch): translate -> poll until
done -> TTS the translated text -> poll until done. Guides run in parallel;
scenes within a guide run sequentially (as in the app).

It measures the things the rework is supposed to fix:
  - 429 backpressure is exercised and absorbed (submits retried, jobs still finish)
  - NO 502 / 5xx cascade under concurrency   <- the key signal
  - submit -> completed latency (p50 / p95 / max)
  - translation cache hit (a repeat of an already-translated scene is ~instant)

Usage (two terminals):

  # Terminal 1 — start the REAL server. Use a low in-flight cap so the
  # concurrent load actually trips backpressure, and set the API key (or leave
  # it empty). PowerShell:
  cd microservice
  $env:MAX_INFLIGHT_JOBS = "5"; $env:TRANSLATE_CONCURRENCY = "1"; $env:TTS_CONCURRENCY = "2"
  $env:MICROSERVICE_API_KEY = ""        # or a value, then match it below
  .\.venv\Scripts\python.exe -m uvicorn local_server:app --port 8000

  # Terminal 2 — run the load test (same API key as the server):
  cd microservice
  $env:MICROSERVICE_API_KEY = ""
  .\.venv\Scripts\python.exe loadtest.py --guides 4 --scenes 3 --langs en,de

Flags: --guides N  --scenes M  --langs en,de,es  --no-tts  --base URL
"""

import argparse
import asyncio
import os
import time

import httpx

SUBMIT_MAX_ATTEMPTS = 6


def pct(xs, p):
    if not xs:
        return 0.0
    xs = sorted(xs)
    k = (len(xs) - 1) * p
    f = int(k)
    c = min(f + 1, len(xs) - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)


class Stats:
    def __init__(self):
        self.c429 = 0          # backpressure responses seen (good, as long as absorbed)
        self.c5xx = 0          # 502 / 5xx — MUST stay 0
        self.submit_exhausted = 0  # submit gave up after all backoff attempts
        self.translate_ok = 0
        self.translate_fail = 0
        self.tts_ok = 0
        self.tts_fail = 0
        self.lat_translate = []
        self.lat_tts = []


async def submit(client, base, headers, path, body, stats):
    """POST a job-submit, retrying on 429 with backoff (mirrors the web client)."""
    for attempt in range(1, SUBMIT_MAX_ATTEMPTS + 1):
        r = await client.post(f"{base}{path}", json=body, headers=headers)
        if r.status_code == 429:
            stats.c429 += 1
            retry_after = float(r.headers.get("Retry-After") or attempt)
            await asyncio.sleep(min(retry_after, 5))
            continue
        if r.status_code >= 500:
            stats.c5xx += 1
            return None
        return r.json().get("job_id")
    stats.submit_exhausted += 1
    return None


async def poll(client, base, headers, job_id, stats, timeout_s=120):
    """Poll a job until completed/failed. Returns (body, latency_s) or (None, None)."""
    start = time.monotonic()
    while time.monotonic() - start < timeout_s:
        r = await client.get(f"{base}/v1/jobs/{job_id}", headers=headers)
        if r.status_code >= 500:
            stats.c5xx += 1
            return None, None
        data = r.json()
        status = data.get("status")
        if status == "completed":
            return data, time.monotonic() - start
        if status == "failed":
            return {"_failed": True, "error": data.get("error")}, time.monotonic() - start
        await asyncio.sleep(0.4)
    return None, None  # poll timeout


def scene_text(guide, scene):
    # Distinct per (guide, scene) so the inference thread is actually exercised
    # (not just cache hits). Two sentences -> batched translation.
    return (
        f"Bonjour, ceci est la scene numero {scene} du guide {guide}. "
        f"Bienvenue a Grasse, capitale mondiale du parfum."
    )


async def run_scene(client, base, headers, guide, scene, lang, include_tts, stats):
    src = scene_text(guide, scene)
    texts = [s.strip() for s in src.split(". ") if s.strip()]

    jid = await submit(client, base, headers, "/v1/translate/batch",
                       {"texts": texts, "source_lang": "fr", "target_lang": lang}, stats)
    if not jid:
        stats.translate_fail += 1
        return
    res, dt = await poll(client, base, headers, jid, stats)
    if res is None or res.get("_failed"):
        stats.translate_fail += 1
        return
    stats.translate_ok += 1
    stats.lat_translate.append(dt)
    translated = " ".join(res.get("translations", [])) or src

    if not include_tts:
        return

    jid2 = await submit(client, base, headers, "/v1/tts/generate",
                        {"text": translated, "language": lang}, stats)
    if not jid2:
        stats.tts_fail += 1
        return
    res2, dt2 = await poll(client, base, headers, jid2, stats)
    if res2 is None or res2.get("_failed"):
        stats.tts_fail += 1
        return
    stats.tts_ok += 1
    stats.lat_tts.append(dt2)


async def run_guide(client, base, headers, guide, scenes, langs, include_tts, stats):
    for scene in range(scenes):
        lang = langs[scene % len(langs)]
        await run_scene(client, base, headers, guide, scene, lang, include_tts, stats)


async def run_burst(client, base, headers, k, lang, stats):
    """Fire K translate submits AT ONCE (distinct texts, no cache) to exceed
    MAX_INFLIGHT and trip 429 backpressure on the live server, then poll all to
    completion. Proves submits are rejected with 429 and absorbed via retry."""
    async def one(i):
        texts = [f"Phrase unique numero {i} pour le test de saturation de la file."]
        jid = await submit(client, base, headers, "/v1/translate/batch",
                           {"texts": texts, "source_lang": "fr", "target_lang": lang}, stats)
        if not jid:
            stats.translate_fail += 1
            return
        res, dt = await poll(client, base, headers, jid, stats)
        if res is None or res.get("_failed"):
            stats.translate_fail += 1
            return
        stats.translate_ok += 1
        stats.lat_translate.append(dt)

    await asyncio.gather(*[one(i) for i in range(k)])


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--guides", type=int, default=4)
    ap.add_argument("--scenes", type=int, default=3)
    ap.add_argument("--langs", default="en")
    ap.add_argument("--no-tts", action="store_true")
    ap.add_argument("--burst", type=int, default=0,
                    help="Fire N translate submits at once to trip 429 backpressure (replaces the guide scenario). Set N > MAX_INFLIGHT_JOBS.")
    ap.add_argument("--base", default=os.getenv("MICROSERVICE_BASE_URL", "http://localhost:8000"))
    args = ap.parse_args()

    langs = [s.strip() for s in args.langs.split(",") if s.strip()]
    include_tts = not args.no_tts
    api_key = os.getenv("MICROSERVICE_API_KEY", "")
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["X-API-Key"] = api_key

    base = args.base.rstrip("/")
    burst = args.burst > 0
    if burst:
        include_tts = False  # burst is translate-only (it stresses the serialized queue)
    n_translate = args.burst if burst else args.guides * args.scenes
    stats = Stats()

    if burst:
        print(f"=== Backpressure burst: {args.burst} simultaneous translate submits, lang={langs[0]} ===")
    else:
        print(f"=== Load test: {args.guides} guides x {args.scenes} scenes, langs={langs}, tts={include_tts} ===")
    print(f"Server: {base}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # health
        try:
            h = (await client.get(f"{base}/health", headers=headers)).json()
        except Exception as e:  # noqa: BLE001
            print(f"\n[ABORT] Cannot reach {base}/health: {e}\n  -> start local_server first (see this file's docstring).")
            return
        print(f"Health: tts={h.get('tts')} translation={h.get('translation')} "
              f"inflight={h.get('inflight_jobs')} cache={h.get('cache_size')}")

        # warm-up: load each MarianMT pair BEFORE timing (first call may download)
        print("Warming up models (not timed)...")
        warm0 = time.monotonic()
        for lang in sorted(set(langs)):
            jid = await submit(client, base, headers, "/v1/translate/batch",
                               {"texts": ["Bonjour."], "source_lang": "fr", "target_lang": lang}, Stats())
            if jid:
                await poll(client, base, headers, jid, Stats())
        print(f"  warm-up done in {time.monotonic() - warm0:.1f}s")

        cache_dt = None
        if burst:
            print(f"Firing {args.burst} simultaneous submits (cap should reject the overflow with 429)...")
            t0 = time.monotonic()
            await run_burst(client, base, headers, args.burst, langs[0], stats)
            wall = time.monotonic() - t0
        else:
            # concurrent load
            print(f"Running {args.guides} guides concurrently...")
            t0 = time.monotonic()
            await asyncio.gather(*[
                run_guide(client, base, headers, g, args.scenes, langs, include_tts, stats)
                for g in range(args.guides)
            ])
            wall = time.monotonic() - t0

            # cache check: re-translate guide-0/scene-0 (already done) -> should be instant
            src = scene_text(0, 0)
            texts = [s.strip() for s in src.split(". ") if s.strip()]
            cj = await submit(client, base, headers, "/v1/translate/batch",
                              {"texts": texts, "source_lang": "fr", "target_lang": langs[0]}, Stats())
            if cj:
                _, cache_dt = await poll(client, base, headers, cj, Stats())

    # report
    print("\n--- Results ---")
    print(f"translate: {stats.translate_ok}/{n_translate} completed, {stats.translate_fail} failed")
    if include_tts:
        print(f"tts:       {stats.tts_ok}/{n_translate} completed, {stats.tts_fail} failed")
    print(f"429 backpressure hits: {stats.c429}  (retried & absorbed)")
    print(f"submit gave up after backoff: {stats.submit_exhausted}")
    print(f"502 / 5xx errors: {stats.c5xx}    <-- must be 0")
    print(f"latency translate (submit->done): p50={pct(stats.lat_translate,0.5):.2f}s "
          f"p95={pct(stats.lat_translate,0.95):.2f}s max={max(stats.lat_translate or [0]):.2f}s")
    if include_tts and stats.lat_tts:
        print(f"latency tts:                      p50={pct(stats.lat_tts,0.5):.2f}s "
              f"p95={pct(stats.lat_tts,0.95):.2f}s max={max(stats.lat_tts):.2f}s")
    print(f"wall clock (concurrent phase): {wall:.1f}s")
    if cache_dt is not None:
        verdict = "HIT" if cache_dt < 0.3 else "MISS?"
        print(f"cache re-translate latency: {cache_dt:.3f}s  ({verdict}, expect <0.3s)")

    # verdict
    print("\n--- Verdict ---")
    ok = True
    if stats.c5xx != 0:
        print(f"  FAIL: {stats.c5xx} 5xx errors (the rework should make this 0)"); ok = False
    if stats.submit_exhausted != 0:
        print(f"  FAIL: {stats.submit_exhausted} submits gave up — queue never drained (raise MAX_INFLIGHT or lower load)"); ok = False
    if stats.translate_ok != n_translate:
        print(f"  FAIL: {n_translate - stats.translate_ok} translations did not complete"); ok = False
    if stats.c429 == 0:
        knob = f"raise --burst above MAX_INFLIGHT_JOBS" if burst else "lower MAX_INFLIGHT_JOBS or raise --guides"
        print(f"  NOTE: no 429 seen — load didn't exceed MAX_INFLIGHT ({knob}).")
    elif burst:
        print(f"  GOOD: backpressure exercised — {stats.c429} submits got 429 and were absorbed, all {stats.translate_ok} still completed.")
    if include_tts and stats.tts_fail > 0:
        print(f"  NOTE: {stats.tts_fail} TTS failures — edge-tts (free Azure) rate-limits under concurrency; expected, scenes are retryable.")
    print("  PASS — async job/poll + backpressure stable under concurrent guides." if ok else "  -> investigate failures above.")


if __name__ == "__main__":
    asyncio.run(main())
