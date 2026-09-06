import { EventList, type EventLike } from "@albiceleste/ui";

const EVENTS: EventLike[] = [
  { event_key: "e1", event_date: "2026-09-05", severity: 3, event_type: "club_change", headline: "Leonardo Balerdi: first match for Roma (Serie A), a stronger competition than Ligue 1", full_name: "Leonardo Balerdi", player_key: "Q1" },
  { event_key: "e2", event_date: "2026-09-05", severity: 2, event_type: "multi_goal_match", headline: "Julián Álvarez: 2 goals vs Villarreal", full_name: "Julián Álvarez", player_key: "Q2" },
  { event_key: "e3", event_date: "2026-09-04", severity: 2, event_type: "return_after_absence", headline: "Gonzalo Montiel: played after 74 days and 9 team matches missed", full_name: "Gonzalo Montiel", player_key: "Q3" },
  { event_key: "e4", event_date: "2026-09-04", severity: 1, event_type: "first_start_of_season", headline: "Valentín Barco: first start of the 2026 season for Strasbourg", full_name: "Valentín Barco", player_key: "Q4" },
  { event_key: "e5", event_date: "2026-09-03", severity: 2, event_type: "minutes_surge", headline: "Alan Lescano: 354 minutes in the last 28 days vs 170 before (+108%), starts 4 vs 2", full_name: "Alan Lescano", player_key: "Q5", focus_reasons: ["top_minutes_position"] },
];

export const WatchFeed = () => <EventList events={EVENTS} hrefFor={(k) => `/players/${k}`} />;

export const WithoutTypeLabels = () => <EventList events={EVENTS.slice(0, 3)} showType={false} hrefFor={(k) => `/players/${k}`} />;

export const PlayerPageEvents = () => (
  <EventList
    events={[
      { event_key: "p1", event_date: "2026-08-21", severity: 1, event_type: "consecutive_starts", headline: "3 consecutive starts for San Lorenzo" },
      { event_key: "p2", event_date: "2026-02-08", severity: 2, event_type: "consecutive_starts", headline: "5 consecutive starts for San Lorenzo" },
      { event_key: "p3", event_date: "2026-01-23", severity: 1, event_type: "first_start_of_season", headline: "First start of the 2026 season for San Lorenzo" },
    ]}
  />
);

export const Empty = () => <EventList events={[]} />;
