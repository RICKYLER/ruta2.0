import { DemoSection } from "@/components/ruta/demo-section";
import { Navbar } from "@/components/ruta/navbar";
import { Footer } from "@/components/ruta/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RUTA – Live Demo",
  description:
    "Try RUTA AI live. Ask in Bisaya or English and get instant jeepney routes, codes, and fare estimates for Cebu City.",
};

export default function DemoPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero banner for the demo page */}
      <section className="pt-32 pb-4 px-4 text-center bg-background">
        <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-widest mb-3">
          Interactive Demo
        </p>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 text-balance">
          Sulayan ang RUTA AI
        </h1>
        <p className="text-muted-foreground text-sm sm:text-lg max-w-xl mx-auto leading-relaxed text-balance">
          I-type ang imong destination — bisan Bisaya or English — ug tan-awon
          kung unsaon ka namo tabangan makasakay.
        </p>

        {/* Suggested prompts */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {[
            "Unsay Sakyan IT Park to Colon?",
            "Paano makaadto Ayala from SM?",
            "Route from Carbon to Talamban",
          ].map((prompt) => (
            <span
              key={prompt}
              className="px-3 py-1.5 rounded-full bg-secondary border border-border text-xs text-muted-foreground font-medium"
            >
              {prompt}
            </span>
          ))}
        </div>
      </section>

      {/* The actual chat demo */}
      <DemoSection />



      <Footer />
    </main>
  );
}
