"""Review-link setup tests mock the local agent; no network or AI calls are made."""

import importlib.util
import json
import sys
from pathlib import Path

import httpx
import pytest


@pytest.mark.parametrize("mode", ["configured", "unsupported_update", "unprotected"])
def test_review_link_requires_auth_and_reuses_or_replaces_agent_endpoint(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, mode: str
) -> None:
    source = Path(__file__).resolve().parents[3] / "scripts/setup_review_gateway.py"
    spec = importlib.util.spec_from_file_location("review_gateway_setup", source)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    monkeypatch.chdir(tmp_path)
    (tmp_path / ".env").write_text("")
    access_path = tmp_path / ".data/client-review/access.json"
    access_path.parent.mkdir(parents=True)
    access = {
        "local_url": "http://127.0.0.1:5180",
        "public_url": "https://original.example.test",
        "username": "synthetic",
        "password": "synthetic-password",
    }
    access_path.write_text(json.dumps(access))
    current = {
        "name": "existing",
        "url": access["public_url"],
        "upstream": {"url": access["local_url"] if mode == "configured" else "http://localhost:17"},
        "inspect": mode != "configured",
    }
    calls: list[tuple[str, str]] = []

    def respond(request: httpx.Request) -> httpx.Response:
        nonlocal current
        calls.append((request.method, request.url.path))
        if request.url.path == "/api/v1/health/ready":
            status = 200 if request.headers.get("authorization") or mode == "unprotected" else 401
            return httpx.Response(status, json={"status": "ready"})
        if request.method == "GET" and request.url.path == "/api/endpoints":
            return httpx.Response(200, json={"endpoints": [current]})
        if request.method == "PUT":
            return httpx.Response(405)
        if request.method == "DELETE":
            return httpx.Response(204)
        if request.method == "POST":
            payload = json.loads(request.content)
            assert not {"bind_tls", "domain", "url"}.intersection(payload)
            assert payload["inspect"] is False
            current = {
                "name": payload["name"],
                "url": "https://assigned.example.test",
                "upstream": payload["upstream"],
                "inspect": False,
            }
            # Some agents return a legacy tunnel body even on this newer route.
            return httpx.Response(201, json={"public_url": current["url"]})
        raise AssertionError("Unexpected agent request")

    original_client = httpx.Client
    monkeypatch.setattr(
        module.httpx,
        "Client",
        lambda **kwargs: original_client(transport=httpx.MockTransport(respond), **kwargs),
    )
    if mode == "unprotected":
        with pytest.raises(RuntimeError, match="reject anonymous"):
            module.connect_tunnel()
        assert calls == [("GET", "/api/v1/health/ready")]
    else:
        module.connect_tunnel()
        saved = json.loads(access_path.read_text())
        assert saved["password"] == access["password"]
        if mode == "configured":
            assert saved["public_url"] == access["public_url"]
            assert all(method == "GET" for method, _ in calls)
        else:
            assert saved["public_url"] == "https://assigned.example.test"
            assert "REVIEW_PUBLIC_URL" in (tmp_path / ".env").read_text()
            assert current["upstream"]["url"] == access["local_url"]
            assert current["inspect"] is False
