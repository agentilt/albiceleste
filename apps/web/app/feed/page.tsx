import type { Metadata } from "next";
import { getCompetitions, getFeed, manifest } from "@albiceleste/data";
import { FeedExplorer } from "@/components/FeedExplorer";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Watch feed" };

export default async function FeedPage() {
  const [items, competitions] = await Promise.all([getFeed(), getCompetitions()]);
  return (
    <>
      <PageTitle
        title="Watch feed"
        lede="Detected changes for players abroad and for Argentine-league players in the focus set. Facts are computed in SQL from the match sequence; the headline is a template."
      />
      <FeedExplorer items={items} competitions={competitions} asOf={manifest().data_as_of} />
    </>
  );
}
