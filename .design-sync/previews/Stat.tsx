import { Stat } from "@albiceleste/ui";

export const Default = () => <Stat label="Playing abroad" value="122" />;

export const LargeNumber = () => <Stat label="Matches in data" value="5,690" />;

export const Pair = () => (
  <div style={{ display: "flex", gap: "2.5rem" }}>
    <Stat label="Eligible players known" value="5,473" />
    <Stat label="Events, last 7 days" value="288" />
  </div>
);
