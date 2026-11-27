/* Shared helpers for the CBF calendar pages: dates, labels, calendar files and the year strip. */
(typeof window !== "undefined" ? window : globalThis).CAL = (function(){
  const CATS = [
    {id:"governance", label:"Governance", hint:"Board, annual meeting, leadership group, SAB", v:"--gov"},
    {id:"science", label:"Scientific", hint:"Seminars, workshops, conferences", v:"--sci"},
    {id:"deadline", label:"Deadlines", hint:"Reporting, deliverables, applications", v:"--ddl"},
    {id:"external", label:"External", hint:"Events CBF takes part in", v:"--ext"}
  ];
  const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
  const STATUS = {draft:"Draft", tentative:"Tentative", confirmed:"Confirmed"};
  const pad = n => String(n).padStart(2, "0");
  const parse = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dayDiff = (a, b) => Math.round((b - a) / 864e5);
  const endOf = e => e.end && e.end >= e.start ? e.end : e.start;
  const today = (() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; })();
  const TODAY = iso(today);
  const fDay = new Intl.DateTimeFormat("en-GB", {weekday:"short", day:"numeric", month:"short"});
  const fDM = new Intl.DateTimeFormat("en-GB", {day:"numeric", month:"short"});
  const fWd = new Intl.DateTimeFormat("en-GB", {weekday:"short"});
  const fMonth = new Intl.DateTimeFormat("en-GB", {month:"long", year:"numeric"});
  const fMon = new Intl.DateTimeFormat("en-GB", {month:"short"});
  const color = c => `var(${(CAT[c] || CATS[0]).v})`;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
  const safeUrl = u => { try { const x = new URL(u); return x.protocol === "https:" ? x.href : null; } catch (e) { return null; } };
  const byStart = (a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : (a.startTime || "") < (b.startTime || "") ? -1 : (a.startTime || "") > (b.startTime || "") ? 1 : 0;
  const isMulti = e => endOf(e) !== e.start;

  function dateLabel(e){
    const s = parse(e.start), en = parse(endOf(e));
    if (!isMulti(e)) return fDay.format(s);
    if (s.getMonth() === en.getMonth() && s.getFullYear() === en.getFullYear()) return s.getDate() + "–" + fDM.format(en);
    return fDM.format(s) + " – " + fDM.format(en);
  }
  function timeLabel(e){
    if (e.startTime) return e.startTime + (e.endTime ? "–" + e.endTime : "");
    if (e.category === "deadline") return "Deadline";
    return isMulti(e) ? "" : "All day";
  }
  function relDays(e){
    const n = dayDiff(today, parse(e.start));
    if (n === 0) return "today";
    if (n === 1) return "tomorrow";
    if (n > 1) return "in " + n + " days";
    return endOf(e) >= TODAY ? "ongoing" : "";
  }
  /* The big date in the list: day number(s) and weekday(s). */
  function whenBlock(e){
    const s = parse(e.start), en = parse(endOf(e));
    if (!isMulti(e)) return {big:String(s.getDate()), small:fWd.format(s), range:false};
    if (s.getMonth() === en.getMonth()) return {big:s.getDate() + "–" + en.getDate(), small:fWd.format(s) + "–" + fWd.format(en), range:true};
    return {big:String(s.getDate()), small:"to " + fDM.format(en), range:false};
  }

  /* Start and end in Norwegian local time. Timed events without an end time last one hour. */
  function span(e){
    const ed = endOf(e);
    if (!e.startTime) return {allDay:true, sd:e.start, ed:iso(addDays(parse(ed), 1))};
    let et = e.endTime;
    if (!et){ const [h, mi] = e.startTime.split(":").map(Number); et = h >= 23 ? "23:59" : pad(h + 1) + ":" + pad(mi); }
    return {allDay:false, sd:e.start, st:e.startTime, ed, et};
  }
  function lastSunday(y, m0){ const d = new Date(Date.UTC(y, m0 + 1, 0)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.getUTCDate(); }
  function osloOffset(ds, t){
    const [y, m, d] = ds.split("-").map(Number);
    const mar = lastSunday(y, 2), oct = lastSunday(y, 9), h = t ? Number(t.slice(0, 2)) : 12;
    const summer = (m > 3 && m < 10) || (m === 3 && (d > mar || (d === mar && h >= 2))) || (m === 10 && (d < oct || (d === oct && h < 3)));
    return summer ? "+02:00" : "+01:00";
  }
  function bodyText(e){
    return [e.description, e.participants ? "Participants: " + e.participants : "", safeUrl(e.onlineLink) ? "Online: " + safeUrl(e.onlineLink) : ""].filter(Boolean).join("\n");
  }

  /* iCalendar file (RFC 5545) for Outlook, Google, Apple. */
  const VTZ = ["BEGIN:VTIMEZONE", "TZID:Europe/Oslo",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE"];
  const icsEsc = s => String(s || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
  function fold(line){
    const enc = new TextEncoder(); let out = "", cur = "", n = 0;
    for (const ch of line){ const b = enc.encode(ch).length; if (n + b > 75){ out += cur + "\r\n "; cur = ""; n = 1; } cur += ch; n += b; }
    return out + cur;
  }
  function ics(events, name){
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const dt = (d, t) => d.replace(/-/g, "") + "T" + t.replace(":", "") + "00";
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CBF NTNU//CBF calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "X-WR-CALNAME:" + icsEsc(name || "CBF events"), "X-WR-TIMEZONE:Europe/Oslo", ...VTZ];
    events.forEach(e => {
      const s = span(e);
      L.push("BEGIN:VEVENT", "UID:" + e.id + "@cbf-calendar.ntnu.no", "DTSTAMP:" + stamp);
      if (s.allDay) L.push("DTSTART;VALUE=DATE:" + s.sd.replace(/-/g, ""), "DTEND;VALUE=DATE:" + s.ed.replace(/-/g, ""));
      else L.push("DTSTART;TZID=Europe/Oslo:" + dt(s.sd, s.st), "DTEND;TZID=Europe/Oslo:" + dt(s.ed, s.et));
      L.push("SUMMARY:" + icsEsc(e.title));
      if (e.location) L.push("LOCATION:" + icsEsc(e.location));
      const body = bodyText(e); if (body) L.push("DESCRIPTION:" + icsEsc(body));
      if (safeUrl(e.onlineLink)) L.push("URL:" + safeUrl(e.onlineLink));
      L.push("STATUS:" + (e.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"), "TRANSP:" + (e.category === "deadline" ? "TRANSPARENT" : "OPAQUE"), "END:VEVENT");
    });
    L.push("END:VCALENDAR");
    return L.map(fold).join("\r\n") + "\r\n";
  }
  const q = o => Object.entries(o).filter(([, v]) => v).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
  function outlookUrl(e){
    const s = span(e);
    const o = {path:"/calendar/action/compose", rru:"addevent", subject:e.title, location:e.location || "", body:bodyText(e)};
    if (s.allDay){ o.startdt = s.sd; o.enddt = s.ed; o.allday = "true"; }
    else { o.startdt = s.sd + "T" + s.st + ":00" + osloOffset(s.sd, s.st); o.enddt = s.ed + "T" + s.et + ":00" + osloOffset(s.ed, s.et); }
    return "https://outlook.office.com/calendar/0/deeplink/compose?" + q(o);
  }
  function googleUrl(e){
    const s = span(e), c = d => d.replace(/-/g, "");
    const dates = s.allDay ? c(s.sd) + "/" + c(s.ed) : c(s.sd) + "T" + s.st.replace(":", "") + "00/" + c(s.ed) + "T" + s.et.replace(":", "") + "00";
    return "https://calendar.google.com/calendar/render?" + q({action:"TEMPLATE", text:e.title, dates, ctz:"Europe/Oslo", details:bodyText(e), location:e.location || ""});
  }

  /* Year strip: the next twelve months, one lane per category. */
  function strip(el, events, opts){
    opts = opts || {};
    const s0 = new Date(today.getFullYear(), today.getMonth(), 1);
    const s1 = new Date(today.getFullYear(), today.getMonth() + 12, 1);
    const total = dayDiff(s0, s1);
    const pc = d => dayDiff(s0, d) / total * 100;
    const months = [];
    for (let i = 0; i < 12; i++){
      const a = new Date(s0.getFullYear(), s0.getMonth() + i, 1), b = new Date(s0.getFullYear(), s0.getMonth() + i + 1, 1);
      months.push({a, l:pc(a), w:pc(b) - pc(a)});
    }
    const tpos = pc(today) + 50 / total;
    let h = '<div class="srow shead"><div class="slab"></div><div class="mon">';
    months.forEach((m, i) => { h += `<span style="width:${m.w}%">${fMon.format(m.a)}<small>${i === 0 || m.a.getMonth() === 0 ? m.a.getFullYear() : "&nbsp;"}</small></span>`; });
    h += "</div></div>";
    CATS.filter(c => !opts.cats || opts.cats.includes(c.id)).forEach(c => {
      const evs = events.filter(e => e.category === c.id && parse(endOf(e)) >= s0 && parse(e.start) < s1).sort(byStart);
      h += `<div class="srow"><div class="slab"><i class="dot" style="--c:${color(c.id)}"></i>${esc(c.label)}</div><div class="trk">`;
      months.forEach((m, i) => { h += `<i class="mcell${i % 2 ? " alt" : ""}" style="left:${m.l}%;width:${m.w}%"></i>`; });
      h += `<i class="tday" style="left:${tpos}%"></i>`;
      let last = -99;
      evs.forEach(e => {
        const a = Math.max(0, pc(parse(e.start))), b = Math.min(100, pc(addDays(parse(endOf(e)), 1)));
        const multi = isMulti(e), mid = multi ? a : (a + b) / 2;
        const cls = ["mk", e.category === "deadline" && !multi ? "ddl" : "", multi ? "bar" : "", e.status === "tentative" ? "tent" : "", e.status === "draft" ? "draft" : "", e.id === opts.nextId ? "next" : ""].filter(Boolean).join(" ");
        const style = multi ? `left:${a}%;width:${Math.max(b - a, 0.9)}%` : `left:${mid}%`;
        const label = `${e.title} · ${dateLabel(e)}${e.status !== "confirmed" ? " · " + STATUS[e.status] : ""}`;
        h += `<button type="button" class="${cls}" data-id="${esc(e.id)}" style="--c:${color(c.id)};${style}" title="${esc(label)}" aria-label="${esc(label)}"></button>`;
        if (mid - last > 7.8){
          const edge = mid < 4 ? " l" : mid > 94 ? " r" : "";
          h += `<span class="mlab${edge}" style="left:${mid}%">${esc(fDM.format(parse(e.start)))}</span>`;
          last = mid;
        }
      });
      h += "</div></div>";
    });
    el.innerHTML = h;
    el.querySelectorAll("button.mk").forEach(b => b.addEventListener("click", () => opts.onPick && opts.onPick(b.dataset.id)));
  }

  return {CATS, CAT, STATUS, parse, iso, addDays, dayDiff, endOf, today, TODAY, fDay, fDM, fMonth, color, esc, safeUrl, byStart, isMulti,
    dateLabel, timeLabel, relDays, whenBlock, ics, outlookUrl, googleUrl, strip};
})();
