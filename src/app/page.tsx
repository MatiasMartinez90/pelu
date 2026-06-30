import { Hero } from "@/components/sections/hero";
import { Tienda } from "@/components/sections/tienda";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <main style={{ background: "#0a0a0a", overflowX: "hidden" }}>
      <Hero />
      <Tienda />
      <Footer />
    </main>
  );
}
