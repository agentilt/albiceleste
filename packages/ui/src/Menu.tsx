"use client";

import { type CSSProperties, createContext, type FocusEvent, type KeyboardEvent, type ReactNode, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

const LEFT: CSSProperties = { left: 0 };
const RIGHT: CSSProperties = { left: "auto", right: 0 };
const Ctx = createContext<{ close: () => void }>({ close: () => {} });

/**
 * A filter facet as a dropdown: one chip that names the facet and its current value, and a panel under it with the
 * choices. The chip inverts while the facet is narrowing the data, so the state of the list reads from the closed bar.
 * Esc, a click outside, or focus leaving closes the panel; the arrow keys walk the items.
 */
export function Menu({
  label,
  value,
  active = false,
  align = "left",
  wide = false,
  title,
  children,
}: {
  label: string;
  value?: string;
  active?: boolean;
  /** Which edge of the chip the panel hangs from. Either way it flips when the other edge fits and this one does not. */
  align?: "left" | "right";
  /** Room for two columns of choices. */
  wide?: boolean;
  title?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<CSSProperties>(align === "right" ? RIGHT : LEFT);
  const root = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useCallback(() => {
    setOpen(false);
    btn.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !pop.current || !btn.current) return;
    const w = pop.current.getBoundingClientRect().width;
    const b = btn.current.getBoundingClientRect();
    const leftOk = b.left + w <= window.innerWidth - 8;
    const rightOk = b.right - w >= 8;
    // the preferred edge when it fits, the other edge when that one does, else hug the viewport's left margin
    setPlace(align === "right" && rightOk ? RIGHT : leftOk ? LEFT : rightOk ? RIGHT : { left: Math.round(16 - b.left) });
    pop.current.querySelector<HTMLElement>("[data-item], input")?.focus();
  }, [open, align]);

  function onKey(e: KeyboardEvent<HTMLSpanElement>) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    if (!open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const items = Array.from(pop.current?.querySelectorAll<HTMLElement>("[data-item]") ?? []);
    if (items.length === 0) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    const n = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[n]!.focus();
  }
  function onBlur(e: FocusEvent<HTMLSpanElement>) {
    if (open && !root.current?.contains(e.relatedTarget as Node)) setOpen(false);
  }

  return (
    <span ref={root} className="relative inline-block" onKeyDown={onKey} onBlur={onBlur}>
      <button ref={btn} type="button" className="chip" data-active={active || undefined} aria-expanded={open} aria-controls={id} aria-haspopup="true" title={title} onClick={() => setOpen(!open)}>
        <span className="shrink-0">{label}</span>
        {value && (
          <>
            <span className="menu-sep" aria-hidden="true">
              ·
            </span>
            <span className="menu-value">{value}</span>
          </>
        )}
        <svg className="menu-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div ref={pop} id={id} role="group" aria-label={label} tabIndex={-1} className={`menu${wide ? " menu-wide" : ""}`} style={place}>
          <Ctx.Provider value={{ close }}>{children}</Ctx.Provider>
        </div>
      )}
    </span>
  );
}

/** A choice that can be on with the others: a small square that fills when checked. The panel stays open. */
export function MenuCheck({ checked, onChange, aside, children }: { checked: boolean; onChange: () => void; aside?: ReactNode; children: ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} data-item className="menu-item" onClick={onChange}>
      <span className="menu-box" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {aside !== undefined && aside !== null && <span className="num shrink-0 font-mono text-[11px] text-muted">{aside}</span>}
    </button>
  );
}

/** One choice among its group. Selecting closes the panel unless `close` is off (a radio row inside a longer panel). */
export function MenuRadio({ checked, onSelect, close = true, children }: { checked: boolean; onSelect: () => void; close?: boolean; children: ReactNode }) {
  const ctx = useContext(Ctx);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-item
      className="menu-item"
      onClick={() => {
        onSelect();
        if (close) ctx.close();
      }}
    >
      <span className="menu-box" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}

/** A named run of items; `radio` makes it a radio group for assistive tech. The label prints as an eyebrow when given. */
export function MenuGroup({ label, radio = false, children }: { label?: string; radio?: boolean; children: ReactNode }) {
  return (
    <div role={radio ? "radiogroup" : "group"} aria-label={label}>
      {label && <div className="menu-label">{label}</div>}
      {children}
    </div>
  );
}

/** Two columns of items side by side on a wide panel, one column on a phone. Items are read down the first column first. */
export function MenuColumns({ children }: { children: ReactNode[] }) {
  const half = Math.ceil(children.length / 2);
  return (
    <div className="grid sm:grid-cols-2">
      <div>{children.slice(0, half)}</div>
      <div>{children.slice(half)}</div>
    </div>
  );
}

export function MenuRule() {
  return <hr className="menu-rule" />;
}

/** A line of explanation at the foot of a panel. */
export function MenuNote({ children }: { children: ReactNode }) {
  return <p className="menu-note">{children}</p>;
}

/** A row holding an input or two, for a range or a threshold that lives in the same panel as the toggles. */
export function MenuField({ children }: { children: ReactNode }) {
  return <div className="menu-field">{children}</div>;
}
