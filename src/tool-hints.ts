import type { ToolScriptAttachment } from './types.js';

export interface AutoToolHints {
  additionalContext?: string;
  repairContext?: string;
  summary?: string;
}

interface MsconsSample {
  meteringPointId?: string;
  productCode?: string;
  timezoneCode?: string;
  quantity?: string;
  startRaw?: string;
  endRaw?: string;
  startIso?: string;
  endIso?: string;
}

const MAX_SEGMENTS = 2048;

export function buildAutoToolHints(
  query: string,
  attachments?: ToolScriptAttachment[] | null
): AutoToolHints | null {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const lowerQuery = query.toLowerCase();
  const isQueryMscons = lowerQuery.includes('mscons');

  const candidate = attachments.find((attachment) => {
    if (!attachment || typeof attachment.content !== 'string') {
      return false;
    }
    const filename = attachment.filename?.toLowerCase() ?? '';
    const hintByExtension = /\.(edi|edifact)$/i.test(filename);
    const hintByContent = /MSCONS/i.test(attachment.content.slice(0, 2000));
    return hintByExtension || hintByContent;
  });

  if (!candidate) {
    return null;
  }

  const segments = splitEdifactSegments(candidate.content, MAX_SEGMENTS);
  const isMsconsFile = segments.some(
    (segment) => segment.startsWith('UNH+') && segment.includes('MSCONS')
  );
  if (!isQueryMscons && !isMsconsFile) {
    return null;
  }

  const sample = extractMsconsSample(segments);
  const hints: string[] = [];

  hints.push(
    `Eingabe ist eine EDIFACT-MSCONS-Datei. Segment-Trennzeichen "'", Datenelement-Trennzeichen '+', Komponententrenner ':'; ? kennzeichnet Escapes (z. B. ?+ => +).`
  );

  if (sample.meteringPointId) {
    hints.push(`Messlokations-ID aus LOC+Z04: ${sample.meteringPointId}`);
  } else {
    hints.push('Messlokations-ID findet sich in Segment LOC+Z04+<Messlokation>.');
  }

  if (sample.productCode) {
    hints.push(`Produktcode laut PIA+5: ${sample.productCode}`);
  } else {
    hints.push('Produktcode steht in PIA+5 (z. B. Anlagekennung oder Bilanzkreis).');
  }

  hints.push(
    'Messintervalle bestehen aus einem Triplet "QTY+187:<Menge>", gefolgt von "DTM+163:<Start>", "DTM+164:<Ende>" (jeweils CCYYMMDDHHMM).'
  );

  if (sample.quantity && sample.startIso && sample.endIso) {
    const timezone = sample.timezoneCode ? ` (Zeitzone ${sample.timezoneCode})` : '';
    hints.push(
      `Beispielmesswert: ${sample.quantity} von ${sample.startIso} bis ${sample.endIso}${timezone}.`
    );
  }

  hints.push(
    'Konvertiere alle Triplets in eine CSV-Datei (z. B. "mscons-intervals.csv") mit Kopfzeile: ' +
      'metering_point_id,product_code,interval_start,interval_end,quantity_kwh,timezone_code.'
  );
  hints.push(
    'Wandle Mengen in Dezimalzahlen (Punkt als Dezimaltrenner) und verwerfe leere oder unvollständige Datensätze.'
  );
  hints.push(
    'Datumswerte in ISO-8601 umrechnen. Falls kein Offset vorliegt, verwende UTC und ergänze "Z".'
  );
  hints.push(
    'Ignoriere Segmente außerhalb des LIN-Blocks und protokolliere die Anzahl verarbeiteter Intervalle.'
  );

  const composed = hints.join('\n');
  const summaryParts: string[] = [];
  summaryParts.push('MSCONS-Kontext hinzugefügt');
  if (sample.meteringPointId) {
    summaryParts.push(`Messlokation ${sample.meteringPointId}`);
  }
  if (sample.productCode) {
    summaryParts.push(`Produkt ${sample.productCode}`);
  }

  return {
    additionalContext: composed,
    repairContext: composed,
    summary: summaryParts.join(' · ')
  } satisfies AutoToolHints;
}

function splitEdifactSegments(content: string, limit: number): string[] {
  const segments: string[] = [];
  let current = '';
  let escaped = false;

  for (const char of content) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '?') {
      escaped = true;
      continue;
    }

    if (char === "'") {
      const trimmed = current.trim();
      if (trimmed) {
        segments.push(trimmed);
        if (segments.length >= limit) {
          break;
        }
      }
      current = '';
      continue;
    }

    if (char === '\r' || char === '\n') {
      continue;
    }

    current += char;
  }

  if (segments.length < limit) {
    const trimmed = current.trim();
    if (trimmed) {
      segments.push(trimmed);
    }
  }

  return segments;
}

function extractMsconsSample(segments: string[]): MsconsSample {
  const result: MsconsSample = {};

  const locSegment = segments.find((segment) => segment.startsWith('LOC+Z04+'));
  if (locSegment) {
    const parts = locSegment.split('+');
    const candidate = parts[2]?.split(':')[0];
    if (candidate) {
      result.meteringPointId = candidate;
    }
  }

  const piaSegment = segments.find((segment) => segment.startsWith('PIA+5+'));
  if (piaSegment) {
    const parts = piaSegment.split('+');
    const candidate = parts[2]?.replace(/:{2,}.*/, '').replace(/\s+/g, '');
    if (candidate) {
      result.productCode = candidate;
    }
  }

  for (let index = 0; index < segments.length; index++) {
    const current = segments[index];
    if (!current?.startsWith('QTY+187')) {
      continue;
    }

    const start = segments[index + 1];
    const end = segments[index + 2];

    if (!start?.startsWith('DTM+163') || !end?.startsWith('DTM+164')) {
      continue;
    }

    const quantity = parseQtyValue(current);
    const startInfo = parseDtmValue(start);
    const endInfo = parseDtmValue(end);

    if (!quantity || !startInfo?.value || !endInfo?.value) {
      continue;
    }

    result.quantity = quantity;
    result.startRaw = startInfo.value;
    result.endRaw = endInfo.value;
    result.startIso = toIsoTimestamp(startInfo.value);
    result.endIso = toIsoTimestamp(endInfo.value);
    result.timezoneCode = startInfo.tzCode ?? endInfo.tzCode;
    break;
  }

  return result;
}

function parseQtyValue(segment: string): string | null {
  const parts = segment.split('+');
  const valuePart = parts[1];
  if (!valuePart) {
    return null;
  }
  const [, rawValue] = valuePart.split(':');
  return rawValue?.trim() ?? null;
}

interface ParsedDtm {
  value: string;
  tzCode?: string;
}

function parseDtmValue(segment: string): ParsedDtm | null {
  const parts = segment.split('+');
  if (parts.length < 2) {
    return null;
  }

  const qualifierAndValue = parts[1];
  const [, value] = qualifierAndValue.split(':');
  const tzCode = parts[2]?.trim();

  if (!value) {
    return null;
  }

  return { value: value.trim(), tzCode: tzCode && tzCode.length > 0 ? tzCode : undefined };
}

function toIsoTimestamp(raw: string): string | undefined {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^0-9]/g, '');
  if (digits.length < 12) {
    return undefined;
  }

  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  const hour = digits.slice(8, 10);
  const minute = digits.slice(10, 12);

  if ([month, day, hour, minute].some((part) => part.length !== 2)) {
    return undefined;
  }

  return `${year}-${month}-${day}T${hour}:${minute}:00Z`;
}
