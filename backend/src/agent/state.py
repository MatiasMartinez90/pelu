"""Estado del agente: historial de mensajes + identidad del cliente."""

from langgraph.prebuilt.chat_agent_executor import AgentState as BaseAgentState


class AgentState(BaseAgentState):
    phone: str
    conversation_id: int
    customer_name: str | None
