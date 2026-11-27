// Builds events.json and events.ics (the published calendar) from a JSON array of events.
// Usage: node tools/build.mjs <events-export.json> ["note shown at the top of the page"]
// Only tentative and confirmed events are published, with a fixed set of fields:
// drafts and internal notes never reach the public files.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const [inFile, note = ""] = process.argv.slice(2);
if (!inFile){ console.error("Usage: node tools/build.mjs <events-export.json> [note]"); process.exit(1); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
vm.runInThisContext(fs.readFileSync(path.join(root, "cal.js"), "utf8"));
const C = globalThis.CAL;

const FIELDS = ["id", "title", "category", "status", "start", "end", "startTime", "endTime", "location", "participants", "onlineLink", "description"];
const NULLABLE = new Set(["end", "startTime", "endTime"]);
const all = JSON.parse(fs.readFileSync(inFile, "utf8"));
const events = all
  .filter(e => e && e.id && e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.start || "") && (e.status === "tentative" || e.status === "confirmed") && C.CAT[e.category])
  .map(e => Object.fromEntries(FIELDS.map(k => [k, e[k] ?? (NULLABLE.has(k) ? null : "")])))
  .sort(C.byStart);

fs.writeFileSync(path.join(root, "events.json"), JSON.stringify({updated: C.TODAY, note, events}, null, 1).replace(/</g, "\\u003c") + "\n");
fs.writeFileSync(path.join(root, "events.ics"), C.ics(events, "CBF events"));
console.log(`Published ${events.length} of ${all.length} events (drafts and invalid entries left out).`);
