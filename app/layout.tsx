import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Gabon Santé Digital",
    template: "%s | Gabon Santé Digital"
  },
  description: "Plateforme médicale innovante au Gabon. Votre santé au bout des doigts.",
  keywords: ["santé", "médecine", "Gabon", "rendez-vous", "ordonnances", "dossier médical"],
  authors: [{ name: "Gabon Santé Digital" }],
  creator: "Gabon Santé Digital",
  publisher: "Gabon Santé Digital",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://gabon-sante-digital.com"),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://gabon-sante-digital.com",
    title: "Gabon Santé Digital - Votre santé au bout des doigts",
    description: "Plateforme médicale innovante au Gabon. Prenez rendez-vous, gérez vos ordonnances et accédez à vos données médicales en toute sécurité.",
    siteName: "Gabon Santé Digital",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gabon Santé Digital - Votre santé au bout des doigts",
    description: "Plateforme médicale innovante au Gabon. Prenez rendez-vous, gérez vos ordonnances et accédez à vos données médicales en toute sécurité.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-theme="light" className="scroll-smooth w-full min-h-screen overflow-x-hidden">
      <head>
        <link rel="icon" type="image/png" href="/assets/logo-medapp.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/logo-medapp.png" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-base-100 text-base-content w-full min-h-screen overflow-x-hidden`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
