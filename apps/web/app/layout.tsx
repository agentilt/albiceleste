import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Footer, Page } from "@albiceleste/ui";
import { manifest } from "@albiceleste/data";
import { PlayerSearch } from "@/components/PlayerSearch";
import { SiteHeader } from "@/components/SiteHeader";
import { date, datetime } from "@/lib/format";
import { REPO_URL } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"], display: "swap" });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "albiceleste", template: "%s · albiceleste" },
  description:
    "Every player eligible for Argentina's senior national team across Europe's top five leagues, Brazil and Argentina: where they play, how much, and what changed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const m = manifest();
  return (
    <html lang="en" className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <SiteHeader
          right={<PlayerSearch />}
          meta={
            <>
              Matches through {date(m.data_as_of)} · squads as of {date(m.squad_as_of)} · snapshot {datetime(m.exported_at)}
              {m.git_commit ? ` · ${m.git_commit}` : ""}
            </>
          }
        />
        <Page>{children}</Page>
        <Footer>
          Free data only. Football data for European competitions provided by football-data.org; career history from the CC0
          transfermarkt-datasets snapshot; identities from Wikidata. Not affiliated with AFA or any club.{" "}
          <a className="link" href={REPO_URL}>
            Source code and methodology
          </a>
          .
        </Footer>
      </body>
    </html>
  );
}
