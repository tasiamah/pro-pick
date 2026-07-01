"""Add market_predictions table for BTTS, O/U 2.5, and Double Chance picks."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "a1b2c3d4e5f7"
down_revision = "f8b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "market_predictions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("match_id", sa.Integer(), nullable=False),
        sa.Column("market", sa.String(length=32), nullable=False),
        sa.Column("model_version", sa.String(length=40), nullable=False),
        sa.Column("probabilities", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_market_predictions_market"),
        "market_predictions",
        ["market"],
        unique=False,
    )
    op.create_index(
        op.f("ix_market_predictions_match_id"),
        "market_predictions",
        ["match_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_market_predictions_match_id"), table_name="market_predictions"
    )
    op.drop_index(op.f("ix_market_predictions_market"), table_name="market_predictions")
    op.drop_table("market_predictions")
