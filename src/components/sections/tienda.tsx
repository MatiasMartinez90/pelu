import Image from "next/image";
import { mediaAsset } from "@/lib/media-assets";
import { money, site } from "@/lib/site";

const SERIF = "var(--font-serif)";

const SHOP_URL = site.onlineStoreUrl;

type Product = {
  slug: string;
  name: string;
  finish: string;
  price: number;
  photo: string;
  cell: React.CSSProperties; // ubicación en la grilla irregular
};

const products: Product[] = [
  {
    slug: "texture-mash-matte",
    name: "Texture Mash · Matte",
    finish: "Pomada · Efecto mate",
    price: 25000,
    photo: mediaAsset("products.textureMashMatte"),
    cell: { gridColumn: "1 / 8", gridRow: "1 / 7", height: "100%" },
  },
  {
    slug: "texture-dust-original",
    name: "Texture Dust · Original",
    finish: "Polvo texturizador",
    price: 25000,
    photo: mediaAsset("products.textureDustOriginal"),
    cell: { gridColumn: "8 / 13", gridRow: "1 / 5", height: "100%" },
  },
  {
    slug: "texture-mash-brillante",
    name: "Texture Mash · Brillante",
    finish: "Pomada · Acabado brillo",
    price: 25000,
    photo: mediaAsset("products.textureMashBrillante"),
    cell: { gridColumn: "8 / 13", gridRow: "5 / 11", height: "100%" },
  },
  {
    slug: "beard-oil-cedro",
    name: "Beard Oil · Cedro",
    finish: "Aceite de barba",
    price: 19000,
    photo: mediaAsset("products.beardOilCedro"),
    cell: { gridColumn: "1 / 4", gridRow: "7 / 11", height: "100%" },
  },
  {
    slug: "sea-salt-spray",
    name: "Sea Salt Spray",
    finish: "Spray texturizante",
    price: 21000,
    photo: mediaAsset("products.seaSaltSpray"),
    cell: { gridColumn: "4 / 8", gridRow: "7 / 11", height: "100%" },
  },
];

export function Tienda() {
  return (
    <section
      id="tienda"
      className="nox-shop"
      style={{ background: "#0a0a0a", color: "#fff", fontFamily: "var(--font-sans)" }}
    >
      <div className="nox-shop-head">
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.4em", textTransform: "uppercase", opacity: 0.6 }}>Shop · Beauty</div>
          <h2 style={{ marginTop: 14, fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(48px,7vw,92px)", lineHeight: 0.9 }}>La Tienda</h2>
        </div>
        <a href={SHOP_URL} target="_blank" rel="noreferrer" className="nox-link" style={{ color: "#fff", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.85, marginBottom: 10 }}>Ver todo →</a>
      </div>

      <div className="nox-shop-grid">
        {products.map((p) => (
          <a key={p.slug} href={`${SHOP_URL}/${p.slug}`} target="_blank" rel="noreferrer" className="nox-prod" style={p.cell}>
            <div className="nox-prod__media">
              <Image
                src={p.photo}
                alt={p.name}
                fill
                sizes="(max-width: 900px) 100vw, 40vw"
                loading="lazy"
                style={{ objectFit: "cover" }}
              />
              <div className="nox-prod__grad" />
              <div className="nox-prod__shade" />
              <div className="nox-prod__cta">Comprar →</div>
              <div className="nox-prod__info">
                <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>{p.finish}</div>
                <div style={{ fontFamily: SERIF, fontSize: "clamp(20px,1.9vw,32px)", fontWeight: 600, marginTop: 5, lineHeight: 1.04 }}>{p.name}</div>
                <div style={{ marginTop: 7, fontSize: 14, opacity: 0.92, letterSpacing: "0.02em" }}>{money(p.price)}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
