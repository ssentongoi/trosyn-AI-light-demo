"""Add department request models

Revision ID: 2025_07_06_1500
Revises: 2025_07_06_1200
Create Date: 2025-07-06 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, JSON, Enum
from sqlalchemy.sql import func

# revision identifiers, used by Alembic.
revision = '2025_07_06_1500'
down_revision = '2025_07_06_1200'
branch_labels = None
depends_on = None

def upgrade():
    # Create enum types
    request_status = postgresql.ENUM(
        'draft', 'pending', 'in_review', 'approved', 'rejected', 'completed', 'cancelled',
        name='requeststatus',
        create_type=True
    )
    request_status.create(op.get_bind(), checkfirst=True)
    
    request_priority = postgresql.ENUM(
        'low', 'medium', 'high', 'critical',
        name='requestpriority',
        create_type=True
    )
    request_priority.create(op.get_bind(), checkfirst=True)
    
    request_type = postgresql.ENUM(
        'equipment', 'personnel', 'training', 'maintenance', 'other',
        name='requesttype',
        create_type=True
    )
    request_type.create(op.get_bind(), checkfirst=True)
    
    # Create department_requests table
    op.create_table(
        'department_requests',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', request_status, nullable=False, server_default='draft'),
        sa.Column('priority', request_priority, nullable=False, server_default='medium'),
        sa.Column('request_type', request_type, nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('estimated_cost', sa.Integer(), nullable=True),
        sa.Column('requester_id', sa.Integer(), nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.Column('approver_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=func.now(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('custom_fields', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['requester_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approver_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_department_requests_id'), 'department_requests', ['id'], unique=False)
    
    # Create request_comments table
    op.create_table(
        'request_comments',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_internal', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('request_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=func.now(), nullable=True),
        sa.ForeignKeyConstraint(['request_id'], ['department_requests.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_request_comments_id'), 'request_comments', ['id'], unique=False)
    
    # Create request_attachments table
    op.create_table(
        'request_attachments',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(512), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('request_id', sa.Integer(), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=func.now(), nullable=False),
        sa.ForeignKeyConstraint(['request_id'], ['department_requests.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_request_attachments_id'), 'request_attachments', ['id'], unique=False)
    
    # Create request_history table
    op.create_table(
        'request_history',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True, autoincrement=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('request_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=func.now(), nullable=False),
        sa.ForeignKeyConstraint(['request_id'], ['department_requests.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_request_history_id'), 'request_history', ['id'], unique=False)
    op.create_index(op.f('ix_request_history_request_id'), 'request_history', ['request_id'], unique=False)

def downgrade():
    # Drop tables in reverse order of creation
    op.drop_table('request_history')
    op.drop_table('request_attachments')
    op.drop_table('request_comments')
    op.drop_table('department_requests')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS requeststatus CASCADE')
    op.execute('DROP TYPE IF EXISTS requestpriority CASCADE')
    op.execute('DROP TYPE IF EXISTS requesttype CASCADE')
