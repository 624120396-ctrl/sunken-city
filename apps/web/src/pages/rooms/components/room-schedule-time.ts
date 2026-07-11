interface WallTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function formatter(timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

function parseInput(value: string): WallTimeParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('时间格式无效');
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  if (
    check.getUTCFullYear() !== parts.year ||
    check.getUTCMonth() + 1 !== parts.month ||
    check.getUTCDate() !== parts.day ||
    check.getUTCHours() !== parts.hour ||
    check.getUTCMinutes() !== parts.minute
  ) throw new Error('时间格式无效');
  return parts;
}

function partsAt(instant: Date, timezone: string): WallTimeParts {
  const values = Object.fromEntries(
    formatter(timezone).formatToParts(instant).map(part => [part.type, part.value])
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function sameWallTime(left: WallTimeParts, right: WallTimeParts) {
  return left.year === right.year && left.month === right.month && left.day === right.day && left.hour === right.hour && left.minute === right.minute;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function fromZonedDateTimeInput(value: string, timezone: string) {
  const desired = parseInput(value);
  formatter(timezone).format(new Date());
  const wallUtc = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute);
  let candidate = wallUtc;

  for (let index = 0; index < 4; index += 1) {
    const represented = partsAt(new Date(candidate), timezone);
    const representedUtc = Date.UTC(represented.year, represented.month - 1, represented.day, represented.hour, represented.minute);
    candidate += wallUtc - representedUtc;
  }

  const matches: number[] = [];
  for (let instant = candidate - 3 * 60 * 60_000; instant <= candidate + 3 * 60 * 60_000; instant += 60_000) {
    if (sameWallTime(partsAt(new Date(instant), timezone), desired)) matches.push(instant);
  }
  const uniqueMatches = [...new Set(matches)];
  if (uniqueMatches.length === 0) throw new Error('该时区中的本地时间不存在，可能处于夏令时跳转区间');
  if (uniqueMatches.length > 1) throw new Error('该时区中的本地时间重复，可能处于夏令时回拨区间');
  return new Date(uniqueMatches[0]).toISOString();
}

export function toZonedDateTimeInput(value: string, timezone: string) {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) throw new Error('时间格式无效');
  const parts = partsAt(instant, timezone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}
