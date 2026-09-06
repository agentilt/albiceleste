import { Severity } from "@albiceleste/ui";

export const Levels = () => (
  <ul className="space-y-2 text-sm">
    <li className="flex items-center gap-3">
      <Severity level={3} />
      <span>3, club change to a stronger competition, hat-trick, 10 straight starts</span>
    </li>
    <li className="flex items-center gap-3">
      <Severity level={2} />
      <span>2, league debut, return after absence, minutes surge</span>
    </li>
    <li className="flex items-center gap-3">
      <Severity level={1} />
      <span>1, first start of the season, 3 straight starts</span>
    </li>
  </ul>
);
