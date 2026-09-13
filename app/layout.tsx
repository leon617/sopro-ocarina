import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sopro · seu espaço para aprender ocarina",
  description: "Importe partituras MusicXML e pratique ocarina com diagramas de digitação e áudio sincronizado.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Sopro", statusBarStyle: "black-translucent" },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
