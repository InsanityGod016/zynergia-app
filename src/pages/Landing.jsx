/**
 * Landing Page — Zynergia
 *
 * Ruta pública canónica: / (no requiere autenticación)
 *
 * Secciones:
 *  1. Hero
 *  2. Cómo funciona (DemoFlow)
 *  3. Automatizaciones
 *  4. Fast Start
 *  5. Precio y preguntas frecuentes
 *  6. CTA final
 */

import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import DemoFlow from '@/components/landing/DemoFlow';
import Automations from '@/components/landing/Automations';
import FastStart from '@/components/landing/FastStart';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function Landing() {
  return (
    <div className="font-sans antialiased">
      <Navbar />
      <main>
        <Hero />
        <DemoFlow />
        <Automations />
        <FastStart />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
