import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.memory import MemoryContext, MemoryInteraction, MemorySession
from app.schemas.memory import (
    MemoryContextCreate,
    MemoryContextInDB,
    MemoryContextUpdate,
    MemoryInteractionCreate,
    MemoryInteractionInDB,
    MemoryInteractionUpdate,
    MemorySessionCreate,
    MemorySessionInDB,
    MemorySessionUpdate,
    MemoryStats,
)


class MemoryService:
    """Service for managing memory-related operations"""

    @staticmethod
    async def create_interaction(
        db: AsyncSession,
        user_id: str,
        interaction: MemoryInteractionCreate,
        session_id: Optional[str] = None,
    ) -> MemoryInteractionInDB:
        """Create a new memory interaction"""
        db_interaction = MemoryInteraction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            query=interaction.query,
            response=interaction.response,
            conversation_id=interaction.conversation_id,
            source=interaction.source,
            metadata_=json.dumps(interaction.metadata),
            is_private=interaction.is_private,
            retention_days=interaction.retention_days,
            session_id=session_id,
        )

        db.add(db_interaction)
        await db.commit()
        await db.refresh(db_interaction)

        # Convert JSON string back to dict for response
        metadata = (
            json.loads(db_interaction.metadata_) if db_interaction.metadata_ else {}
        )

        return MemoryInteractionInDB(
            id=db_interaction.id,
            user_id=db_interaction.user_id,
            query=db_interaction.query,
            response=db_interaction.response,
            conversation_id=db_interaction.conversation_id,
            source=db_interaction.source,
            metadata=metadata,
            is_private=db_interaction.is_private,
            retention_days=db_interaction.retention_days,
            created_at=db_interaction.created_at,
            updated_at=db_interaction.updated_at,
        )

    @staticmethod
    async def get_interaction(
        db: AsyncSession, interaction_id: str
    ) -> Optional[MemoryInteractionInDB]:
        """Get a memory interaction by ID"""
        result = await db.execute(
            select(MemoryInteraction).where(MemoryInteraction.id == interaction_id)
        )
        db_interaction = result.scalars().first()

        if not db_interaction:
            return None

        # Convert JSON string back to dict for response
        metadata = (
            json.loads(db_interaction.metadata_) if db_interaction.metadata_ else {}
        )

        return MemoryInteractionInDB(
            id=db_interaction.id,
            user_id=db_interaction.user_id,
            query=db_interaction.query,
            response=db_interaction.response,
            conversation_id=db_interaction.conversation_id,
            source=db_interaction.source,
            metadata=metadata,
            is_private=db_interaction.is_private,
            retention_days=db_interaction.retention_days,
            created_at=db_interaction.created_at,
            updated_at=db_interaction.updated_at,
        )

    @staticmethod
    async def get_user_interactions(
        db: AsyncSession,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        session_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        search_query: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        include_private: bool = True,
    ) -> List[MemoryInteractionInDB]:
        """Get memory interactions for a user with filtering options"""
        query = select(MemoryInteraction).where(MemoryInteraction.user_id == user_id)

        # Apply filters
        if session_id:
            query = query.where(MemoryInteraction.session_id == session_id)

        if conversation_id:
            query = query.where(MemoryInteraction.conversation_id == conversation_id)

        if not include_private:
            query = query.where(MemoryInteraction.is_private == False)

        if start_date:
            query = query.where(MemoryInteraction.created_at >= start_date)

        if end_date:
            query = query.where(MemoryInteraction.created_at <= end_date)

        if search_query:
            search_term = f"%{search_query}%"
            query = query.where(
                or_(
                    MemoryInteraction.query.ilike(search_term),
                    MemoryInteraction.response.ilike(search_term),
                )
            )

        # Apply pagination and ordering
        query = (
            query.order_by(desc(MemoryInteraction.created_at)).offset(skip).limit(limit)
        )

        result = await db.execute(query)
        db_interactions = result.scalars().all()

        return [
            MemoryInteractionInDB(
                id=interaction.id,
                user_id=interaction.user_id,
                query=interaction.query,
                response=interaction.response,
                conversation_id=interaction.conversation_id,
                source=interaction.source,
                metadata=(
                    json.loads(interaction.metadata_) if interaction.metadata_ else {}
                ),
                is_private=interaction.is_private,
                retention_days=interaction.retention_days,
                created_at=interaction.created_at,
                updated_at=interaction.updated_at,
            )
            for interaction in db_interactions
        ]

    @staticmethod
    async def update_interaction(
        db: AsyncSession, interaction_id: str, update_data: MemoryInteractionUpdate
    ) -> Optional[MemoryInteractionInDB]:
        """Update a memory interaction"""
        result = await db.execute(
            select(MemoryInteraction).where(MemoryInteraction.id == interaction_id)
        )
        db_interaction = result.scalars().first()

        if not db_interaction:
            return None

        # Update fields if provided
        if update_data.is_private is not None:
            db_interaction.is_private = update_data.is_private

        if update_data.retention_days is not None:
            db_interaction.retention_days = update_data.retention_days

        if update_data.metadata is not None:
            db_interaction.metadata_ = json.dumps(update_data.metadata)

        await db.commit()
        await db.refresh(db_interaction)

        # Convert JSON string back to dict for response
        metadata = (
            json.loads(db_interaction.metadata_) if db_interaction.metadata_ else {}
        )

        return MemoryInteractionInDB(
            id=db_interaction.id,
            user_id=db_interaction.user_id,
            query=db_interaction.query,
            response=db_interaction.response,
            conversation_id=db_interaction.conversation_id,
            source=db_interaction.source,
            metadata=metadata,
            is_private=db_interaction.is_private,
            retention_days=db_interaction.retention_days,
            created_at=db_interaction.created_at,
            updated_at=db_interaction.updated_at,
        )

    @staticmethod
    async def delete_interaction(db: AsyncSession, interaction_id: str) -> bool:
        """Delete a memory interaction"""
        result = await db.execute(
            select(MemoryInteraction).where(MemoryInteraction.id == interaction_id)
        )
        db_interaction = result.scalars().first()

        if not db_interaction:
            return False

        await db.delete(db_interaction)
        await db.commit()
        return True

    # Memory Context methods
    @staticmethod
    async def create_context(
        db: AsyncSession, user_id: str, context: MemoryContextCreate
    ) -> MemoryContextInDB:
        """Create a new memory context"""
        db_context = MemoryContext(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=context.name,
            description=context.description,
            context_data=json.dumps(context.context_data),
            is_private=context.is_private,
            access_level=context.access_level.value,
        )

        db.add(db_context)
        await db.commit()
        await db.refresh(db_context)

        # Convert JSON string back to dict for response
        context_data = (
            json.loads(db_context.context_data) if db_context.context_data else {}
        )

        return MemoryContextInDB(
            id=db_context.id,
            user_id=db_context.user_id,
            name=db_context.name,
            description=db_context.description,
            context_data=context_data,
            is_private=db_context.is_private,
            access_level=db_context.access_level,
            created_at=db_context.created_at,
            updated_at=db_context.updated_at,
        )

    @staticmethod
    async def get_context(
        db: AsyncSession, context_id: str
    ) -> Optional[MemoryContextInDB]:
        """Get a memory context by ID"""
        result = await db.execute(
            select(MemoryContext).where(MemoryContext.id == context_id)
        )
        db_context = result.scalars().first()

        if not db_context:
            return None

        # Convert JSON string back to dict for response
        context_data = (
            json.loads(db_context.context_data) if db_context.context_data else {}
        )

        return MemoryContextInDB(
            id=db_context.id,
            user_id=db_context.user_id,
            name=db_context.name,
            description=db_context.description,
            context_data=context_data,
            is_private=db_context.is_private,
            access_level=db_context.access_level,
            created_at=db_context.created_at,
            updated_at=db_context.updated_at,
        )

    @staticmethod
    async def get_user_contexts(
        db: AsyncSession,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        search_query: Optional[str] = None,
        include_private: bool = True,
    ) -> List[MemoryContextInDB]:
        """Get memory contexts for a user with filtering options"""
        query = select(MemoryContext).where(MemoryContext.user_id == user_id)

        # Apply filters
        if not include_private:
            query = query.where(MemoryContext.is_private == False)

        if search_query:
            search_term = f"%{search_query}%"
            query = query.where(
                or_(
                    MemoryContext.name.ilike(search_term),
                    MemoryContext.description.ilike(search_term),
                )
            )

        # Apply pagination and ordering
        query = query.order_by(desc(MemoryContext.updated_at)).offset(skip).limit(limit)

        result = await db.execute(query)
        db_contexts = result.scalars().all()

        return [
            MemoryContextInDB(
                id=context.id,
                user_id=context.user_id,
                name=context.name,
                description=context.description,
                context_data=(
                    json.loads(context.context_data) if context.context_data else {}
                ),
                is_private=context.is_private,
                access_level=context.access_level,
                created_at=context.created_at,
                updated_at=context.updated_at,
            )
            for context in db_contexts
        ]

    @staticmethod
    async def update_context(
        db: AsyncSession, context_id: str, update_data: MemoryContextUpdate
    ) -> Optional[MemoryContextInDB]:
        """Update a memory context"""
        result = await db.execute(
            select(MemoryContext).where(MemoryContext.id == context_id)
        )
        db_context = result.scalars().first()

        if not db_context:
            return None

        # Update fields if provided
        if update_data.name is not None:
            db_context.name = update_data.name

        if update_data.description is not None:
            db_context.description = update_data.description

        if update_data.context_data is not None:
            db_context.context_data = json.dumps(update_data.context_data)

        if update_data.is_private is not None:
            db_context.is_private = update_data.is_private

        if update_data.access_level is not None:
            db_context.access_level = update_data.access_level.value

        await db.commit()
        await db.refresh(db_context)

        # Convert JSON string back to dict for response
        context_data = (
            json.loads(db_context.context_data) if db_context.context_data else {}
        )

        return MemoryContextInDB(
            id=db_context.id,
            user_id=db_context.user_id,
            name=db_context.name,
            description=db_context.description,
            context_data=context_data,
            is_private=db_context.is_private,
            access_level=db_context.access_level,
            created_at=db_context.created_at,
            updated_at=db_context.updated_at,
        )

    @staticmethod
    async def delete_context(db: AsyncSession, context_id: str) -> bool:
        """Delete a memory context"""
        result = await db.execute(
            select(MemoryContext).where(MemoryContext.id == context_id)
        )
        db_context = result.scalars().first()

        if not db_context:
            return False

        await db.delete(db_context)
        await db.commit()
        return True

    # Memory Session methods
    @staticmethod
    async def create_session(
        db: AsyncSession, user_id: str, session: MemorySessionCreate
    ) -> MemorySessionInDB:
        """Create a new memory session"""
        db_session = MemorySession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=session.name,
            description=session.description,
            tags=json.dumps(session.tags),
            is_active=session.is_active,
            metadata_=json.dumps(session.metadata),
            ended_at=session.ended_at,
        )

        db.add(db_session)
        await db.commit()
        await db.refresh(db_session)

        # Convert JSON strings back to Python objects for response
        tags = json.loads(db_session.tags) if db_session.tags else []
        metadata = json.loads(db_session.metadata_) if db_session.metadata_ else {}

        return MemorySessionInDB(
            id=db_session.id,
            user_id=db_session.user_id,
            name=db_session.name,
            description=db_session.description,
            tags=tags,
            is_active=db_session.is_active,
            metadata=metadata,
            started_at=db_session.started_at,
            ended_at=db_session.ended_at,
            last_activity=db_session.last_activity,
            created_at=db_session.created_at,
            updated_at=db_session.updated_at,
        )

    @staticmethod
    async def get_session(
        db: AsyncSession, session_id: str
    ) -> Optional[MemorySessionInDB]:
        """Get a memory session by ID"""
        result = await db.execute(
            select(MemorySession).where(MemorySession.id == session_id)
        )
        db_session = result.scalars().first()

        if not db_session:
            return None

        # Convert JSON strings back to Python objects for response
        tags = json.loads(db_session.tags) if db_session.tags else []
        metadata = json.loads(db_session.metadata_) if db_session.metadata_ else {}

        return MemorySessionInDB(
            id=db_session.id,
            user_id=db_session.user_id,
            name=db_session.name,
            description=db_session.description,
            tags=tags,
            is_active=db_session.is_active,
            metadata=metadata,
            started_at=db_session.started_at,
            ended_at=db_session.ended_at,
            last_activity=db_session.last_activity,
            created_at=db_session.created_at,
            updated_at=db_session.updated_at,
        )

    @staticmethod
    async def get_user_sessions(
        db: AsyncSession,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = False,
        search_query: Optional[str] = None,
        tag_filter: Optional[List[str]] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[MemorySessionInDB]:
        """Get memory sessions for a user with filtering options"""
        query = select(MemorySession).where(MemorySession.user_id == user_id)

        # Apply filters
        if active_only:
            query = query.where(MemorySession.is_active == True)

        if start_date:
            query = query.where(MemorySession.started_at >= start_date)

        if end_date:
            query = query.where(MemorySession.started_at <= end_date)

        if search_query:
            search_term = f"%{search_query}%"
            query = query.where(
                or_(
                    MemorySession.name.ilike(search_term),
                    MemorySession.description.ilike(search_term),
                )
            )

        # Apply pagination and ordering
        query = (
            query.order_by(desc(MemorySession.last_activity)).offset(skip).limit(limit)
        )

        result = await db.execute(query)
        db_sessions = result.scalars().all()

        sessions = []
        for session in db_sessions:
            # Convert JSON strings back to Python objects for response
            tags = json.loads(session.tags) if session.tags else []
            metadata = json.loads(session.metadata_) if session.metadata_ else {}

            # Apply tag filter if provided
            if tag_filter and not any(tag in tags for tag in tag_filter):
                continue

            sessions.append(
                MemorySessionInDB(
                    id=session.id,
                    user_id=session.user_id,
                    name=session.name,
                    description=session.description,
                    tags=tags,
                    is_active=session.is_active,
                    metadata=metadata,
                    started_at=session.started_at,
                    ended_at=session.ended_at,
                    last_activity=session.last_activity,
                    created_at=session.created_at,
                    updated_at=session.updated_at,
                )
            )

        return sessions

    @staticmethod
    async def update_session(
        db: AsyncSession, session_id: str, update_data: MemorySessionUpdate
    ) -> Optional[MemorySessionInDB]:
        """Update a memory session"""
        result = await db.execute(
            select(MemorySession).where(MemorySession.id == session_id)
        )
        db_session = result.scalars().first()

        if not db_session:
            return None

        # Update fields if provided
        if update_data.name is not None:
            db_session.name = update_data.name

        if update_data.description is not None:
            db_session.description = update_data.description

        if update_data.tags is not None:
            db_session.tags = json.dumps(update_data.tags)

        if update_data.is_active is not None:
            db_session.is_active = update_data.is_active

        if update_data.metadata is not None:
            db_session.metadata_ = json.dumps(update_data.metadata)

        if update_data.ended_at is not None:
            db_session.ended_at = update_data.ended_at

        # Update last_activity timestamp
        db_session.last_activity = datetime.utcnow()

        await db.commit()
        await db.refresh(db_session)

        # Convert JSON strings back to Python objects for response
        tags = json.loads(db_session.tags) if db_session.tags else []
        metadata = json.loads(db_session.metadata_) if db_session.metadata_ else {}

        return MemorySessionInDB(
            id=db_session.id,
            user_id=db_session.user_id,
            name=db_session.name,
            description=db_session.description,
            tags=tags,
            is_active=db_session.is_active,
            metadata=metadata,
            started_at=db_session.started_at,
            ended_at=db_session.ended_at,
            last_activity=db_session.last_activity,
            created_at=db_session.created_at,
            updated_at=db_session.updated_at,
        )

    @staticmethod
    async def end_session(
        db: AsyncSession, session_id: str
    ) -> Optional[MemorySessionInDB]:
        """End a memory session (set is_active to False and ended_at to current time)"""
        result = await db.execute(
            select(MemorySession).where(MemorySession.id == session_id)
        )
        db_session = result.scalars().first()

        if not db_session:
            return None

        db_session.is_active = False
        db_session.ended_at = datetime.utcnow()
        db_session.last_activity = datetime.utcnow()

        await db.commit()
        await db.refresh(db_session)

        # Convert JSON strings back to Python objects for response
        tags = json.loads(db_session.tags) if db_session.tags else []
        metadata = json.loads(db_session.metadata_) if db_session.metadata_ else {}

        return MemorySessionInDB(
            id=db_session.id,
            user_id=db_session.user_id,
            name=db_session.name,
            description=db_session.description,
            tags=tags,
            is_active=db_session.is_active,
            metadata=metadata,
            started_at=db_session.started_at,
            ended_at=db_session.ended_at,
            last_activity=db_session.last_activity,
            created_at=db_session.created_at,
            updated_at=db_session.updated_at,
        )

    @staticmethod
    async def delete_session(db: AsyncSession, session_id: str) -> bool:
        """Delete a memory session"""
        result = await db.execute(
            select(MemorySession).where(MemorySession.id == session_id)
        )
        db_session = result.scalars().first()

        if not db_session:
            return False

        await db.delete(db_session)
        await db.commit()
        return True

    @staticmethod
    async def get_memory_stats(db: AsyncSession, user_id: str) -> MemoryStats:
        """Get memory usage statistics for a user"""
        # Count total interactions
        result = await db.execute(
            select(func.count()).where(MemoryInteraction.user_id == user_id)
        )
        total_interactions = result.scalar() or 0

        # Count total sessions
        result = await db.execute(
            select(func.count()).where(MemorySession.user_id == user_id)
        )
        total_sessions = result.scalar() or 0

        # Count total contexts
        result = await db.execute(
            select(func.count()).where(MemoryContext.user_id == user_id)
        )
        total_contexts = result.scalar() or 0

        # Get interactions by day for the last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        result = await db.execute(
            select(
                func.date(MemoryInteraction.created_at).label("date"),
                func.count().label("count"),
            )
            .where(
                and_(
                    MemoryInteraction.user_id == user_id,
                    MemoryInteraction.created_at >= thirty_days_ago,
                )
            )
            .group_by(func.date(MemoryInteraction.created_at))
        )
        interactions_by_day = {str(row[0]): row[1] for row in result.all()}

        # Get interactions by type/source
        result = await db.execute(
            select(MemoryInteraction.source, func.count().label("count"))
            .where(MemoryInteraction.user_id == user_id)
            .group_by(MemoryInteraction.source)
        )
        interactions_by_type = {row[0]: row[1] for row in result.all()}

        # Calculate approximate storage usage
        # This is a rough estimate based on string lengths
        result = await db.execute(
            select(
                func.sum(
                    func.length(MemoryInteraction.query)
                    + func.length(MemoryInteraction.response or "")
                ).label("interaction_size"),
                func.sum(func.length(MemoryContext.context_data)).label("context_size"),
            ).where(
                or_(
                    MemoryInteraction.user_id == user_id,
                    MemoryContext.user_id == user_id,
                )
            )
        )
        row = result.first()
        interaction_size = row[0] or 0
        context_size = row[1] or 0

        storage_usage = {
            "interactions_kb": round(interaction_size / 1024, 2),
            "contexts_kb": round(context_size / 1024, 2),
            "total_kb": round((interaction_size + context_size) / 1024, 2),
        }

        return MemoryStats(
            total_interactions=total_interactions,
            total_sessions=total_sessions,
            total_contexts=total_contexts,
            interactions_by_day=interactions_by_day,
            interactions_by_type=interactions_by_type,
            storage_usage=storage_usage,
            last_updated=datetime.utcnow(),
        )
