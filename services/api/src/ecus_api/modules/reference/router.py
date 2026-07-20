from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ecus_api.db.session import get_session
from ecus_api.modules.reference.models import DeclarationProfile
from ecus_api.modules.review import template_library

router = APIRouter(prefix="/reference", tags=["reference"])


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    name: str


@router.get("/profiles", response_model=list[ProfileRead], operation_id="listProfiles")
async def list_profiles(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ProfileRead]:
    rows = await session.scalars(
        select(DeclarationProfile)
        .where(DeclarationProfile.enabled.is_(True))
        .order_by(DeclarationProfile.code)
    )
    return [ProfileRead.model_validate(row) for row in rows]


@router.get(
    "/excel-templates",
    response_model=list[template_library.TemplateProfileRead],
    operation_id="listExcelTemplateProfiles",
)
async def list_excel_templates(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[template_library.TemplateProfileRead]:
    return await template_library.list_profiles(session)
