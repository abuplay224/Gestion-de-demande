import type { Metadata } from "next";
import { JetBrains_Mono, Mulish } from "next/font/google";
import "./globals.css";

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Doztra — Demandes clients",
  description: "Registre partagé des demandes clients de Doztra",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${mulish.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
