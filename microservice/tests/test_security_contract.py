import importlib
import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient


MICROSERVICE_ROOT = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize("module_name", ["main", "local_server"])
def test_service_refuses_to_import_without_api_key(module_name):
    env = os.environ.copy()
    env.pop("MICROSERVICE_API_KEY", None)

    result = subprocess.run(
        [sys.executable, "-c", f"import {module_name}"],
        cwd=MICROSERVICE_ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert "MICROSERVICE_API_KEY is required" in result.stderr


@pytest.mark.parametrize("module_name", ["main", "local_server"])
def test_service_refuses_to_import_with_blank_api_key(module_name):
    env = os.environ.copy()
    env["MICROSERVICE_API_KEY"] = "   "

    result = subprocess.run(
        [sys.executable, "-c", f"import {module_name}"],
        cwd=MICROSERVICE_ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert "MICROSERVICE_API_KEY is required" in result.stderr


@pytest.fixture
def local_server(monkeypatch):
    monkeypatch.setenv("MICROSERVICE_API_KEY", "test-secret")
    sys.path.insert(0, str(MICROSERVICE_ROOT))
    sys.modules.pop("local_server", None)
    module = importlib.import_module("local_server")
    yield module
    sys.modules.pop("local_server", None)
    sys.path.remove(str(MICROSERVICE_ROOT))


@pytest.fixture
def production_server(monkeypatch):
    monkeypatch.setenv("MICROSERVICE_API_KEY", "test-secret")
    sys.path.insert(0, str(MICROSERVICE_ROOT))
    sys.modules.pop("main", None)
    module = importlib.import_module("main")
    yield module
    sys.modules.pop("main", None)
    sys.path.remove(str(MICROSERVICE_ROOT))


def test_health_is_public_but_business_endpoints_require_the_key(local_server):
    local_server.job_manager = SimpleNamespace(
        submit=lambda _kind, _work: "tts-test-job",
        inflight_count=lambda: 0,
    )
    client = TestClient(local_server.app)

    assert client.get("/health").status_code == 200
    assert client.post(
        "/v1/tts/generate",
        json={"text": "Bonjour", "language": "fr"},
    ).status_code == 401
    assert client.post(
        "/v1/tts/generate",
        headers={"X-API-Key": "wrong"},
        json={"text": "Bonjour", "language": "fr"},
    ).status_code == 401

    accepted = client.post(
        "/v1/tts/generate",
        headers={"X-API-Key": "test-secret"},
        json={"text": "Bonjour", "language": "fr"},
    )
    assert accepted.status_code == 202
    assert accepted.json()["job_id"] == "tts-test-job"


def test_async_polling_contract_returns_completed_results(local_server):
    local_server.job_manager = SimpleNamespace(
        get=lambda job_id: SimpleNamespace(
            status="completed",
            result={"audio_base64": "QUJD", "duration_ms": 1000},
            error=None,
        )
        if job_id == "tts-test-job"
        else None,
    )
    client = TestClient(local_server.app)

    response = client.get(
        "/v1/jobs/tts-test-job",
        headers={"X-API-Key": "test-secret"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "status": "completed",
        "audio_base64": "QUJD",
        "duration_ms": 1000,
    }


def test_production_qwen_server_exposes_submit_poll_and_backpressure(production_server):
    class AcceptingManager:
        def submit(self, _kind, _work):
            return "tts-production-job"

        def get(self, job_id):
            if job_id != "tts-production-job":
                return None
            return SimpleNamespace(
                status="completed",
                result={"audio_base64": "QUJD", "duration_ms": 1000},
                error=None,
            )

    production_server.tts_service = SimpleNamespace(is_ready=True)
    production_server.job_manager = AcceptingManager()
    client = TestClient(production_server.app)

    submitted = client.post(
        "/v1/tts/generate",
        headers={"X-API-Key": "test-secret"},
        json={"text": "Bonjour", "language": "fr"},
    )
    assert submitted.status_code == 202
    assert submitted.json()["job_id"] == "tts-production-job"

    completed = client.get(
        "/v1/jobs/tts-production-job",
        headers={"X-API-Key": "test-secret"},
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"

    production_server.job_manager = SimpleNamespace(
        submit=lambda _kind, _work: (_ for _ in ()).throw(production_server.QueueFull()),
    )
    busy = client.post(
        "/v1/tts/generate",
        headers={"X-API-Key": "test-secret"},
        json={"text": "Bonjour", "language": "fr"},
    )
    assert busy.status_code == 429
    assert busy.headers["Retry-After"] == "5"


def test_production_server_bounds_batch_items_and_hides_worker_errors(production_server):
    client = TestClient(production_server.app)
    production_server.translation_service = SimpleNamespace()

    oversized = client.post(
        "/v1/translate/batch",
        headers={"X-API-Key": "test-secret"},
        json={
            "texts": ["x" * 50_001],
            "source_lang": "fr",
            "target_lang": "en",
        },
    )
    assert oversized.status_code == 422

    production_server.job_manager = SimpleNamespace(
        get=lambda _job_id: SimpleNamespace(
            status="failed",
            result=None,
            error="secret path /srv/models/private",
        ),
    )
    failed = client.get(
        "/v1/jobs/translate-test",
        headers={"X-API-Key": "test-secret"},
    )
    assert failed.status_code == 200
    assert failed.json() == {
        "ok": False,
        "status": "failed",
        "error": "job failed",
    }


def test_production_container_runs_the_qwen_async_server():
    dockerfile = (MICROSERVICE_ROOT / "Dockerfile").read_text(encoding="utf-8")
    start_script = (MICROSERVICE_ROOT / "start-local.ps1").read_text(encoding="utf-8")

    assert '"main:app"' in dockerfile
    assert "COPY requirements.txt ." in dockerfile
    assert "-r requirements.txt" in dockerfile
    assert '$env:MICROSERVICE_API_KEY = "' not in start_script
    assert "IsNullOrWhiteSpace($env:MICROSERVICE_API_KEY)" in start_script
