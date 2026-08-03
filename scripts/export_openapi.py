"""Generate the API contract without a running database or provider call."""

import argparse
import json
from pathlib import Path

from ecus_api.core.config import Settings
from ecus_api.main import create_app
from pydantic import SecretStr

target = Path(__file__).resolve().parents[1] / "packages/api-client/openapi.json"
settings = Settings(_env_file=None, database_url=SecretStr("sqlite+aiosqlite://"))
document = json.dumps(create_app(settings).openapi(), indent=2, sort_keys=True) + "\n"
parser = argparse.ArgumentParser()
parser.add_argument("--check", action="store_true")
args = parser.parse_args()
if args.check:
    if not target.exists() or target.read_text() != document:
        raise SystemExit("API contract is stale. Run npm run api:generate.")
else:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(document)
