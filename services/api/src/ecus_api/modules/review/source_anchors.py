"""Resolve AI evidence locally without trusting model-generated character counts."""

from ecus_api.core.errors import AppError


def resolve_quote_offset(
    text: str, quote: str, offset: int | None, context: str | None = None
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
    raise AppError(
        "source_quote_ambiguous", "Repeated quotes require exact occurrence evidence.", 422
    )
