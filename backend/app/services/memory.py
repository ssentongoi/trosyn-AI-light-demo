from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from uuid import uuid4

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.memory import MemoryContext, MemoryInteraction, MemorySession
from app.models.user import User
from app.schemas.memory import (
    MemoryAccessLevel,
    MemoryContextCreate,
    MemoryContextUpdate,
    MemoryInteractionCreate,
    MemoryInteractionUpdate,
    MemorySessionCreate,
    MemorySessionUpdate,
    MemoryStats,
)


class MemoryService:
    """Service class for memory-related operations"""

    @staticmethod
    def create_interaction(
        db: Session, user: User, interaction_data: MemoryInteractionCreate
    ) -> MemoryInteraction:
        """Create a new memory interaction"""
        db_interaction = MemoryInteraction(
            id=str(uuid4()),
            user_id=user.id,
            **interaction_data.dict(exclude_unset=True),
        )
        db.add(db_interaction)
        db.commit()
        db.refresh(db_interaction)
        return db_interaction

    @staticmethod
    def get_interaction(
        db: Session, user: User, interaction_id: str
    ) -> Optional[MemoryInteraction]:
        """Get a memory interaction by ID"""
        return (
            db.query(MemoryInteraction)
            .filter(
                MemoryInteraction.id == interaction_id,
                MemoryInteraction.user_id == user.id,
            )
            .first()
        )

    @staticmethod
    def get_user_interactions(
        db: Session,
        user: User,
        skip: int = 0,
        limit: int = 100,
        conversation_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        is_private: Optional[bool] = None,
    ) -> List[MemoryInteraction]:
        """Get paginated list of memory interactions for a user"""
        query = db.query(MemoryInteraction).filter(MemoryInteraction.user_id == user.id)

        if conversation_id:
            query = query.filter(MemoryInteraction.conversation_id == conversation_id)

        if start_date:
            query = query.filter(MemoryInteraction.created_at >= start_date)

        if end_date:
            query = query.filter(MemoryInteraction.created_at <= end_date)

        if is_private is not None:
            query = query.filter(MemoryInteraction.is_private == is_private)

        return query.offset(skip).limit(limit).all()

    @staticmethod
    def update_interaction(
        db: Session,
        user: User,
        interaction_id: str,
        update_data: MemoryInteractionUpdate,
    ) -> Optional[MemoryInteraction]:
        """Update a memory interaction"""
        db_interaction = MemoryService.get_interaction(db, user, interaction_id)
        if not db_interaction:
            return None

        update_data = update_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_interaction, field, value)

        db.add(db_interaction)
        db.commit()
        db.refresh(db_interaction)
        return db_interaction

    @staticmethod
    def delete_interaction(db: Session, user: User, interaction_id: str) -> bool:
        """Delete a memory interaction"""
        db_interaction = MemoryService.get_interaction(db, user, interaction_id)
        if not db_interaction:
            return False

        db.delete(db_interaction)
        db.commit()
        return True

    @staticmethod
    def create_context(
        db: Session, user: User, context_data: MemoryContextCreate
    ) -> MemoryContext:
        """Create a new memory context"""
        db_context = MemoryContext(
            id=str(uuid4()), user_id=user.id, **context_data.dict(exclude_unset=True)
        )
        db.add(db_context)
        db.commit()
        db.refresh(db_context)
        return db_context

    @staticmethod
    def get_context(
        db: Session, user: User, context_id: str
    ) -> Optional[MemoryContext]:
        """Get a memory context by ID"""
        return (
            db.query(MemoryContext)
            .filter(
                MemoryContext.id == context_id,
                or_(
                    MemoryContext.user_id == user.id,
                    MemoryContext.access_level == MemoryAccessLevel.PUBLIC,
                    and_(
                        MemoryContext.access_level == MemoryAccessLevel.SHARED,
                        # Add shared access logic here (e.g., check user groups)
                        # For now, just check if user is in the same organization
                        MemoryContext.user_id.in_(
                            db.query(User.id).filter(
                                User.organization_id == user.organization_id
                            )
                        ),
                    ),
                ),
            )
            .first()
        )

    @staticmethod
    def get_user_contexts(
        db: Session,
        user: User,
        skip: int = 0,
        limit: int = 100,
        is_private: Optional[bool] = None,
        access_level: Optional[MemoryAccessLevel] = None,
    ) -> List[MemoryContext]:
        """Get paginated list of memory contexts for a user"""
        query = db.query(MemoryContext).filter(
            or_(
                MemoryContext.user_id == user.id,
                MemoryContext.access_level == MemoryAccessLevel.PUBLIC,
                and_(
                    MemoryContext.access_level == MemoryAccessLevel.SHARED,
                    # Add shared access logic here
                    MemoryContext.user_id.in_(
                        db.query(User.id).filter(
                            User.organization_id == user.organization_id
                        )
                    ),
                ),
            )
        )

        if is_private is not None:
            query = query.filter(MemoryContext.is_private == is_private)

        if access_level:
            query = query.filter(MemoryContext.access_level == access_level)

        return query.offset(skip).limit(limit).all()

    @staticmethod
    def update_context(
        db: Session, user: User, context_id: str, update_data: MemoryContextUpdate
    ) -> Optional[MemoryContext]:
        """Update a memory context"""
        db_context = MemoryService.get_context(db, user, context_id)
        if not db_context or db_context.user_id != user.id:
            return None

        update_data = update_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_context, field, value)

        db.add(db_context)
        db.commit()
        db.refresh(db_context)
        return db_context

    @staticmethod
    def delete_context(db: Session, user: User, context_id: str) -> bool:
        """Delete a memory context"""
        db_context = MemoryService.get_context(db, user, context_id)
        if not db_context or db_context.user_id != user.id:
            return False

        db.delete(db_context)
        db.commit()
        return True

    @staticmethod
    def create_session(
        db: Session, user: User, session_data: MemorySessionCreate
    ) -> MemorySession:
        """Create a new memory session"""
        db_session = MemorySession(
            id=str(uuid4()), user_id=user.id, **session_data.dict(exclude_unset=True)
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session

    @staticmethod
    def get_session(
        db: Session, user: User, session_id: str
    ) -> Optional[MemorySession]:
        """Get a memory session by ID"""
        return (
            db.query(MemorySession)
            .filter(MemorySession.id == session_id, MemorySession.user_id == user.id)
            .first()
        )

    @staticmethod
    def get_user_sessions(
        db: Session,
        user: User,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[MemorySession]:
        """Get paginated list of memory sessions for a user"""
        query = db.query(MemorySession).filter(MemorySession.user_id == user.id)

        if is_active is not None:
            query = query.filter(MemorySession.is_active == is_active)

        if start_date:
            query = query.filter(MemorySession.started_at >= start_date)

        if end_date:
            query = query.filter(MemorySession.started_at <= end_date)

        return (
            query.order_by(MemorySession.last_activity.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_session(
        db: Session, user: User, session_id: str, update_data: MemorySessionUpdate
    ) -> Optional[MemorySession]:
        """Update a memory session"""
        db_session = MemoryService.get_session(db, user, session_id)
        if not db_session:
            return None

        update_data = update_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_session, field, value)

        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session

    @staticmethod
    def end_session(
        db: Session, user: User, session_id: str
    ) -> Optional[MemorySession]:
        """End a memory session"""
        db_session = MemoryService.get_session(db, user, session_id)
        if not db_session or not db_session.is_active:
            return None

        db_session.is_active = False
        db_session.ended_at = datetime.utcnow()

        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session

    @staticmethod
    def get_memory_stats(db: Session, user: User, days: int = 30) -> MemoryStats:
        """Get memory usage statistics"""
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # Get total counts
        total_interactions = (
            db.query(func.count(MemoryInteraction.id))
            .filter(MemoryInteraction.user_id == user.id)
            .scalar()
            or 0
        )

        total_sessions = (
            db.query(func.count(MemorySession.id))
            .filter(MemorySession.user_id == user.id)
            .scalar()
            or 0
        )

        total_contexts = (
            db.query(func.count(MemoryContext.id))
            .filter(MemoryContext.user_id == user.id)
            .scalar()
            or 0
        )

        # Get interactions by day
        interactions_by_day = {}
        day_interactions = (
            db.query(
                func.date_trunc("day", MemoryInteraction.created_at).label("day"),
                func.count(MemoryInteraction.id).label("count"),
            )
            .filter(
                MemoryInteraction.user_id == user.id,
                MemoryInteraction.created_at >= start_date,
                MemoryInteraction.created_at <= end_date,
            )
            .group_by("day")
            .all()
        )

        for day, count in day_interactions:
            interactions_by_day[day.strftime("%Y-%m-%d")] = count

        # Get interactions by type
        interactions_by_type = {}
        type_interactions = (
            db.query(
                MemoryInteraction.source,
                func.count(MemoryInteraction.id).label("count"),
            )
            .filter(MemoryInteraction.user_id == user.id)
            .group_by(MemoryInteraction.source)
            .all()
        )

        for source, count in type_interactions:
            interactions_by_type[source] = count

        # Calculate storage usage (simplified)
        storage_usage = {
            "interactions": total_interactions
            * 500,  # Approx 500 bytes per interaction
            "contexts": total_contexts * 2000,  # Approx 2KB per context
            "sessions": total_sessions * 1000,  # Approx 1KB per session
            "last_updated": datetime.utcnow(),
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

    @staticmethod
    def search_memories(
        db: Session,
        user: User,
        query: str,
        skip: int = 0,
        limit: int = 50,
        include_private: bool = True,
        include_contexts: bool = True,
        include_interactions: bool = True,
    ) -> Dict[str, List[Union[MemoryInteraction, MemoryContext]]]:
        """Search through memories using full-text search"""
        results = {"interactions": [], "contexts": []}

        # Simple LIKE-based search (would be replaced with full-text search in production)
        if include_interactions:
            query_filter = and_(
                MemoryInteraction.user_id == user.id,
                or_(
                    MemoryInteraction.query.ilike(f"%{query}%"),
                    MemoryInteraction.response.ilike(f"%{query}%"),
                ),
            )

            if not include_private:
                query_filter = and_(query_filter, MemoryInteraction.is_private == False)

            results["interactions"] = (
                db.query(MemoryInteraction)
                .filter(query_filter)
                .order_by(MemoryInteraction.updated_at.desc())
                .offset(skip)
                .limit(limit)
                .all()
            )

        if include_contexts:
            query_filter = and_(
                or_(
                    MemoryContext.user_id == user.id,
                    MemoryContext.access_level == MemoryAccessLevel.PUBLIC,
                    and_(
                        MemoryContext.access_level == MemoryAccessLevel.SHARED,
                        MemoryContext.user_id.in_(
                            db.query(User.id).filter(
                                User.organization_id == user.organization_id
                            )
                        ),
                    ),
                ),
                or_(
                    MemoryContext.name.ilike(f"%{query}%"),
                    MemoryContext.description.ilike(f"%{query}%"),
                ),
            )

            if not include_private:
                query_filter = and_(query_filter, MemoryContext.is_private == False)

            results["contexts"] = (
                db.query(MemoryContext)
                .filter(query_filter)
                .order_by(MemoryContext.updated_at.desc())
                .offset(skip)
                .limit(limit)
                .all()
            )

        return results
