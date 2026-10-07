import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { siteVerification } from "@/lib/site/search-console";
import "./globals.css";

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://studiocarollucas.com.br");
const verification = siteVerification();

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-jost",
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "Stúdio Carol Lucas",
  description:
    "Experiências fotográficas autorais para celebrar a sua história no Stúdio Carol Lucas.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Stúdio Carol Lucas",
    title: "Stúdio Carol Lucas | Experiências fotográficas autorais",
    description:
      "Experiências fotográficas autorais para celebrar a sua história no Stúdio Carol Lucas.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stúdio Carol Lucas | Experiências fotográficas autorais",
    description:
      "Experiências fotográficas autorais para celebrar a sua história no Stúdio Carol Lucas.",
  },
  ...(verification ? { verification } : {}),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${jost.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
