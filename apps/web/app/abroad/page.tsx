import type { Metadata } from "next";
import { getAbroad } from "@albiceleste/data";
import { AbroadExplorer } from "@/components/AbroadExplorer";
import { Note, PageTitle } from "@albiceleste/ui";

export const metadata: Metadata = { title: "Players abroad" };

export default async function AbroadPage() {
  const rows = await getAbroad();
  return (
    <>
      <PageTitle title="Argentine players abroad" lede="Eligible or under-review players whose current club is outside Argentina, with their current-season line." />
      <AbroadExplorer rows={rows} />
      <Note>xG, xA and rating come from Highlightly box scores where available; minutes, goals and assists fall back to ESPN. Sort by clicking a column.</Note>
    </>
  );
}
