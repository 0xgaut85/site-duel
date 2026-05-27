import { HorizontalCarousel } from "@/components/carousel/HorizontalCarousel";
import { LandingFrame } from "@/components/landing/LandingFrame";
import { InfoFrame } from "@/components/landing/InfoFrame";
import { EcosystemFrame } from "@/components/landing/EcosystemFrame";
import { AccessFrame } from "@/components/landing/AccessFrame";
import { Footer } from "@/components/layout/Footer";

export default function Page() {
  const entries = [
    {
      id: "01-landing",
      title: "Landing",
      element: <LandingFrame />,
    },
    {
      id: "02-info",
      title: "Info",
      element: <InfoFrame />,
    },
    {
      id: "03-ecosystem",
      title: "Ecosystem",
      element: <EcosystemFrame />,
    },
    {
      id: "04-access",
      title: "Use Duel Agents",
      element: <AccessFrame />,
    },
  ];

  return (
    <>
      <HorizontalCarousel frames={entries} />
      <Footer />
    </>
  );
}
