"use client";

import { useEffect, useRef } from "react";

const SERIF = "'Bodoni Moda', Georgia, serif";

const ars = new Intl.NumberFormat("es-AR");
const money = (n: number) => `$${ars.format(n)}`;

const SHOP_URL = "https://tienda.noxbarber.com.ar";

type Product = {
  slug: string;
  name: string;
  finish: string;
  price: number;
  video: string; // Mixkit (gratis) — reemplazá por tu .mp4
  poster: string;
  cell: React.CSSProperties; // ubicación en la grilla irregular
};

const products: Product[] = [
  {
    slug: "texture-mash-matte",
    name: "Texture Mash · Matte",
    finish: "Pomada · Efecto mate",
    price: 25000,
    video: "https://assets.mixkit.co/videos/271/271-360.mp4",
    poster: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=700&q=80&auto=format&fit=crop",
    cell: { gridColumn: "1 / 8", gridRow: "1 / 7", height: "100%" },
  },
  {
    slug: "texture-dust-original",
    name: "Texture Dust · Original",
    finish: "Polvo texturizador",
    price: 25000,
    video: "https://assets.mixkit.co/videos/43231/43231-360.mp4",
    poster: "https://images.unsplash.com/photo-1571875257727-256c39da42af?w=700&q=80&auto=format&fit=crop",
    cell: { gridColumn: "8 / 13", gridRow: "1 / 5", height: "100%" },
  },
  {
    slug: "texture-mash-brillante",
    name: "Texture Mash · Brillante",
    finish: "Pomada · Acabado brillo",
    price: 25000,
    video: "https://assets.mixkit.co/videos/43279/43279-360.mp4",
    poster: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=700&q=80&auto=format&fit=crop",
    cell: { gridColumn: "8 / 13", gridRow: "5 / 11", height: "100%" },
  },
  {
    slug: "beard-oil-cedro",
    name: "Beard Oil · Cedro",
    finish: "Aceite de barba",
    price: 19000,
    video: "https://assets.mixkit.co/videos/43232/43232-360.mp4",
    poster: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=700&q=80&auto=format&fit=crop",
    cell: { gridColumn: "1 / 4", gridRow: "7 / 11", height: "100%" },
  },
  {
    slug: "sea-salt-spray",
    name: "Sea Salt Spray",
    finish: "Spray texturizante",
    price: 21000,
    video: "https://assets.mixkit.co/videos/40127/40127-360.mp4",
    poster: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=700&q=80&auto=format&fit=crop",
    cell: { gridColumn: "4 / 8", gridRow: "7 / 11", height: "100%" },
  },
];

export function Tienda() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const play = () => {
      rootRef.current?.querySelectorAll("video").forEach((v) => {
        v.muted = true;
        v.play().catch(() => {});
      });
    };
    play();
    const t = setTimeout(play, 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      id="tienda"
      ref={rootRef}
      className="nox-shop"
      style={{ background: "#0a0a0a", color: "#fff", fontFamily: "'Archivo', system-ui, sans-serif" }}
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
              <video autoPlay loop muted playsInline poster={p.poster} style={{ width: "100%", height: "100%", objectFit: "cover" }}>
                <source src={p.video} type="video/mp4" />
              </video>
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
