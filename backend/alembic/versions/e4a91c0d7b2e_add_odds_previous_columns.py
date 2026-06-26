"""add odds previous columns

Revision ID: e4a91c0d7b2e
Revises: d771cf63af08
Create Date: 2026-06-26 22:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e4a91c0d7b2e"
down_revision: str | None = "d771cf63af08"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("odds", sa.Column("previous_home", sa.Float(), nullable=True))
    op.add_column("odds", sa.Column("previous_draw", sa.Float(), nullable=True))
    op.add_column("odds", sa.Column("previous_away", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("odds", "previous_away")
    op.drop_column("odds", "previous_draw")
    op.drop_column("odds", "previous_home")
