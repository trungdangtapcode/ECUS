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


def test_currency_repeated_in_unique_price_and_amount_context_anchors_to_amount() -> None:
    context = "Unit Price\n(EUR/kg) Amount (EUR)"
    page = "Account (EUR)\n" + context + "\n100"
    offset = resolve_quote_offset(page, "EUR", None, context, currency=True)
    assert offset == page.rindex("EUR")
    assert page[offset : offset + 3] == "EUR"
    with pytest.raises(AppError, match="Repeated quotes"):
        resolve_quote_offset(page, "EUR", None, context)


@pytest.mark.parametrize(
    "context",
    [
        "Currency EUR Unit Price (CAD/kg) Amount (EUR)",
        "Amount (EUR) Amount (EUR)",
        "Account (EUR) Beneficiary (EUR)",
    ],
)
def test_currency_fallback_rejects_conflicting_or_unlabeled_anchors(context: str) -> None:
    page = "Other (EUR)\n" + context
    with pytest.raises(AppError) as error:
        resolve_quote_offset(page, "EUR", None, context, currency=True)
    assert error.value.code == "source_quote_ambiguous"


def test_currency_fallback_requires_exact_unique_context_and_never_relaxes_numbers() -> None:
    context = "Unit Price (EUR/kg) Amount (EUR)"
    for page, quote, evidence in [
        (context + "\n" + context, "EUR", context),
        (context, "EUR", context.replace(" ", "  ")),
        ("Line: 12000\nTotal: 12000", "12000", "Line: 12000\nTotal: 12000"),
    ]:
        with pytest.raises(AppError):
            resolve_quote_offset(page, quote, None, evidence, currency=True)
