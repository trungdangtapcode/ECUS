from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from ecus_api.db.session import get_session
from ecus_api.modules.cases import service
from ecus_api.modules.cases.schemas import (
    CaseArchiveInput,
    CaseCreate,
    CaseDeleteInput,
    CasePage,
    CaseRead,
)

router = APIRouter(prefix="/cases", tags=["cases"])
Session = Annotated[AsyncSession, Depends(get_session)]


@router.post("", response_model=CaseRead, status_code=201, operation_id="createCase")
async def create_case(data: CaseCreate, session: Session) -> CaseRead:
    return CaseRead.model_validate(await service.create_case(session, data))


@router.get("", response_model=CasePage, operation_id="listCases")
async def list_cases(
    session: Session,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    archived: bool = False,
) -> CasePage:
    return await service.list_cases(session, limit, offset, archived)


@router.get("/{case_id}", response_model=CaseRead, operation_id="getCase")
async def get_case(case_id: UUID, session: Session) -> CaseRead:
    return CaseRead.model_validate(await service.get_case(session, case_id))


@router.put("/{case_id}/archive", response_model=CaseRead, operation_id="setCaseArchived")
async def set_archived(case_id: UUID, data: CaseArchiveInput, session: Session) -> CaseRead:
    return CaseRead.model_validate(await service.set_archived(session, case_id, data.archived))


@router.delete("/{case_id}", status_code=204, operation_id="deleteCase")
async def delete_case(case_id: UUID, data: CaseDeleteInput, session: Session) -> Response:
    await service.delete_case(session, case_id, data.reference)
    return Response(status_code=204)
