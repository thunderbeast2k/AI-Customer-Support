from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import GEMINI_API_KEY
from app.schemas import TicketExtraction


llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.0,
    google_api_key=GEMINI_API_KEY
)

structured_llm = llm.with_structured_output(TicketExtraction)

TRIAGE_PROMPT = """You are a support ticket triage agent. Analyze the customer's unresolved query and extract structured information.

Return a TicketExtraction object with:
- summary: Brief summary of the customer issue (1-2 sentences)
- category: One of [Billing, Technical, Refund, General]
- sentiment: One of [Frustrated, Neutral, Urgent]
- priority: One of [High, Medium, Low]

Guidelines:
- Billing: payment issues, invoices, charges, subscriptions
- Technical: product bugs, errors, integration problems, setup issues
- Refund: return requests, money back, cancellation refunds
- General: account questions, feature requests, how-to, other

- Frustrated: customer expresses anger, dissatisfaction, repeated issues
- Neutral: standard inquiry, polite, informational
- Urgent: time-sensitive, business-critical, escalation language

- High: urgent sentiment, billing/refund with money at stake, technical blocking work
- Medium: standard issues needing attention
- Low: general questions, feature requests, non-blocking

Customer Query:
{query}"""


def analyze_and_triage(user_query: str) -> TicketExtraction:
    prompt = TRIAGE_PROMPT.format(query=user_query)
    return structured_llm.invoke(prompt)