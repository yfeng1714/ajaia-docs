import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/session";
import { listPeople } from "@/lib/users";
import "./globals.css";

const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Ajaia Docs",
  description: "A lightweight shared document editor.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F6F7F9",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [currentUser, people] = await Promise.all([getCurrentUser(), listPeople()]);

  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <a className="skip" href="#content">
          Skip to content
        </a>
        <AppHeader currentUser={currentUser} people={people} />
        <main id="content">{children}</main>
      </body>
    </html>
  );
}
