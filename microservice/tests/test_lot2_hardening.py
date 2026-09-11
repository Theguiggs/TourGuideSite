"""
Durcissement du lot 2 (revue adversariale 2026-09-11) :
  - un job n'est lisible que par son appelant (`X-Caller-Sub`) ;
  - la cle du service se compare en temps constant et `/health` reste public ;
  - aucun CORS ouvert : le seul client est le proxy Next, cote serveur ;
  - un lot de traduction est borne par la taille des textes, pas seulement leur nombre ;
  - la detection de silence n'accepte que l'hote EPINGLE et telecharge en flux,
    avec un plafond de taille.
"""

import importlib
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

MICROSERVICE_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def local_server(monkeypatch):
    monkeypatch.setenv("MICROSERVICE_API_KEY", "test-secret")
    monkeypatch.setenv("ALLOWED_AUDIO_HOSTS", "bucket.s3.us-east-1.amazonaws.com")
    sys.path.insert(0, str(MICROSERVICE_ROOT))
    for name in ("local_server", "services.silence_service"):
        sys.modules.pop(name, None)
    module = importlib.import_module("local_server")
    yield module
    for name in ("local_server", "services.silence_service"):
        sys.modules.pop(name, None)
    sys.path.remove(str(MICROSERVICE_ROOT))


class FakeJobManager:
    """Le vrai JobManager, sans boucle d'evenements : on n'eprouve que la propriete."""

    def __init__(self):
        from services.job_manager import Job
        self._Job = Job
        self.jobs = {}
        self.submitted = []

    def submit(self, kind, work, owner=None):
        job = self._Job(id=f"{kind}-fixed", kind=kind, owner=owner, status="completed", result={"translations": ["x"]})
        self.jobs[job.id] = job
        self.submitted.append(owner)
        return job.id

    def get(self, job_id, owner=None):
        job = self.jobs.get(job_id)
        if job is None or job.owner != owner:
            return None
        return job

    def inflight_count(self):
        return 0


# ---------------------------------------------------------------------------
# Propriete des jobs
# ---------------------------------------------------------------------------

def test_a_job_is_invisible_to_another_caller(local_server):
    local_server.job_manager = FakeJobManager()
    client = TestClient(local_server.app)
    key = {"X-API-Key": "test-secret"}

    created = client.post(
        "/v1/translate/batch",
        json={"texts": ["bonjour"], "source_lang": "fr", "target_lang": "en"},
        headers={**key, "X-Caller-Sub": "guide-A"},
    )
    assert created.status_code == 202
    job_id = created.json()["job_id"]
    assert local_server.job_manager.submitted == ["guide-A"]

    # Le proprietaire lit son job.
    mine = client.get(f"/v1/jobs/{job_id}", headers={**key, "X-Caller-Sub": "guide-A"})
    assert mine.status_code == 200
    assert mine.json()["status"] == "completed"

    # Un autre compte, meme avec la cle du service et l'identifiant exact : 404.
    theirs = client.get(f"/v1/jobs/{job_id}", headers={**key, "X-Caller-Sub": "guide-B"})
    assert theirs.status_code == 404

    # Sans identite non plus : un job qui appartient a quelqu'un n'est pas public.
    anon = client.get(f"/v1/jobs/{job_id}", headers=key)
    assert anon.status_code == 404


def test_job_manager_scopes_get_by_owner():
    sys.path.insert(0, str(MICROSERVICE_ROOT))
    try:
        from services.job_manager import Job, JobManager
    finally:
        sys.path.remove(str(MICROSERVICE_ROOT))
    manager = JobManager.__new__(JobManager)
    manager._jobs = {"tts-1": Job(id="tts-1", kind="tts", owner="A")}
    assert manager.get("tts-1", owner="A") is not None
    assert manager.get("tts-1", owner="B") is None
    assert manager.get("tts-1") is None
    assert manager.get("absent", owner="A") is None


# ---------------------------------------------------------------------------
# Cle, sante, CORS
# ---------------------------------------------------------------------------

def test_health_is_public_and_wrong_key_is_refused(local_server):
    local_server.job_manager = FakeJobManager()
    client = TestClient(local_server.app)
    assert client.get("/health").status_code == 200
    refused = client.get("/v1/jobs/whatever", headers={"X-API-Key": "test-secre"})
    assert refused.status_code == 401
    refused = client.get("/v1/jobs/whatever")
    assert refused.status_code == 401


def test_api_key_comparison_is_constant_time_and_exact(local_server):
    assert local_server.api_key_matches("test-secret") is True
    assert local_server.api_key_matches("test-secret ") is False
    assert local_server.api_key_matches("") is False
    assert local_server.api_key_matches(None) is False


def test_no_cors_middleware_is_installed(local_server):
    names = [m.cls.__name__ for m in local_server.app.user_middleware]
    assert "CORSMiddleware" not in names
    client = TestClient(local_server.app)
    preflight = client.options(
        "/v1/translate/batch",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in {k.lower() for k in preflight.headers}


# ---------------------------------------------------------------------------
# Bornes
# ---------------------------------------------------------------------------

def test_batch_translation_is_bounded_by_size_not_only_count(local_server):
    local_server.job_manager = FakeJobManager()
    client = TestClient(local_server.app)
    key = {"X-API-Key": "test-secret", "X-Caller-Sub": "g"}
    post = lambda texts: client.post(  # noqa: E731
        "/v1/translate/batch",
        json={"texts": texts, "source_lang": "fr", "target_lang": "en"},
        headers=key,
    )
    # 200 phrases courtes : le decoupage reel d'une scene passe.
    assert post(["Une phrase."] * 200).status_code == 202
    # 201 : trop de textes.
    assert post(["x"] * 201).status_code == 422
    # Un seul texte au-dela de la scene maximale (10 000) : refuse.
    assert post(["x" * 10_001]).status_code == 422
    # Total au-dela de 20 000 caracteres, meme en textes individuellement legaux.
    assert post(["x" * 9_000] * 3).status_code == 422


# ---------------------------------------------------------------------------
# Detection de silence : hote epingle, telechargement borne
# ---------------------------------------------------------------------------

def test_silence_accepts_only_the_pinned_bucket_host(local_server):
    ok = "https://bucket.s3.us-east-1.amazonaws.com/audio/a.wav?X-Amz-Signature=1"
    assert local_server.is_allowed_url(ok) is True
    # Un AUTRE bucket S3, pourtant `*.s3.*.amazonaws.com` : refuse.
    assert local_server.is_allowed_url("https://attacker.s3.eu-west-1.amazonaws.com/x") is False
    assert local_server.is_allowed_url("http://bucket.s3.us-east-1.amazonaws.com/a.wav") is False
    assert local_server.is_allowed_url("https://bucket.s3.us-east-1.amazonaws.com.evil.tld/a") is False


class _FakeResponse:
    def __init__(self, chunks, headers=None):
        self._chunks = chunks
        self.headers = headers or {}

    def raise_for_status(self):
        pass

    def iter_content(self, chunk_size):
        yield from self._chunks

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_download_is_streamed_and_bounded(local_server, monkeypatch):
    import services.silence_service as svc

    monkeypatch.setattr(svc, "MAX_AUDIO_DOWNLOAD_BYTES", 3 * 1024)
    calls = {}

    def fake_get(url, **kwargs):
        calls.update(kwargs)
        return _FakeResponse([b"a" * 1024] * 10, headers={"Content-Type": "audio/wav"})

    monkeypatch.setattr(svc.requests, "get", fake_get)
    with pytest.raises(svc.AudioTooLarge):
        svc.download_audio_bounded("https://bucket.s3.us-east-1.amazonaws.com/big.wav")
    # Le telechargement est bien en flux, et sans suivre de redirection.
    assert calls.get("stream") is True
    assert calls.get("allow_redirects") is False


def test_download_refuses_declared_oversize_before_reading(local_server, monkeypatch):
    import services.silence_service as svc

    def fake_get(url, **kwargs):
        return _FakeResponse([b"x"], headers={"Content-Type": "audio/wav", "Content-Length": str(10**9)})

    monkeypatch.setattr(svc.requests, "get", fake_get)
    with pytest.raises(svc.AudioTooLarge):
        svc.download_audio_bounded("https://bucket.s3.us-east-1.amazonaws.com/big.wav")


def test_download_refuses_non_audio_content(local_server, monkeypatch):
    import services.silence_service as svc

    def fake_get(url, **kwargs):
        return _FakeResponse([b"<html>"], headers={"Content-Type": "text/html"})

    monkeypatch.setattr(svc.requests, "get", fake_get)
    with pytest.raises(ValueError):
        svc.download_audio_bounded("https://bucket.s3.us-east-1.amazonaws.com/page.wav")


def test_download_writes_a_small_audio_to_disk(local_server, monkeypatch):
    import os
    import services.silence_service as svc

    def fake_get(url, **kwargs):
        return _FakeResponse([b"RIFF", b"data"], headers={"Content-Type": "audio/wav"})

    monkeypatch.setattr(svc.requests, "get", fake_get)
    path = svc.download_audio_bounded("https://bucket.s3.us-east-1.amazonaws.com/ok.wav")
    try:
        assert os.path.getsize(path) == 8
    finally:
        os.unlink(path)
