import ExcelJS from "exceljs";

/**
 * The small part of SheetJS this codebase actually used, backed by ExcelJS.
 *
 * Why this exists rather than an upgrade: the `xlsx` package on npm stops at
 * 0.18.5, and 0.18.5 carries a prototype-pollution flaw and a ReDoS with no
 * fixed release on that registry. SheetJS publish the fix themselves, from
 * their own CDN, and this organisation's egress policy does not permit
 * reaching it — so the supported upgrade path is closed from here, and the
 * choice is between shipping a known-vulnerable parser and changing library.
 *
 * Only the read side was ever exploitable — SheetJS say as much, and it
 * matches the flaw: a crafted workbook pollutes during parse, and writing one
 * cannot. But `XLSX.read` is exactly what the four bulk-upload endpoints do
 * with a file a vendor just handed us, so the reachable half is the half that
 * mattered.
 *
 * The surface below is not a general SheetJS emulation and should not grow
 * into one. It is the six calls this repository made, plus the two internals
 * it reached for — `sheet["!cols"]` and `workbook.Sheets[name]` — so that
 * `excelTemplate.js`, `categoryExcel.js`, `studentCatalogExcel.js` and
 * `productExport.js` keep their shape and only their `await`s change.
 *
 * The one difference callers must care about: **`write` and `read` are
 * async.** ExcelJS has no synchronous buffer path, and pretending otherwise
 * with deasync-style tricks would be worse than an `await` in eight places.
 */

/** A workbook, in the shape the old code destructures. */
export const book_new = () => ({ SheetNames: [], Sheets: {} });

/**
 * Rows in, sheet out.
 *
 * With no `header` option SheetJS derives the columns from the objects: the
 * union of their keys, in the order each key is first seen. That detail is
 * load-bearing here — the instructions sheets are arrays whose later rows
 * omit `Notes`, and deriving columns from the first row alone would silently
 * drop the column.
 */
export const json_to_sheet = (rows, opts = {}) => {
  const data = Array.isArray(rows) ? rows : [];
  let header = opts.header;
  if (!Array.isArray(header)) {
    const seen = [];
    for (const row of data) {
      for (const key of Object.keys(row ?? {})) {
        if (!seen.includes(key)) seen.push(key);
      }
    }
    header = seen;
  }
  return { __header: header, __rows: data };
};

export const book_append_sheet = (workbook, sheet, name) => {
  if (!workbook.SheetNames.includes(name)) workbook.SheetNames.push(name);
  workbook.Sheets[name] = sheet;
  return workbook;
};

/**
 * Whatever ExcelJS hands back for a cell, as the primitive the old code
 * expected. Rich text, hyperlinks, formulas and errors all arrive as objects;
 * `sheet_to_json` used to give a string or a number, and every caller does
 * `?.toString().trim()` or `parseFloat` on the result.
 */
const cellValue = (value) => {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((t) => t.text).join("");
    if ("text" in value) return value.text;            // hyperlink
    if ("result" in value) return value.result;        // formula
    if ("error" in value) return undefined;            // #REF! and friends
    return String(value);
  }
  return value;
};

const isBlank = (v) => v === undefined || v === null || v === "";

/**
 * Sheet to rows.
 *
 * Two shapes, both of which the callers use:
 *   - default — an array of objects keyed by the header row, empty cells
 *     omitted, fully-empty rows dropped.
 *   - `{ header: 1 }` — an array of arrays, the raw grid. `range` is a
 *     starting row offset, and `studentCatalogExcel.js` uses
 *     `{ header: 1, range: 0 }[0]` to read the header row on its own.
 */
export const sheet_to_json = (sheet, opts = {}) => {
  if (!sheet) return [];
  const aoa = sheet.__aoa ?? toAoa(sheet);
  const start = Number.isInteger(opts.range) ? opts.range : 0;
  const grid = aoa.slice(start);

  if (opts.header === 1) return grid;

  const [head = [], ...body] = grid;
  const keys = head.map((h) => (isBlank(h) ? "" : String(h).trim()));
  const out = [];
  for (const row of body) {
    if (row.every(isBlank)) continue;
    const obj = {};
    keys.forEach((key, i) => {
      if (!key) return;
      const v = row[i];
      if (isBlank(v)) return;
      obj[key] = v;
    });
    if (Object.keys(obj).length) out.push(obj);
  }
  return out;
};

/** A sheet built by `json_to_sheet`, flattened to the grid `write` needs. */
const toAoa = (sheet) => {
  const header = sheet.__header ?? [];
  return [header, ...(sheet.__rows ?? []).map((row) => header.map((k) => row?.[k]))];
};

/**
 * Workbook to bytes. `opts` is accepted and ignored — every caller passed
 * `{ type: "buffer", bookType: "xlsx" }`, which is the only thing this does.
 */
export const write = async (workbook) => {
  const wb = new ExcelJS.Workbook();
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const ws = wb.addWorksheet(name);
    const aoa = sheet.__aoa ?? toAoa(sheet);
    for (const row of aoa) ws.addRow(row);

    // `!cols` is SheetJS's column metadata; `wch` is a width in characters,
    // which is the same unit ExcelJS's `width` uses.
    const cols = sheet["!cols"];
    if (Array.isArray(cols)) {
      cols.forEach((col, i) => {
        if (col && typeof col.wch === "number") ws.getColumn(i + 1).width = col.wch;
      });
    }
    // `!freeze` is SheetJS's pane-freeze metadata; `productExport.js` pins the
    // header so a thirteen-thousand-row catalogue stays readable while
    // scrolling. ExcelJS spells the same thing as a frozen view.
    const freeze = sheet["!freeze"];
    if (freeze) {
      ws.views = [
        {
          state: "frozen",
          xSplit: Number(freeze.xSplit) || 0,
          ySplit: Number(freeze.ySplit) || 0,
        },
      ];
    }
    if (aoa.length) ws.getRow(1).font = { bold: true };
  }
  // ExcelJS returns its own buffer type; normalise so callers can keep
  // handing the result straight to res.send().
  return Buffer.from(await wb.xlsx.writeBuffer());
};

/**
 * Bytes to workbook. This is the call that used to be the vulnerable one.
 */
export const read = async (fileBuffer) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fileBuffer);

  const out = book_new();
  wb.eachSheet((ws) => {
    const aoa = [];
    // `includeEmpty` on both loops so a blank cell keeps its column position;
    // without it a row with a gap shifts every value after the gap one column
    // to the left, and silently mis-keys the import.
    ws.eachRow({ includeEmpty: true }, (row) => {
      const cells = [];
      for (let c = 1; c <= ws.columnCount; c += 1) {
        cells.push(cellValue(row.getCell(c).value));
      }
      aoa.push(cells);
    });
    book_append_sheet(out, { __aoa: aoa }, ws.name);
  });
  return out;
};

export const utils = { book_new, json_to_sheet, book_append_sheet, sheet_to_json };

export default { utils, read, write };
