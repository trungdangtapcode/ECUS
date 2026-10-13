"""Evidence anchoring uses exact page content and rejects ambiguous occurrences."""

import pytest

from ecus_api.core.errors import AppError
from ecus_api.modules.review.source_anchors import resolve_quote_offset


def test_unique_quote_ignores_inaccurate_ai_character_count() -> None:
    page = "Hóa đơn\nInvoice: INV-001\nTotal: 12000"
    assert resolve_quote_offset(page, "INV-001", 1) == page.index("INV-001")


def test_repeated_number_uses_exact_unique_context() -> None:
    page = "Invoice\nLine: 12000\nTotal: 12000"
    assert resolve_quote_offset(page, "12000", 0, "Total: 12000") == page.rindex("12000")
    assert resolve_quote_offset(page, "12000", page.index("12000")) == page.index("12000")


@pytest.mark.parametrize(
    ("quote", "context", "code"),
    [
        ("12000.00", "Total: 12000", "source_quote_missing"),
        ("12000", None, "source_quote_ambiguous"),
        ("12000", "12000", "source_quote_ambiguous"),
        ("12000", "Total: 12000.00", "source_quote_ambiguous"),
        ("12000", "Line: 12000\nTotal: 12000", "source_quote_ambiguous"),
    ],
)
def test_unsupported_or_ambiguous_evidence_is_rejected(
    quote: str, context: str | None, code: str
) -> None:
    with pytest.raises(AppError) as error:
        resolve_quote_offset("Line: 12000\nTotal: 12000", quote, 0, context)
    assert error.value.code == code
