import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dnaexplorer.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "DNA Explorer — Explore seu código genético no navegador",
    template: "%s | DNA Explorer",
  },
  description:
    "Plataforma open-source e 100% client-side para explorar DNA bruto. Upload do arquivo bruto (Genera, 23andMe, AncestryDNA, MyHeritage), hélice 3D, cariótipo interativo, catálogo de 100+ variantes canônicas e dashboard estatístico — seus dados nunca saem do navegador.",
  keywords: [
    "DNA", "genoma", "SNP", "bioinformática", "genética", "Genera", "23andMe",
    "AncestryDNA", "MyHeritage", "hélice dupla", "dupla hélice", "cariótipo",
    "farmacogenômica", "nutrigenômica", "visualização 3D", "client-side",
    "open-source", "privacidade", "LGPD", "ClinVar", "rsID", "variantes genéticas",
    "cromossomos", "DNA Explorer", "DNA bruto", "raw DNA",
  ],
  authors: [{ name: "Caio Ross", url: "https://github.com/caioross" }],
  creator: "Caio Ross",
  publisher: "Caio Ross",
  applicationName: "DNA Explorer",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    alternateLocale: ["en_US"],
    url: APP_URL,
    siteName: "DNA Explorer",
    title: "DNA Explorer — Explore seu código genético no navegador",
    description:
      "Upload do seu DNA bruto → hélice 3D, cariótipo, catálogo de variantes e dashboard — tudo no navegador, 100% privado. Open-source, MIT.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "DNA Explorer — Plataforma de exploração genômica client-side",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DNA Explorer — Explore seu código genético no navegador",
    description:
      "Upload do seu DNA bruto → hélice 3D, cariótipo, 100+ variantes curadas e dashboard estatístico — 100% no navegador, privacidade total.",
    images: ["/opengraph-image"],
    creator: "@caioross",
  },
  alternates: {
    canonical: APP_URL,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DNA Explorer",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web Browser",
  description:
    "Plataforma web open-source para explorar DNA bruto no navegador. 100% client-side, privacidade por construção.",
  url: APP_URL,
  author: {
    "@type": "Person",
    name: "Caio Ross",
    url: "https://github.com/caioross",
  },
  license: "https://opensource.org/licenses/MIT",
  softwareVersion: "0.1.0",
  programmingLanguage: ["TypeScript", "JavaScript"],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
  },
  featureList: [
    "3D DNA double helix visualization",
    "Interactive karyotype chromosome grid",
    "Canonical SNP catalog with 100+ curated variants",
    "Statistical genotype dashboard",
    "Multi-provider support: Genera, 23andMe, AncestryDNA, MyHeritage, VCF",
    "100% client-side processing — zero data upload",
    "Dark/light theme with no flash",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
