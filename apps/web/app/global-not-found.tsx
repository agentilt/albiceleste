import type { Metadata } from "next";
import { Archivo, Chivo, Chivo_Mono } from "next/font/google";
import { NotFoundBody } from "@/components/NotFoundBody";
import "./globals.css";

const chivo = Chivo({ subsets: ["latin", "latin-ext"], weight: ["400", "700", "900"], variable: "--font-chivo", display: "swap" });
const archivo = Archivo({ subsets: ["latin", "latin-ext"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const chivoMono = Chivo_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-chivo-mono", display: "swap" });

export const metadata: Metadata = { title: "404 · albiceleste" };

/** The page for any URL the site does not know, in the site's chrome and in the reader's language (from the path). */
export default function GlobalNotFound() {
  return (
    <html lang="es" className={`${chivo.variable} ${archivo.variable} ${chivoMono.variable}`}>
      <body>
        <NotFoundBody />
      </body>
    </html>
  );
}
