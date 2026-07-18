import { Hero } from "@/components/sections/hero";
import { Tienda } from "@/components/sections/tienda";
import { Footer } from "@/components/sections/footer";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <main style={{ background: "#0a0a0a", overflowX: "hidden" }}>
      <Hero />
      {site.shop.enabled && <Tienda />}
      <Footer />
    </main>
  );
}
