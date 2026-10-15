"""Configure an optional authenticated review gateway without printing credentials."""

import argparse
import json
import os
import secrets
import subprocess
from pathlib import Path

import httpx
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ReviewSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="REVIEW_", extra="ignore")

    gateway_port: int = Field(default=5180, ge=1024, le=65535)
    auth_username: str = Field(default="review", pattern=r"^[a-zA-Z0-9_-]{1,32}$")
    auth_file: Path = Path(".data/client-review/htpasswd")
    access_file: Path = Path(".data/client-review/access.json")
    public_url: str = ""


def update_environment(values: dict[str, str]) -> None:
    environment = Path(".env")
    lines = environment.read_text().splitlines()
    lines = [line for line in lines if line.partition("=")[0] not in values]
    environment.write_text(
        "\n".join([*lines, *(f"{key}={value}" for key, value in values.items())]) + "\n"
    )


def configure() -> None:
    settings = ReviewSettings()
    access_path = settings.access_file.resolve()
    auth_path = settings.auth_file.resolve()
    for path in [access_path, auth_path]:
        path.parent.mkdir(parents=True, exist_ok=True)
        os.chmod(path.parent, 0o700)
    previous = json.loads(access_path.read_text()) if access_path.exists() else {}
    password = previous.get("password") or secrets.token_urlsafe(24)
    hashed = subprocess.run(
        ["openssl", "passwd", "-6", "-stdin"],
        input=password + "\n",
        text=True,
        capture_output=True,
        check=True,
    ).stdout.strip()
    auth_path.write_text(f"{settings.auth_username}:{hashed}\n")
    os.chmod(auth_path, 0o644)  # Container-readable hash inside a private host directory.
    public_url = settings.public_url
    try:
        response = httpx.get("http://127.0.0.1:4040/api/endpoints", timeout=3)
        response.raise_for_status()
        public_url = next(
            (
                endpoint["url"]
                for endpoint in response.json().get("endpoints", [])
                if str(endpoint.get("url", "")).startswith("https://")
                and str(endpoint.get("upstream", {}).get("url", ""))
                .rstrip("/")
                .endswith(f":{settings.gateway_port}")
            ),
            public_url,
        )
    except (httpx.HTTPError, ValueError, KeyError):
        pass
    access_path.write_text(
        json.dumps(
            {
                "public_url": public_url,
                "local_url": f"http://127.0.0.1:{settings.gateway_port}",
                "username": settings.auth_username,
                "password": password,
            },
            indent=2,
        )
        + "\n"
    )
    os.chmod(access_path, 0o600)
    values = {
        "REVIEW_GATEWAY_PORT": str(settings.gateway_port),
        "REVIEW_AUTH_FILE": json.dumps(str(auth_path)),
        "REVIEW_ACCESS_FILE": json.dumps(str(access_path)),
    }
    if public_url:
        values["REVIEW_PUBLIC_URL"] = json.dumps(public_url)
    update_environment(values)
    print(f"Review gateway configured. Private access details: {access_path}")


def connect_tunnel() -> None:
    settings = ReviewSettings()
    access_path = settings.access_file.resolve()
    access = json.loads(access_path.read_text())
    with httpx.Client(timeout=20) as client:
        # Verify access control before changing a public endpoint's upstream.
        if client.get(access["local_url"] + "/api/v1/health/ready").status_code != 401:
            raise RuntimeError("The review gateway must reject anonymous API requests.")
        ready = client.get(
            access["local_url"] + "/api/v1/health/ready",
            auth=(access["username"], access["password"]),
        )
        ready.raise_for_status()
        response = client.get("http://127.0.0.1:4040/api/endpoints")
        response.raise_for_status()
        endpoints = response.json().get("endpoints", [])
        matching = [item for item in endpoints if item.get("url") == access["public_url"]]
        if len(matching) != 1:
            raise RuntimeError("Configure REVIEW_PUBLIC_URL for one existing ngrok endpoint.")
        previous = matching[0]
        if (
            previous.get("upstream", {}).get("url") == access["local_url"]
            and previous.get("inspect") is False
        ):
            print(f"Authenticated app link: {access['public_url']}")
            return
        backup = access_path.parent / "ngrok-endpoint-before.json"
        if not backup.exists():
            backup.write_text(json.dumps(previous, indent=2) + "\n")
            os.chmod(backup, 0o600)
        payload = {
            key: previous[key]
            for key in ["name", "url", "traffic_policy", "pooling_enabled"]
            if key in previous
        }
        payload.update(upstream={"url": access["local_url"]}, inspect=False)
        response = client.put(
            "http://127.0.0.1:4040/api/endpoints/" + previous["name"], json=payload
        )
        if response.status_code == 405:
            # Older agents support create/delete, but not endpoint updates. Let
            # the provider assign a free URL instead of requesting a paid domain.
            deleted = client.delete("http://127.0.0.1:4040/api/tunnels/" + previous["name"])
            deleted.raise_for_status()
            name = f"ecus_review_{secrets.token_hex(6)}"
            response = client.post(
                "http://127.0.0.1:4040/api/endpoints",
                json={"name": name, "upstream": {"url": access["local_url"]}, "inspect": False},
            )
            response.raise_for_status()
        else:
            name = previous["name"]
        response.raise_for_status()
        response = client.get("http://127.0.0.1:4040/api/endpoints")
        response.raise_for_status()
        current = next(item for item in response.json()["endpoints"] if item["name"] == name)
        if current.get("upstream", {}).get("url") != access["local_url"]:
            raise RuntimeError("The ngrok endpoint did not adopt the review gateway upstream.")
        if current.get("inspect") is not False:
            raise RuntimeError("Request inspection must be disabled for private client review.")
        if not current["url"].startswith("https://"):
            raise RuntimeError("Client review requires an HTTPS ngrok endpoint.")
        access["public_url"] = current["url"]
        access_path.write_text(json.dumps(access, indent=2) + "\n")
        os.chmod(access_path, 0o600)
        update_environment({"REVIEW_PUBLIC_URL": json.dumps(access["public_url"])})
    print(f"Authenticated app link: {access['public_url']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--connect-tunnel", action="store_true")
    args = parser.parse_args()
    if args.connect_tunnel:
        connect_tunnel()
    else:
        configure()
