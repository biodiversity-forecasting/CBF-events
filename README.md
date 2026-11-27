# CBF events

Public calendar of formal events for the Centre for Biodiversity Forecasting (CBF): board and annual meetings, seminars, conferences, report releases and reporting deadlines.

**Live page:** https://biodiversity-forecasting.github.io/CBF-events/
**Calendar subscription:** https://biodiversity-forecasting.github.io/CBF-events/events.ics

> This is a demo. The events are test entries, except the kick-off in October 2026.

## How it works

- Events are kept in a calendar editor in Claude, used by the CBF centre management. Drafts and internal notes stay there.
- Tentative and confirmed events are exported to `events.json` (read by the page) and `events.ics` (for calendar apps) with `tools/build.mjs`. Only a fixed set of public fields is written.
- GitHub Pages serves the repository as it is: no build step.

```
index.html        the page
cal.js, cal.css   shared helpers and styles (dates, calendar files, year strip)
logo.svg          CBF logo (from biodiversity-forecasting.github.io)
favicon.png       CBF icon
events.json       published events
events.ics        the same events as an iCalendar file
tools/build.mjs   builds events.json and events.ics from an export of the editor
```

## Updating the calendar

```bash
node tools/build.mjs export.json "optional note shown at the top of the page"
git add events.json events.ics && git commit -m "Update events" && git push
```

`export.json` is a JSON array of events with the fields `id, title, category (governance|science|deadline|external), status (draft|tentative|confirmed), start, end, startTime, endTime, location, participants, onlineLink, description`.

All times are Norwegian time (Europe/Oslo).
