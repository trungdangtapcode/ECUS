"""Register private, sanitized Excel layouts independently from case workspaces."""

import sqlalchemy as sa

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "review_template_profiles",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("definition", sa.JSON(), nullable=False),
        sa.Column("storage_key", sa.String(64), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("review_template_profiles")
