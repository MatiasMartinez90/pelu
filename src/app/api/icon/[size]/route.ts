import { site } from "@/lib/site";

const allowedSizes = new Set([192, 512]);
const xml = (value: string) => value.replace(/[<>&"']/g, (character) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
})[character] ?? character);

export function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  return params.then(({ size: rawSize }) => {
    const size = Number(rawSize);
    if (!allowedSizes.has(size)) return new Response("not found", { status: 404 });
    const label = xml(site.shortName.slice(0, 4));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="${site.theme.background}"/><circle cx="256" cy="256" r="190" fill="none" stroke="${site.theme.primary}" stroke-width="14"/><text x="256" y="300" font-family="Arial,sans-serif" font-size="${label.length > 3 ? 120 : 180}" font-weight="700" fill="${site.theme.foreground}" text-anchor="middle">${label}</text><rect x="176" y="338" width="160" height="12" rx="6" fill="${site.theme.primary}"/></svg>`;
    return new Response(svg, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
        "x-content-type-options": "nosniff",
      },
    });
  });
}
