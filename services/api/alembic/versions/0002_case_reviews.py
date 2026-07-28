"""Add a versioned document review aggregate per shipment case."""

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "case_reviews",
        sa.Column("case_id", sa.Uuid(), primary_key=True),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["shipment_cases.id"]),
    )


def downgrade() -> None:
    op.drop_table("case_reviews")
