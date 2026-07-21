from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ecus_api.core.errors import AppError
from ecus_api.modules.cases.models import ShipmentCase
from ecus_api.modules.cases.schemas import CaseCreate, CasePage, CaseRead
from ecus_api.modules.reference.models import DeclarationProfile


async def create_case(session: AsyncSession, data: CaseCreate) -> ShipmentCase:
    profile = await session.get(DeclarationProfile, data.procedure)
    if profile is None or not profile.enabled:
        raise AppError("invalid_procedure", "The declaration profile is unavailable.", 422)
    case = ShipmentCase(**data.model_dump())
    session.add(case)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise AppError(
            "reference_exists", "A case with this reference already exists.", 409
        ) from None
    return case


async def list_cases(session: AsyncSession, limit: int, offset: int) -> CasePage:
    total = await session.scalar(select(func.count()).select_from(ShipmentCase))
    rows = await session.scalars(
        select(ShipmentCase)
        .order_by(ShipmentCase.created_at.desc(), ShipmentCase.id.desc())
        .offset(offset)
        .limit(limit)
    )
    return CasePage(
        items=[CaseRead.model_validate(row) for row in rows],
        total=total or 0,
        limit=limit,
        offset=offset,
    )


async def get_case(session: AsyncSession, case_id: UUID) -> ShipmentCase:
    case = await session.get(ShipmentCase, case_id)
    if case is None:
        raise AppError("case_not_found", "Case not found.", 404)
    return case
