import { Stat, StatRow } from "@albiceleste/ui";

export const FrontPage = () => (
  <StatRow>
    <Stat label="Eligible players known" value="5,473" />
    <Stat label="In tracked squads" value="1,047" />
    <Stat label="Playing abroad" value="122" />
    <Stat label="In focus set" value="375" />
    <Stat label="Events, last 7 days" value="288" />
    <Stat label="Matches in data" value="5,690" />
  </StatRow>
);
