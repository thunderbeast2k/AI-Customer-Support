from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class ChatRequest(BaseModel):
    session_id: str
    message: str


class TicketExtraction(BaseModel):
    summary: str = Field(description="Brief summary of the customer issue")
    category: str = Field(description="Category: Billing, Technical, Refund, or General")
    sentiment: str = Field(description="Customer sentiment: Frustrated, Neutral, or Urgent")
    priority: str = Field(description="Priority level: High, Medium, or Low")


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: str
    customer_query: str
    summary: str
    category: str
    sentiment: str
    priority: str
    status: str
    created_at: datetime


class ChatResponse(BaseModel):
    reply: str
    escalated: bool
    sources: List[str]
    ticket: Optional[TicketResponse] = None