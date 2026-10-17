"""Resolve AI evidence locally without trusting model-generated character counts."""

import re

from ecus_api.core.errors import AppError


def _currency_header_offset(text: str, quote: str, context: str | None) -> int | None:
    """Narrow a unique repeated-code context to one explicitly labeled monetary header."""
    if not context or text.count(context) != 1 or not re.fullmatch(r"[A-Z]{3}", quote):
        return None
    pattern = re.compile(
        r"\b(?P<label>currency|invoice\s+total|grand\s+total|total(?:\s+amount)?|"
        r"amount|unit\s+price)\s*[:(\[]?\s*(?P<code>[A-Z]{3})\b",
        re.IGNORECASE,
    )
    headers = list(pattern.finditer(context))
    if not headers or {match.group("code").upper() for match in headers} != {quote}:
        return None

    # The amount/currency header identifies invoice currency more precisely than a price unit.
    def priority(match: re.Match[str]) -> int:
        label = " ".join(match.group("label").lower().split())
        return 0 if label == "currency" else 2 if label == "unit price" else 1

    best = min(priority(match) for match in headers)
    candidates = [match for match in headers if priority(match) == best]
    if len(candidates) != 1 or candidates[0].group("code") != quote:
        return None
    return text.index(context) + candidates[0].start("code")


def resolve_quote_offset(
    text: str,
    quote: str,
    offset: int | None,
    context: str | None = None,
    *,
    currency: bool = False,
) -> int:
    if not quote.strip() or quote not in text:
        raise AppError("source_quote_missing", "The exact quote is absent from the page.", 422)
    if text.count(quote) == 1:
        # An exact, unique quote has one provable position regardless of the AI's count.
        return text.index(quote)
    if context and text.count(context) == 1 and context.count(quote) == 1:
        return text.index(context) + context.index(quote)
    if offset is not None and text[offset : offset + len(quote)] == quote:
        return offset
    if currency and (resolved := _currency_header_offset(text, quote, context)) is not None:
        return resolved
    raise AppError(
        "source_quote_ambiguous", "Repeated quotes require exact occurrence evidence.", 422
    )
