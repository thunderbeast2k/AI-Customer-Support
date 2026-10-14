from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from app.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    sender = Column(String)  # 'user' or 'bot'
    message = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (Index("ix_chat_messages_session_id", "session_id"),)


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    customer_query = Column(Text)
    summary = Column(String)
    category = Column(String)  # Billing, Technical, Refund, General
    sentiment = Column(String)  # Frustrated, Neutral, Urgent
    priority = Column(String)  # High, Medium, Low
    status = Column(String, default="Open")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (Index("ix_support_tickets_session_id", "session_id"),)