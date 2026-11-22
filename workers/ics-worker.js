/* ==========================================================================
   ZEN DECK - WEB WORKER DE PROCESAMIENTO iCal / .ICS + RRULE
   ========================================================================== */

function parseICSTimestampWorker(raw) {
  if (!raw) return null;
  const clean = String(raw).trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(clean);
  if (dateOnly) {
    return {
      iso: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00:00`,
      allDay: true,
      dateObj: new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 0, 0, 0)
    };
  }
  const dtMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(clean);
  if (dtMatch) {
    const [, y, m, d, hh, mm, ss, z] = dtMatch;
    if (z === 'Z') {
      const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
      return { iso: dt.toISOString(), allDay: false, dateObj: dt };
    }
    const localDt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    return { iso: `${y}-${m}-${d}T${hh}:${mm}:${ss}`, allDay: false, dateObj: localDt };
  }
  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    return { iso: parsed.toISOString(), allDay: false, dateObj: parsed };
  }
  return null;
}

function unescapeICSField(str = '') {
  return String(str)
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function expandRRuleOccurrences(baseEvent, rruleRaw, windowStart, windowEnd) {
  if (!rruleRaw || !baseEvent.startObj) return [baseEvent];

  const rules = {};
  rruleRaw.split(';').forEach((part) => {
    const [k, v] = part.split('=');
    if (k && v) rules[k.trim().toUpperCase()] = v.trim().toUpperCase();
  });

  const freq = rules.FREQ;
  if (!freq) return [baseEvent];

  const interval = Math.max(1, parseInt(rules.INTERVAL || '1', 10) || 1);
  const maxCount = Math.min(90, parseInt(rules.COUNT || '60', 10) || 60);
  const untilParsed = rules.UNTIL ? parseICSTimestampWorker(rules.UNTIL) : null;
  const untilDate = untilParsed?.dateObj || windowEnd;
  const hardEnd = untilDate < windowEnd ? untilDate : windowEnd;

  const durationMs = baseEvent.endObj
    ? Math.max(0, baseEvent.endObj.getTime() - baseEvent.startObj.getTime())
    : 3600000;

  const results = [];
  let cursor = new Date(baseEvent.startObj.getTime());
  let iterations = 0;

  while (cursor <= hardEnd && results.length < maxCount && iterations < 365) {
    iterations++;
    if (cursor >= windowStart) {
      const occEnd = new Date(cursor.getTime() + durationMs);
      results.push({
        id: `${baseEvent.id}_occ_${cursor.toISOString().slice(0, 10)}`,
        title: baseEvent.title,
        location: baseEvent.location,
        start: baseEvent.allDay ? cursor.toISOString().slice(0, 10) + 'T00:00:00' : cursor.toISOString(),
        end: baseEvent.allDay ? occEnd.toISOString().slice(0, 10) + 'T23:59:59' : occEnd.toISOString(),
        allDay: baseEvent.allDay,
        source: baseEvent.source
      });
    }

    if (freq === 'DAILY') {
      cursor.setDate(cursor.getDate() + interval);
    } else if (freq === 'WEEKLY') {
      cursor.setDate(cursor.getDate() + 7 * interval);
    } else if (freq === 'MONTHLY') {
      cursor.setMonth(cursor.getMonth() + interval);
    } else if (freq === 'YEARLY') {
      cursor.setFullYear(cursor.getFullYear() + interval);
    } else {
      break;
    }
  }

  return results.length ? results : [baseEvent];
}

function parseICSInWorker(icsText, sourceLabel = 'apple') {
  const unfolded = String(icsText || '').replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 7 * 86400000);
  const windowEnd = new Date(now.getTime() + 60 * 86400000);

  const output = [];
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT' && current) {
      if (current.start && current.summary) {
        const baseEvent = {
          id: current.uid || `${sourceLabel}_${Math.random().toString(36).slice(2, 9)}`,
          title: unescapeICSField(current.summary),
          location: unescapeICSField(current.location || ''),
          start: current.start.iso,
          end: current.end ? current.end.iso : current.start.iso,
          allDay: current.start.allDay,
          source: sourceLabel,
          startObj: current.start.dateObj,
          endObj: current.end ? current.end.dateObj : current.start.dateObj
        };

        if (current.rrule) {
          output.push(...expandRRuleOccurrences(baseEvent, current.rrule, windowStart, windowEnd));
        } else {
          delete baseEvent.startObj;
          delete baseEvent.endObj;
          output.push(baseEvent);
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const keyPart = line.slice(0, colonIdx).toUpperCase();
    const valPart = line.slice(colonIdx + 1);
    const propName = keyPart.split(';')[0];

    if (propName === 'UID') current.uid = valPart.trim();
    else if (propName === 'SUMMARY') current.summary = valPart;
    else if (propName === 'LOCATION') current.location = valPart;
    else if (propName === 'RRULE') current.rrule = valPart;
    else if (propName === 'DTSTART') current.start = parseICSTimestampWorker(valPart);
    else if (propName === 'DTEND') current.end = parseICSTimestampWorker(valPart);
  }

  return output;
}

self.onmessage = (event) => {
  const { requestId, icsText, sourceLabel } = event.data || {};
  try {
    const events = parseICSInWorker(icsText, sourceLabel);
    self.postMessage({ requestId, ok: true, events });
  } catch (err) {
    self.postMessage({ requestId, ok: false, error: err?.message || 'Error parseando ICS', events: [] });
  }
};