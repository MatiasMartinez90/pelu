import { ProductCard } from "@/components/shop/product-card";
import { StructuredData } from "@/components/structured-data";
import { getShopCategories, getShopProducts, shopUrl } from "@/lib/shop";
import { site } from "@/lib/site";

export const revalidate = 60;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 80);
  const category = params.category?.trim();
  const [categories, products] = await Promise.all([
    getShopCategories(),
    getShopProducts({ q: q && q.length >= 2 ? q : undefined, category, limit: 48 }),
  ]);
  const listingSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${site.name} Shop`,
    numberOfItems: products.total,
    itemListElement: products.items.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: shopUrl(`/productos/${product.slug}`),
      name: product.name,
    })),
  };

  return (
    <main className="shop-main">
      <StructuredData data={listingSchema} schema="shop-item-list" />
      <section className="shop-hero">
        <p className="shop-kicker">Curado por profesionales</p>
        <h1>Cuidá tu estilo<br /><em>todos los días.</em></h1>
        <p>Una selección simple de productos que usamos y recomendamos. Comprá online y retirá en {site.neighborhood}.</p>
      </section>

      <section className="shop-catalog" aria-labelledby="catalog-title">
        <div className="shop-catalog-tools">
          <div>
            <p className="shop-eyebrow">Catálogo</p>
            <h2 id="catalog-title">{q ? `Resultados para “${q}”` : category ? categories.find((item) => item.slug === category)?.name ?? "Productos" : "Todos los productos"}</h2>
          </div>
          <form action={site.onlineStoreUrl} className="shop-search" role="search">
            <label htmlFor="shop-search">Buscar productos</label>
            <div><input id="shop-search" name="q" type="search" defaultValue={q} placeholder="Shampoo, pomada…" minLength={2} maxLength={80} /><button type="submit">Buscar</button></div>
          </form>
        </div>

        <nav className="shop-categories" aria-label="Categorías de producto">
          <a href={shopUrl("/")} aria-current={!category ? "page" : undefined}>Todo <span>{categories.reduce((total, item) => total + item.product_count, 0)}</span></a>
          {categories.map((item) => (
            <a key={item.slug} href={shopUrl(`/?category=${item.slug}`)} aria-current={category === item.slug ? "page" : undefined}>
              {item.name} <span>{item.product_count}</span>
            </a>
          ))}
        </nav>

        {products.items.length ? (
          <div className="shop-grid">{products.items.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
        ) : (
          <div className="shop-empty"><p>No encontramos productos con esos filtros.</p><a href={shopUrl("/")}>Ver todo el catálogo</a></div>
        )}
      </section>
    </main>
  );
}
