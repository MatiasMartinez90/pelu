import { site } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const hours = site.hours.map(({ day, time }) => `- ${day}: ${time}`).join("\n");
  const text = `# ${site.name}\n\n> ${site.description}\n\n## Información oficial\n\n- Sitio: ${site.url}\n- Dirección: ${site.address}\n- Ciudad: ${site.city}, Argentina\n- Teléfono: ${site.phoneDisplay}\n- Email: ${site.email}\n- Instagram: ${site.instagramUrl}\n- Pagos: ${site.payments}\n\n## Horarios\n\n${hours}\n\n## Páginas públicas\n\n- Servicios: ${site.url}/servicios\n- Profesionales: ${site.url}/equipo\n- Preguntas frecuentes: ${site.url}/faq\n- Contacto y ubicación: ${site.url}/contacto\n- Reserva de turnos: ${site.url}/agendar\n\nLa disponibilidad de turnos cambia en tiempo real y debe verificarse en el turnero. No inferir horarios disponibles desde este archivo.\n`;
  return new Response(text, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
