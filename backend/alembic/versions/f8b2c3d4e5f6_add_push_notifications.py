"""Add push notification tables."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "f8b2c3d4e5f6"
down_revision = "e4a91c0d7b2e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "device_push_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.String(length=64), nullable=False),
        sa.Column("expo_push_token", sa.String(length=255), nullable=False),
        sa.Column("platform", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("expo_push_token"),
    )
    op.create_index(
        op.f("ix_device_push_tokens_device_id"),
        "device_push_tokens",
        ["device_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_device_push_tokens_expo_push_token"),
        "device_push_tokens",
        ["expo_push_token"],
        unique=True,
    )

    op.create_table(
        "match_notification_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.String(length=64), nullable=False),
        sa.Column("match_id", sa.Integer(), nullable=False),
        sa.Column("notification_key", sa.String(length=32), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "device_id",
            "match_id",
            "notification_key",
            name="uq_match_notification_preference",
        ),
    )
    op.create_index(
        op.f("ix_match_notification_preferences_device_id"),
        "match_notification_preferences",
        ["device_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_match_notification_preferences_match_id"),
        "match_notification_preferences",
        ["match_id"],
        unique=False,
    )

    op.create_table(
        "sent_notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.String(length=64), nullable=False),
        sa.Column("match_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("event_fingerprint", sa.String(length=128), nullable=False),
        sa.Column(
            "sent_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "device_id",
            "match_id",
            "event_type",
            "event_fingerprint",
            name="uq_sent_notification",
        ),
    )
    op.create_index(
        op.f("ix_sent_notifications_device_id"),
        "sent_notifications",
        ["device_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sent_notifications_match_id"),
        "sent_notifications",
        ["match_id"],
        unique=False,
    )

    op.create_table(
        "match_state_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("match_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("fixture_status_short", sa.String(length=8), nullable=True),
        sa.Column("home_goals", sa.Integer(), nullable=True),
        sa.Column("away_goals", sa.Integer(), nullable=True),
        sa.Column("lineups_confirmed", sa.Boolean(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("match_id"),
    )
    op.create_index(
        op.f("ix_match_state_snapshots_match_id"),
        "match_state_snapshots",
        ["match_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_match_state_snapshots_match_id"),
        table_name="match_state_snapshots",
    )
    op.drop_table("match_state_snapshots")
    op.drop_index(op.f("ix_sent_notifications_match_id"), table_name="sent_notifications")
    op.drop_index(op.f("ix_sent_notifications_device_id"), table_name="sent_notifications")
    op.drop_table("sent_notifications")
    op.drop_index(
        op.f("ix_match_notification_preferences_match_id"),
        table_name="match_notification_preferences",
    )
    op.drop_index(
        op.f("ix_match_notification_preferences_device_id"),
        table_name="match_notification_preferences",
    )
    op.drop_table("match_notification_preferences")
    op.drop_index(
        op.f("ix_device_push_tokens_expo_push_token"),
        table_name="device_push_tokens",
    )
    op.drop_index(
        op.f("ix_device_push_tokens_device_id"),
        table_name="device_push_tokens",
    )
    op.drop_table("device_push_tokens")
