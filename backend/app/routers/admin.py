import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SupportTicket
from app.schemas import TicketResponse
from app.config import UPLOAD_DIR
from app.services.rag_engine import ingest_file


router = APIRouter(prefix="/api/admin", tags=["Admin & Triage Dashboard"])


@router.post("/upload-kb")
def upload_kb(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".pdf", ".txt")):
        raise HTTPException(status_code=400, detail="Only .pdf and .txt files are supported")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    chunks_indexed = ingest_file(file_path)

    return {
        "filename": file.filename,
        "chunks_indexed": chunks_indexed
    }


@router.get("/tickets", response_model=list[TicketResponse])
def list_tickets(db: Session = Depends(get_db)):
    tickets = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).all()
    return tickets


@router.patch("/tickets/{ticket_id}/resolve", response_model=TicketResponse)
def resolve_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = "Resolved"
    db.commit()
    db.refresh(ticket)
    return ticket