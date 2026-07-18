"use client";

export default function ShopError({ reset }: { reset: () => void }) {
  return (
    <main className="shop-main"><div className="shop-empty"><h1>No pudimos cargar el shop.</h1><p>El catálogo no está disponible en este momento.</p><button className="shop-button" onClick={reset}>Reintentar</button></div></main>
  );
}
