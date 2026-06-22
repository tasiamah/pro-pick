"""initial schema

Revision ID: d771cf63af08
Revises:
Create Date: 2026-06-22 20:39:24.344579

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d771cf63af08"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "competitions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("external_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("season", sa.String(length=20), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_competitions_external_id"),
        "competitions",
        ["external_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_competitions_name"), "competitions", ["name"], unique=False
    )

    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("external_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("logo_url", sa.String(length=255), nullable=True),
        sa.Column("competition_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_teams_external_id"), "teams", ["external_id"], unique=True)
    op.create_index(op.f("ix_teams_name"), "teams", ["name"], unique=False)

    op.create_table(
        "matches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("external_id", sa.Integer(), nullable=True),
        sa.Column("competition_id", sa.Integer(), nullable=True),
        sa.Column("home_team_id", sa.Integer(), nullable=False),
        sa.Column("away_team_id", sa.Integer(), nullable=False),
        sa.Column("kickoff", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("home_goals", sa.Integer(), nullable=True),
        sa.Column("away_goals", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["away_team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"]),
        sa.ForeignKeyConstraint(["home_team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_matches_external_id"), "matches", ["external_id"], unique=True
    )
    op.create_index(op.f("ix_matches_kickoff"), "matches", ["kickoff"], unique=False)

    op.create_table(
        "odds",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("match_id", sa.Integer(), nullable=False),
        sa.Column("bookmaker", sa.String(length=80), nullable=False),
        sa.Column("home", sa.Float(), nullable=False),
        sa.Column("draw", sa.Float(), nullable=False),
        sa.Column("away", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_odds_match_id"), "odds", ["match_id"], unique=False)

    op.create_table(
        "predictions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("match_id", sa.Integer(), nullable=False),
        sa.Column("model_version", sa.String(length=40), nullable=False),
        sa.Column("prob_home", sa.Float(), nullable=False),
        sa.Column("prob_draw", sa.Float(), nullable=False),
        sa.Column("prob_away", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_predictions_match_id"), "predictions", ["match_id"], unique=False
    )

    op.create_table(
        "value_bets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("match_id", sa.Integer(), nullable=False),
        sa.Column("outcome", sa.String(length=10), nullable=False),
        sa.Column("model_prob", sa.Float(), nullable=False),
        sa.Column("odd", sa.Float(), nullable=False),
        sa.Column("expected_value", sa.Float(), nullable=False),
        sa.Column("edge", sa.Float(), nullable=False),
        sa.Column("recommended_stake", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("settled", sa.Boolean(), nullable=False),
        sa.Column("profit", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_value_bets_match_id"), "value_bets", ["match_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_value_bets_match_id"), table_name="value_bets")
    op.drop_table("value_bets")
    op.drop_index(op.f("ix_predictions_match_id"), table_name="predictions")
    op.drop_table("predictions")
    op.drop_index(op.f("ix_odds_match_id"), table_name="odds")
    op.drop_table("odds")
    op.drop_index(op.f("ix_matches_kickoff"), table_name="matches")
    op.drop_index(op.f("ix_matches_external_id"), table_name="matches")
    op.drop_table("matches")
    op.drop_index(op.f("ix_teams_name"), table_name="teams")
    op.drop_index(op.f("ix_teams_external_id"), table_name="teams")
    op.drop_table("teams")
    op.drop_index(op.f("ix_competitions_name"), table_name="competitions")
    op.drop_index(op.f("ix_competitions_external_id"), table_name="competitions")
    op.drop_table("competitions")
