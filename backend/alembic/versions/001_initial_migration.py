"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('filename', sa.Text(), nullable=False),
        sa.Column('original_name', sa.Text(), nullable=False),
        sa.Column('file_type', sa.Text(), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('status', sa.Text(), nullable=False, server_default='queued'),
        sa.Column('job_id', sa.Text(), nullable=True),
        sa.Column('progress', sa.Integer(), server_default='0'),
        sa.Column('current_stage', sa.Text(), server_default='job_queued'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('raw_result', sa.JSON(), nullable=True),
        sa.Column('reviewed_result', sa.JSON(), nullable=True),
        sa.Column('is_finalized', sa.Boolean(), server_default='false'),
        sa.Column('retry_count', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'))
    )


def downgrade() -> None:
    op.drop_table('documents')
