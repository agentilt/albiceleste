import type { Metadata } from "next";
import { getFocus } from "@albiceleste/data";
import { FocusExplorer } from "@/components/FocusExplorer";
import { Note, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Focus set" };

export default async function FocusPage() {
  const rows = await getFocus();
  return (
    <>
      <PageTitle title="Focus set" lede="Everyone abroad is in by default. Argentine-league players enter through explicit rules; each row shows why." />
      <FocusExplorer rows={rows} />
      <Note>
        Rules: U23 regular = under 23 with regular starts; senior cap = capped by Argentina; top minutes in position = leads his position group by minutes in
        the league; rising starter = 3 or more starts in the last 5 team matches after at most 1 in the previous 5.
      </Note>
    </>
  );
}
