import Image from "next/image";
import { mediaAssetPath } from "@/lib/media-assets";
import { money } from "@/lib/site";
import { getShopProducts, shopUrl } from "@/lib/shop";

const SERIF = "var(--font-serif)";
const cells: React.CSSProperties[] = [
  { gridColumn: "1 / 8", gridRow: "1 / 7", height: "100%" },
  { gridColumn: "8 / 13", gridRow: "1 / 5", height: "100%" },
  { gridColumn: "8 / 13", gridRow: "5 / 11", height: "100%" },
  { gridColumn: "1 / 4", gridRow: "7 / 11", height: "100%" },
  { gridColumn: "4 / 8", gridRow: "7 / 11", height: "100%" },
];

export async function Tienda() {
  let products;
  try {
    products = (await getShopProducts({ limit: 5 })).items;
  } catch {
    // El catálogo no debe derribar el Home si el backend está en mantenimiento.
    return null;
  }
  if (!products.length) return null;

  return (
    <section id="tienda" className="nox-shop" style={{ background: "#0a0a0a", color: "#fff", fontFamily: "var(--font-sans)" }}>
      <div className="nox-shop-head">
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.6 }}>Shop · Selección profesional</div>
          <h2 style={{ marginTop: 14, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(48px,7vw,92px)", lineHeight: 0.9 }}>La Tienda</h2>
        </div>
        <a href={shopUrl("/")} className="nox-link" style={{ color: "#fff", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.85, marginBottom: 10 }}>Ver todo →</a>
      </div>

      <div className="nox-shop-grid">
        {products.map((product, index) => {
          const image = product.image_url ? mediaAssetPath(product.image_url) : null;
          return (
            <a key={product.slug} href={shopUrl(`/productos/${product.slug}`)} className="nox-prod" style={cells[index] ?? cells[4]}>
              <div className="nox-prod__media">
                {image ? (
                  <Image src={image} alt={product.name} fill sizes="(max-width: 900px) 100vw, 40vw" loading="lazy" style={{ objectFit: "cover" }} />
                ) : (
                  <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "radial-gradient(circle at 65% 25%,#3b3430,#171513 58%,#0d0d0d)", color: "rgba(255,255,255,.15)", fontFamily: SERIF, fontSize: "clamp(70px,12vw,170px)", fontWeight: 800 }}>{product.name.slice(0, 2)}</div>
                )}
                <div className="nox-prod__grad" />
                <div className="nox-prod__shade" />
                <div className="nox-prod__cta">Comprar →</div>
                <div className="nox-prod__info">
                  <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>{product.category_name ?? "Cuidado"}</div>
                  <div style={{ fontFamily: SERIF, fontSize: "clamp(20px,1.9vw,32px)", fontWeight: 600, marginTop: 5, lineHeight: 1.04 }}>{product.name}</div>
                  <div style={{ marginTop: 7, fontSize: 14, opacity: 0.92, letterSpacing: "0.02em" }}>{money(product.price)}</div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
