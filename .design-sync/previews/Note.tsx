import { Note } from "@albiceleste/ui";

export const Default = () => (
  <Note>Minutes come from Highlightly box scores where present, otherwise from ESPN substitution clocks. Share of team minutes is capped at 100%.</Note>
);

export const UnderAFigure = () => (
  <div>
    <div className="num font-serif text-3xl">98%</div>
    <Note>of player-matches with both sources agree within three minutes.</Note>
  </div>
);
