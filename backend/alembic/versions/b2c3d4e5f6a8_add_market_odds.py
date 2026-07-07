"""Add market_odds table for BTTS and Over/Under 2.5 bookmaker prices."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "b2c3d4e5f6a8"
down_revision = "a1b2c3d4e5f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "market_odds",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("match_id", sa.Integer(), nullable=False),
        sa.Column("bookmaker", sa.String(length=80), nullable=False),
        sa.Column("market", sa.String(length=32), nullable=False),
        sa.Column("outcome", sa.String(length=16), nullable=False),
        sa.Column("odd", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "match_id",
            "bookmaker",
            "market",
            "outcome",
            name="uq_market_odds_match_bookmaker_market_outcome",
        ),
    )
    op.create_index(
        op.f("ix_market_odds_match_id"),
        "market_odds",
        ["match_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_market_odds_market"),
        "market_odds",
        ["market"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_market_odds_market"), table_name="market_odds")
    op.drop_index(op.f("ix_market_odds_match_id"), table_name="market_odds")
    op.drop_table("market_odds")
