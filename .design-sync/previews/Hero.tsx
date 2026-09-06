import { Hero } from "@albiceleste/ui";

export const FrontPage = () => (
  <Hero
    title="Who could play for Argentina, and what changed this week."
    lede="Every player eligible for the senior national team across Europe's top five leagues, Brazil and Argentina: where they play, how much they play, and the changes worth a look. Free data only; every number traces back to a source record."
  />
);

export const TitleOnly = () => <Hero title="The export pipeline, 2016 to today." />;
