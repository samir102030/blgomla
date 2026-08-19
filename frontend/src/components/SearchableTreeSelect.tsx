import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * A single choice in the tree. `trail` is the ancestor names, root first, and
 * is what makes a search result readable: the catalogue has a "Speaker" under
 * Computer & Gaming Accessories and another under Video Conference, and a flat
 * list of matches cannot tell them apart.
 */
export interface TreeOption {
  id: string;
  name: string;
  depth: number;
  trail: string[];
}

interface Props {
  options: TreeOption[];
  value: string;
  onChange: (id: string) => void;
  /** Label for the "nothing selected" choice, e.g. "No parent". */
  emptyLabel: string;
  /** Placeholder inside the search box. */
  searchLabel: string;
  /** Shown when a query matches nothing. */
  noResultsLabel: string;
  disabled?: boolean;
}

const EMPTY_ID = "";

/**
 * A select that can be typed into.
 *
 * A plain <select> was fine when the catalogue was a handful of departments.
 * At 160-odd categories across five levels, picking a parent meant scrolling a
 * list whose indentation is the only clue to where an entry sits — so this
 * keeps that tree order for browsing and adds filtering for when the name is
 * already known.
 *
 * While the box is empty the list reads exactly as the tree does, indented by
 * depth. Once a query is typed the indentation stops meaning anything (the
 * parents it was relative to are filtered out), so matches switch to showing
 * their full trail instead. Name matches sort above trail-only matches, so
 * typing "computers" offers the department itself before its contents.
 */
export default function SearchableTreeSelect({
  options,
  value,
  onChange,
  emptyLabel,
  searchLabel,
  noResultsLabel,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.id === value) || null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;

    const byName: TreeOption[] = [];
    const byTrail: TreeOption[] = [];
    for (const o of options) {
      if (o.name.toLowerCase().includes(q)) byName.push(o);
      else if (o.trail.some((t) => t.toLowerCase().includes(q))) byTrail.push(o);
    }
    return [...byName, ...byTrail];
  }, [options, query]);

  // The "no parent" row is part of the list only when it is not filtered away,
  // so the arrow keys can reach it like any other choice.
  const showEmptyRow =
    !query.trim() || emptyLabel.toLowerCase().includes(query.trim().toLowerCase());
  const rows: Array<TreeOption | null> = showEmptyRow ? [null, ...results] : results;

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery("");
  }, [open]);

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (opt: TreeOption | null) => {
    onChange(opt ? opt.id : EMPTY_ID);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive((i) => {
        const next = e.key === "ArrowDown" ? i + 1 : i - 1;
        return Math.max(0, Math.min(rows.length - 1, next));
      });
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      if (rows.length) pick(rows[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-start border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate text-gray-900">{selected.name}</span>
              {selected.trail.length > 0 && (
                <span className="block truncate text-xs text-gray-500">
                  {selected.trail.join(" › ")}
                </span>
              )}
            </>
          ) : (
            <span className="block truncate text-gray-500">{emptyLabel}</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchLabel}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {rows.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">{noResultsLabel}</li>
            )}

            {rows.map((opt, i) => {
              const isActive = i === active;
              const isSelected = opt ? opt.id === value : value === EMPTY_ID;
              const searching = Boolean(query.trim());

              return (
                <li
                  key={opt ? opt.id : "__none__"}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(opt)}
                  className={`px-3 py-1.5 cursor-pointer text-sm ${
                    isActive ? "bg-blue-50" : ""
                  } ${isSelected ? "font-semibold text-blue-700" : "text-gray-800"}`}
                  // Indentation only carries meaning while the full tree is on
                  // screen; a filtered list shows the trail instead.
                  style={
                    opt && !searching
                      ? { paddingInlineStart: `${0.75 + opt.depth * 0.9}rem` }
                      : undefined
                  }
                >
                  <span className="block truncate">{opt ? opt.name : emptyLabel}</span>
                  {opt && searching && opt.trail.length > 0 && (
                    <span className="block truncate text-xs text-gray-500">
                      {opt.trail.join(" › ")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
