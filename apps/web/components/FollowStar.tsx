"use client";

import { FollowButton, NoteMark } from "@albiceleste/ui";
import { t, type Locale } from "@/lib/i18n";
import { useFollows, useNotes } from "@/lib/store";

/** Follow toggle wired to the browser store; `compact` shows the star only (list rows). */
export function FollowStar({ playerKey, locale, compact = true }: { playerKey: string; locale: Locale; compact?: boolean }) {
  const { isFollowed, toggle } = useFollows();
  const d = t(locale);
  return <FollowButton pressed={isFollowed(playerKey)} onClick={() => toggle(playerKey)} labelOn={d.marks.followed} labelOff={d.marks.follow} compact={compact} />;
}

/** Note count for a player, from the browser store. */
export function NoteCount({ playerKey, locale }: { playerKey: string; locale: Locale }) {
  const { countFor } = useNotes();
  return <NoteMark count={countFor(playerKey)} title={t(locale).marks.notes} />;
}
