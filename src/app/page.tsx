import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Services } from "@/components/sections/services";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Team } from "@/components/sections/team";
import { Tienda } from "@/components/sections/tienda";
import { Faq } from "@/components/sections/faq";
import { InstagramStrip } from "@/components/sections/instagram";
import { Visit } from "@/components/sections/visit";
import { Cta } from "@/components/sections/cta";
import { Footer } from "@/components/sections/footer";
import { InstallPwa } from "@/components/install-pwa";
import { WhatsappFab } from "@/components/whatsapp-fab";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <About />
        <Services />
        <HowItWorks />
        <Team />
        <Tienda />
        <Faq />
        <InstagramStrip />
        <Visit />
        <Cta />
      </main>
      <Footer />
      <InstallPwa />
      <WhatsappFab />
    </>
  );
}
