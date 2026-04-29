import { DemoSection } from "@/components/ruta/demo-section";
import { Navbar } from "@/components/ruta/navbar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RUTA – Live Demo",
  description:
    "Try RUTA AI live. Ask in Bisaya or English and get instant jeepney routes, codes, and fare estimates for Cebu City.",
};

export default function DemoPage() {
  return (
    <main className="h-screen w-full bg-[#0d1424] flex flex-col overflow-hidden overscroll-none">
      <Navbar />
      
      {/* 
        This container fills the remaining height. 
        We use overflow-hidden here too to ensure only the chat component handles scrolling.
      */}
      <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col pt-16 px-0 sm:px-4 sm:pb-4 overflow-hidden">
        <DemoSection standalone={true} />
      </div>
    </main>
  );
}
