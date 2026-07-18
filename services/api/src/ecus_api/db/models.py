"""Explicit model registry for Alembic and tests; imports must be side-effect free."""

from ecus_api.jobs.models import ProcessingJob
from ecus_api.modules.cases.models import ShipmentCase
from ecus_api.modules.reference.models import DeclarationProfile
from ecus_api.modules.review.models import CaseReview
from ecus_api.modules.review.template_library import TemplateProfile

__all__ = ["CaseReview", "DeclarationProfile", "ProcessingJob", "ShipmentCase", "TemplateProfile"]
