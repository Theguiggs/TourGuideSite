"""
In-process async job manager for the TourGuide microservice.

Why this exists
---------------
The microservice runs as a single uvicorn process on a single CPU VPS. Under
several guides translating / synthesizing at once, the previous synchronous model
held each HTTP request open for the full inference time (up to the proxy's 180s)
with NO concurrency cap. A deep queue blew past that timeout → scenes failed →
guides retried → load got worse (the failure mode documented in the scaling plan).

This manager turns the heavy endpoints into submit → job_id → poll:
  - a bounded number of in-flight jobs → backpressure: submit() raises QueueFull
    and the API answers 429 "busy, retry" instead of timing out;
  - per-kind concurrency caps → translation stays serialized to one at a time
    (MarianMT CPU inference is GIL-bound + the model isn't thread-safe), TTS is
    capped low so the free edge-tts endpoint isn't rate-limited;
  - automatic TTL cleanup of finished jobs so memory stays bounded.

State is in-memory on purpose: a process restart loses in-flight jobs, which the
client recovers from via its poll-timeout → retry / missing-scene detection. That
is an acceptable trade for a 2–5 concurrent-guide V1 and keeps infra cost at zero.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Awaitable, Callable

logger = logging.getLogger("tourguide-local.jobs")

# "queued" | "processing" | "completed" | "failed"
JobStatus = str

# An async callable producing the job's result dict.
JobWork = Callable[[], Awaitable[dict]]


class QueueFull(Exception):
    """Raised by submit() when the in-flight job cap is reached."""


@dataclass
class Job:
    id: str
    kind: str
    status: JobStatus = "queued"
    result: dict | None = None
    error: str | None = None
    created_at: float = field(default_factory=time.monotonic)
    updated_at: float = field(default_factory=time.monotonic)


class JobManager:
    """Bounded, per-kind-throttled async job runner. Create it inside the running
    event loop (the FastAPI lifespan) so the semaphores bind to the right loop."""

    def __init__(
        self,
        *,
        max_inflight: int = 50,
        concurrency: dict[str, int] | None = None,
        job_ttl_s: float = 600.0,
        cleanup_interval_s: float = 60.0,
    ):
        self._jobs: dict[str, Job] = {}
        self._max_inflight = max_inflight
        self._job_ttl_s = job_ttl_s
        self._cleanup_interval_s = cleanup_interval_s
        # Per-kind concurrency caps. Unknown kinds default to 1 (serialized).
        self._sems: dict[str, asyncio.Semaphore] = {
            kind: asyncio.Semaphore(n) for kind, n in (concurrency or {}).items()
        }
        self._default_concurrency = 1
        self._tasks: set[asyncio.Task] = set()
        self._cleanup_task: asyncio.Task | None = None

    # -- lifecycle --

    def start(self) -> None:
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def stop(self) -> None:
        if self._cleanup_task:
            self._cleanup_task.cancel()
            self._cleanup_task = None
        for task in list(self._tasks):
            task.cancel()
        self._tasks.clear()

    # -- metrics --

    def inflight_count(self) -> int:
        return sum(1 for j in self._jobs.values() if j.status in ("queued", "processing"))

    def job_count(self) -> int:
        return len(self._jobs)

    # -- core --

    def submit(self, kind: str, work: JobWork) -> str:
        """Register a job and schedule it. Raises QueueFull if the in-flight cap
        is reached (caller should answer 429 + Retry-After)."""
        if self.inflight_count() >= self._max_inflight:
            raise QueueFull()
        job = Job(id=f"{kind}-{uuid.uuid4().hex}", kind=kind)
        self._jobs[job.id] = job
        task = asyncio.create_task(self._run(job, work))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return job.id

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    def _sem_for(self, kind: str) -> asyncio.Semaphore:
        sem = self._sems.get(kind)
        if sem is None:
            sem = asyncio.Semaphore(self._default_concurrency)
            self._sems[kind] = sem
        return sem

    async def _run(self, job: Job, work: JobWork) -> None:
        sem = self._sem_for(job.kind)
        # Waiting here (semaphore busy) keeps the job in "queued"; it flips to
        # "processing" only once it actually starts, so the client poll sees the
        # real state and keeps waiting.
        async with sem:
            job.status = "processing"
            job.updated_at = time.monotonic()
            try:
                job.result = await work()
                job.status = "completed"
            except asyncio.CancelledError:
                job.status = "failed"
                job.error = "cancelled"
                raise
            except Exception as exc:  # noqa: BLE001 — surfaced to the client as job.error
                job.status = "failed"
                job.error = str(exc)
                logger.error("Job %s (%s) failed: %s", job.id, job.kind, exc)
            finally:
                job.updated_at = time.monotonic()

    async def _cleanup_loop(self) -> None:
        while True:
            try:
                await asyncio.sleep(self._cleanup_interval_s)
                now = time.monotonic()
                stale = [
                    jid
                    for jid, j in self._jobs.items()
                    if j.status in ("completed", "failed")
                    and (now - j.updated_at) > self._job_ttl_s
                ]
                for jid in stale:
                    self._jobs.pop(jid, None)
                if stale:
                    logger.info("Cleaned up %d finished jobs", len(stale))
            except asyncio.CancelledError:
                break
            except Exception as exc:  # noqa: BLE001
                logger.warning("Job cleanup error: %s", exc)
