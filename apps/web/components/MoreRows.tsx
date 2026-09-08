"use client";

import { PanelRows } from "@albiceleste/ui";
import { type ReactNode, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

/** PanelRows that fold after `limit` lines with a "+ n more" toggle, so panels side by side end near the same height. */
export function MoreRows({ rows, limit = 12, locale }: { rows: { key: string; left: ReactNode; right?: ReactNode }[]; limit?: number; locale: Locale }) {
  const d = t(locale);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PanelRows rows={open ? rows : rows.slice(0, limit)} />
      {rows.length > limit && (
        <button type="button" className="hit mt-1 self-start py-1 text-xs text-celeste-deep hover:underline" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? d.common.showFewer : d.common.showMore(rows.length - limit)}
        </button>
      )}
    </>
  );
}
