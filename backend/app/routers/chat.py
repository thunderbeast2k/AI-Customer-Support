from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import ChatRequest, ChatResponse, TicketResponse
from app.models import ChatMessage, SupportTicket
from app.services.rag_engine import query_rag
from app.services.triage_agent import analyze_and_triage
from datetime import datetime, timezone


router = APIRouter(prefix="/api/chat", tags=["Customer Chat"])


@router.post("", response_model=ChatResponse)
def handle_chat(req: ChatRequest, db: Session = Depends(get_db)):
    user_msg = ChatMessage(
        session_id=req.session_id,
        sender="user",
        message=req.message,
        created_at=datetime.now(timezone.utc)
    )
    db.add(user_msg)
    db.commit()

    rag_result = query_rag(req.message)

    if rag_result["needs_escalation"]:
        ticket_extraction = analyze_and_triage(req.message)

        ticket = SupportTicket(
            session_id=req.session_id,
            customer_query=req.message,
            summary=ticket_extraction.summary,
            category=ticket_extraction.category,
            sentiment=ticket_extraction.sentiment,
            priority=ticket_extraction.priority,
            status="Open",
            created_at=datetime.now(timezone.utc)
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)

        escalation_reply = (
            f"I understand this is important. Let me connect you with a human agent who can better assist you.\n\n"
            f"Your ticket has been created:\n"
            f"• Ticket ID: {ticket.id}\n"
            f"• Priority: {ticket.priority}\n"
            f"• Category: {ticket.category}"
        )

        bot_msg = ChatMessage(
            session_id=req.session_id,
            sender="bot",
            message=escalation_reply,
            created_at=datetime.now(timezone.utc)
        )
        db.add(bot_msg)
        db.commit()

        return ChatResponse(
            reply=escalation_reply,
            escalated=True,
            sources=rag_result["sources"],
            ticket=TicketResponse.model_validate(ticket)
        )

    else:
        bot_msg = ChatMessage(
            session_id=req.session_id,
            sender="bot",
            message=rag_result["answer"],
            created_at=datetime.now(timezone.utc)
        )
        db.add(bot_msg)
        db.commit()

        return ChatResponse(
            reply=rag_result["answer"],
            escalated=False,
            sources=rag_result["sources"],
            ticket=None
        )