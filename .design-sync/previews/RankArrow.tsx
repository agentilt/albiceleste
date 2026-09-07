import { RankArrow } from "@albiceleste/ui";

export const Up = () => <RankArrow change={3} />;
export const Down = () => <RankArrow change={-12} />;
export const Same = () => <RankArrow change={0} />;
export const Unknown = () => <RankArrow change={null} />;
export const InText = () => (
  <span className="text-sm">
    DEF 13 <RankArrow change={60} className="text-xs" />
  </span>
);
