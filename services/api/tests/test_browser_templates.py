"""Browser fixtures cover the public mappings without original operational forms."""

import base64
import runpy
from pathlib import Path

import pytest

from ecus_api.core.config import Settings
from ecus_api.modules.review.schemas import TemplateInput
from ecus_api.modules.review.service import validate_template
from ecus_api.modules.review.template_library import Layout, expand_layout

ROOT = Path(__file__).resolve().parents[3]
FIXTURES = runpy.run_path(str(ROOT / "tests/support/seed_templates.py"))


@pytest.mark.parametrize(
    "path",
    sorted(
        path
        for path in (ROOT / "reference-data/excel-layouts").glob("*.json")
        if path.stem in FIXTURES["PROFILE_IDS"]
    ),
    ids=lambda p: p.stem,
)
def test_synthetic_form_covers_every_configured_mapping(path: Path, settings: Settings) -> None:
    layout = Layout.model_validate_json(path.read_text())
    content = FIXTURES["synthetic_form"](layout)
    expanded, mappings, _ = expand_layout(
        content, layout, {group.key: group.maximum for group in layout.groups}
    )
    validate_template(
        expanded,
        TemplateInput(
            revision=0,
            filename=f"synthetic.{layout.file_format}",
            content_base64=base64.b64encode(expanded).decode(),
            version=layout.version,
            mapping_version=layout.version,
            mappings=mappings,
        ),
        settings.review_max_file_bytes,
    )


@pytest.mark.parametrize(
    ("environment", "transport"), [("development", False), ("development", True), ("test", False)]
)
async def test_synthetic_template_seeding_refuses_operational_environment(
    settings: Settings, environment: str, transport: bool
) -> None:
    with pytest.raises(RuntimeError, match="isolated test environment"):
        await FIXTURES["seed_templates"](
            settings.model_copy(update={"app_env": environment, "ai_test_transport": transport}),
            ROOT,
        )
