# Evaluaciones del agente

`agent_golden_cases.jsonl` es el contrato mínimo de calidad para cambios de modelo, prompt,
tools o graph. Los casos no contienen conversaciones reales ni PII.

Antes de promover un cambio se deben ejecutar dos capas:

1. `pytest`: invariantes determinísticas, autorización, idempotencia, mensajería y fallos.
2. Evaluación trazada en staging: reproducir los casos contra el modelo configurado, registrar
   tool calls y respuesta en Langfuse, y puntuar éxito de tarea, grounding, handoff y latencia.

Los gates recomendados son: mutaciones no autorizadas = 0, reservas sin confirmación = 0,
precios/horarios inventados = 0 y éxito global >= 95%. Los casos que dependen de fechas deben
inyectar un reloj fijo y datos de agenda descartables.
