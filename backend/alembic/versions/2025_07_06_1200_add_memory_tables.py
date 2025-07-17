"""Add memory tables

Revision ID: 2025_07_06_1200
Revises:
Create Date: 2025-07-06 12:00:00.000000

"""

import json

import sqlalchemy as sa
from sqlalchemy import text

from alembic import op
from alembic.migration import MigrationContext
from alembic.operations import Operations

# revision identifiers, used by Alembic.
revision = "2025_07_06_1200"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create memory_interactions table with session_id included from the start
    op.create_table(
        "memory_interactions",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("conversation_id", sa.String(36), index=True, nullable=True),
        sa.Column("query", sa.Text, nullable=False),
        sa.Column("response", sa.Text, nullable=True),
        sa.Column("source", sa.String(50), nullable=False, server_default="chat"),
        sa.Column("metadata", sa.Text, nullable=True, server_default="{}"),
        sa.Column("is_private", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("retention_days", sa.Integer, nullable=True),
        sa.Column(
            "session_id", sa.String(36), nullable=True
        ),  # We'll add the FK after creating memory_sessions
        sa.Column(
            "created_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
    )

    # Create indexes for memory_interactions
    op.create_index(
        "ix_memory_interactions_user_id", "memory_interactions", ["user_id"]
    )
    op.create_index(
        "ix_memory_interactions_created_at", "memory_interactions", ["created_at"]
    )
    op.create_index(
        "ix_memory_interactions_updated_at", "memory_interactions", ["updated_at"]
    )

    # Create memory_contexts table
    op.create_table(
        "memory_contexts",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("context_data", sa.Text, nullable=False, server_default="{}"),
        sa.Column("is_private", sa.Boolean, nullable=False, server_default="1"),
        sa.Column(
            "access_level", sa.String(20), nullable=False, server_default="private"
        ),
        sa.Column(
            "created_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
    )

    # Create indexes for memory_contexts
    op.create_index("ix_memory_contexts_user_id", "memory_contexts", ["user_id"])
    op.create_index("ix_memory_contexts_created_at", "memory_contexts", ["created_at"])
    op.create_index("ix_memory_contexts_updated_at", "memory_contexts", ["updated_at"])

    # Create memory_sessions table
    op.create_table(
        "memory_sessions",
        sa.Column("id", sa.String(36), primary_key=True, index=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(200), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "tags", sa.Text, nullable=True, server_default="[]"
        ),  # Store as JSON string
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("metadata", sa.Text, nullable=True, server_default="{}"),
        sa.Column(
            "started_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
        sa.Column("ended_at", sa.DateTime, nullable=True),
        sa.Column(
            "last_activity", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "created_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
    )

    # Create indexes for memory_sessions
    op.create_index("ix_memory_sessions_user_id", "memory_sessions", ["user_id"])
    op.create_index("ix_memory_sessions_is_active", "memory_sessions", ["is_active"])
    op.create_index("ix_memory_sessions_started_at", "memory_sessions", ["started_at"])
    op.create_index(
        "ix_memory_sessions_last_activity", "memory_sessions", ["last_activity"]
    )

    # Create index for session_id in memory_interactions
    op.create_index(
        "ix_memory_interactions_session_id", "memory_interactions", ["session_id"]
    )

    # For SQLite, we can't add foreign key constraints after table creation
    # If we need to enforce the foreign key constraint, we would need to use batch operations
    # to recreate the table with the constraint


def downgrade():
    # Drop tables and their indexes in reverse order
    op.drop_index("ix_memory_interactions_session_id", table_name="memory_interactions")
    op.drop_table("memory_sessions")
    op.drop_table("memory_contexts")
    op.drop_table("memory_interactions")
