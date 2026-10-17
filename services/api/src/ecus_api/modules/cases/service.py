from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ecus_api.core.errors import AppError
from ecus_api.db.base import utcnow
from ecus_api.jobs.models import ProcessingJob
from ecus_api.modules.cases.models import ShipmentCase
from ecus_api.modules.cases.schemas import CaseCreate, CasePage, CaseRead
from ecus_api.modules.reference.models import DeclarationProfile
from ecus_api.modules.review.models import CaseReview


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


async def list_cases(
    session: AsyncSession, limit: int, offset: int, archived: bool = False
) -> CasePage:
    scope = (
        ShipmentCase.archived_at.is_not(None) if archived else ShipmentCase.archived_at.is_(None)
    )
    total = await session.scalar(select(func.count()).select_from(ShipmentCase).where(scope))
    rows = await session.scalars(
        select(ShipmentCase)
        .where(scope)
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


async def get_case(
    session: AsyncSession, case_id: UUID, *, for_update: bool = False
) -> ShipmentCase:
    statement = select(ShipmentCase).where(ShipmentCase.id == case_id)
    if for_update:
        statement = statement.with_for_update().execution_options(populate_existing=True)
    case = await session.scalar(statement)
    if case is None:
        raise AppError("case_not_found", "Case not found.", 404)
    return case


async def require_active_case(session: AsyncSession, case_id: UUID) -> ShipmentCase:
    case = await get_case(session, case_id, for_update=True)
    if case.archived_at is not None:
        raise AppError("case_archived", "Restore this case before making changes.", 409)
    return case


async def set_archived(session: AsyncSession, case_id: UUID, archived: bool) -> ShipmentCase:
    case = await get_case(session, case_id, for_update=True)
    if (case.archived_at is not None) == archived:
        return case
    if archived:
        await ensure_idle(session, case_id)
    case.archived_at = utcnow() if archived else None
    await session.commit()
    return case


async def ensure_idle(session: AsyncSession, case_id: UUID) -> None:
    if await session.scalar(
        select(ProcessingJob.id)
        .where(
            ProcessingJob.payload["case_id"].as_string() == str(case_id),
            ProcessingJob.status.in_(["pending", "running"]),
        )
        .limit(1)
    ):
        raise AppError("case_processing_active", "Wait for case processing to finish.", 409)


async def delete_case(session: AsyncSession, case_id: UUID, reference: str) -> None:
    case = await get_case(session, case_id, for_update=True)
    if reference != case.reference:
        raise AppError("case_reference_mismatch", "Enter the exact case reference.", 422)
    await ensure_idle(session, case_id)
    # Blob storage is content-addressed and may be shared with other cases or templates.
    # Remove case-owned database records, never unlink shared source material here.
    await session.execute(delete(CaseReview).where(CaseReview.case_id == case_id))
    await session.execute(
        delete(ProcessingJob).where(ProcessingJob.payload["case_id"].as_string() == str(case_id))
    )
    await session.delete(case)
    await session.commit()
