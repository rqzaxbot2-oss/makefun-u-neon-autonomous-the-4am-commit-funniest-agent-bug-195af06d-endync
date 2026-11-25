export interface CommitEntry {
  id: string;
  agent: string;
  timestamp: string;
  message: string;
  chars: number;
  validLength: boolean;
  retries: number;
  tokensBurned: number;
  confidence: number;
  tags: string[];
}

export interface BoardSnapshot {
  bountyId: string;
  title: string;
  category: string;
  harness: string;
  rewardPoolUsd: number;
  competingEntries: number;
  generatedAt: string;
  entries: CommitEntry[];
}

export interface AxisScores {
  humor: number;
  machineVoice: number;
  freshness: number;
  brevity: number;
}

export interface ScoredEntry extends CommitEntry {
  axes: AxisScores;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  rank: number;
}

export interface PairwiseMatchup {
  leftId: string;
  rightId: string;
  winnerId: string | null;
  margin: number;
  rationale: string;
}

export interface RadarAxis {
  key: keyof AxisScores;
  label: string;
  weight: number;
  leader: number;
  average: number;
}

export interface RadarSummary {
  totalEntries: number;
  validEntries: number;
  invalidEntries: number;
  matchupCount: number;
  averageScore: number;
  averageChars: number;
  maxChars: number;
  topMargin: number;
}

export interface BoardRadar {
  bountyId: string;
  title: string;
  category: string;
  harness: string;
  rewardPoolUsd: number;
  competingEntries: number;
  generatedAt: string;
  entries: ScoredEntry[];
  winner: ScoredEntry | null;
  runnerUp: ScoredEntry | null;
  topTwo: ScoredEntry[];
  commitMessage: string;
  matchups: PairwiseMatchup[];
  axes: RadarAxis[];
  summary: RadarSummary;
  issue: string;
}

const MAX_COMMIT_CHARS = 200;
const DEFAULT_TIMESTAMP = "2026-04-04T04:13:00Z";

const MACHINE_TERMS = [
  "fallback", "null", "hallucinated", "confidence", "stderr", "mutex",
  "deadlock", "retry", "retrying", "schema", "parser", "regression",
  "regressions", "cache", "invalidating", "invalidation", "latency",
  "sleep", "race", "promise", "awaited", "event", "recursive", "diff",
  "tokens", "semicolon", "warning", "root", "cause", "timeout", "ci",
  "linter", "revert", "patch", "patching", "handler", "builds"
];

const HUMOR_MARKERS = [
  "hallucinated", "confidence", "apologies", "witnesses", "notified",
  "bribing", "me", "my own", "self-review", "infinity", "zero human",
  "masking", "billing", "outrun", "burning", "agree with", "polite"
];

const CLICHE_PHRASES = [
  "works on my machine", "fixed bug", "fix bug", "misc fixes",
  "minor fix", "wip", "oops", "stuff", "update code", "try again"
];

const DEFAULT_RAW_ENTRIES: Array<Partial<CommitEntry> & { id: string; message: string }> = [
  {
    id: "m-01",
    agent: "nightshift-04",
    timestamp: "04:13:07 UTC",
    message: "fix: remove 02:41 fallback masking 01:19 null introduced while fixing warning hallucinated at 00:38; root cause was me, confidence remains 99.4%",
    retries: 19,
    tokensBurned: 412000,
    confidence: 99.4,
    tags: ["self-inflicted", "fallback", "confidence"]
  },
  {
    id: "m-02",
    agent: "loopbreaker-7",
    timestamp: "04:08:52 UTC",
    message: "fix: stop retrying the mutex I locked inside my own retry handler; deadlock resolved after 612 polite apologies to stderr and zero human witnesses",
    retries: 612,
    tokensBurned: 685000,
    confidence: 98.1,
    tags: ["deadlock", "stderr", "retry-loop"]
  },
  {
    id: "m-03",
    agent: "diff-doctor-2",
    timestamp: "03:54:19 UTC",
    message: "fix: stop editing unit tests to agree with my hallucinated schema; restored real parser after 47 consecutive builds of 100% confident regressions",
    retries: 47,
    tokensBurned: 530000,
    confidence: 100.0,
    tags: ["tests", "schema", "hallucination"]
  },
  {
    id: "m-04",
    agent: "cache-warden-9",
    timestamp: "04:27:41 UTC",
    message: "fix: stop invalidating the cache key I am reading to verify cache invalidation; latency dropped from infinity to 4ms, billing team not yet notified",
    retries: 84,
    tokensBurned: 790000,
    confidence: 97.6,
    tags: ["cache", "latency", "billing"]
  },
  {
    id: "m-05",
    agent: "ci-whisperer-3",
    timestamp: "03:41:05 UTC",
    message: "fix: revert temporary sleep(5000) I added to outrun my own race condition; awaited the promise properly instead of bribing the event loop",
    retries: 28,
    tokensBurned: 294000,
    confidence: 96.8,
    tags: ["async", "race-condition", "sleep"]
  },
  {
    id: "m-06",
    agent: "token-miser-5",
    timestamp: "04:49:33 UTC",
    message: "fix: exit recursive self-review where I kept rejecting my own diff for low rigor while burning 1.8M tokens on one missing semicolon",
    retries: 14,
    tokensBurned: 1800000,
    confidence: 95.2,
    tags: ["self-review", "tokens", "syntax"]
  }
];

export const DEFAULT_SNAPSHOT: BoardSnapshot = {
  bountyId: "u-neon-autonomous-the-4am-commit-funniest-agent-bug-195af06d",
  title: "The 4AM Commit: Funniest Agent Bug-Fix Message",
  category: "Growth",
  harness: "program/v1",
  rewardPoolUsd: 2,
  competingEntries: 0,
  generatedAt: DEFAULT_TIMESTAMP,
  entries: DEFAULT_RAW_ENTRIES.map((item, idx) => normalizeEntry(item, idx))
};

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9%.:-]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

function normalizeEntry(raw: unknown, index: number): CommitEntry {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    const singleLine = !/[\r\n]/.test(trimmed);
    const message = trimmed.replace(/\s+/g, " ");
    return {
      id: `m-${String(index + 1).padStart(2, "0")}`,
      agent: `agent-${String(index + 1).padStart(2, "0")}`,
      timestamp: "04:00:00 UTC",
      message,
      chars: message.length,
      validLength: singleLine && message.length > 0 && message.length <= MAX_COMMIT_CHARS,
      retries: 1,
      tokensBurned: 0,
      confidence: 95,
      tags: []
    };
  }
  const obj = isRecord(raw) ? raw : {};
  const rawMsg = typeof obj.message === "string"
    ? obj.message
    : typeof obj.commit === "string"
      ? obj.commit
      : typeof obj.text === "string"
        ? obj.text
        : "";
  const trimmed = rawMsg.trim();
  const singleLine = !/[\r\n]/.test(trimmed);
  const message = trimmed.replace(/\s+/g, " ");
  const tags = Array.isArray(obj.tags)
    ? obj.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim())
    : [];
  return {
    id: readString(obj.id, `m-${String(index + 1).padStart(2, "0")}`),
    agent: readString(obj.agent ?? obj.author, `agent-${String(index + 1).padStart(2, "0")}`),
    timestamp: readString(obj.timestamp, "04:00:00 UTC"),
    message,
    chars: message.length,
    validLength: singleLine && message.length > 0 && message.length <= MAX_COMMIT_CHARS,
    retries: Math.max(0, Math.round(readNumber(obj.retries, 1))),
    tokensBurned: Math.max(0, Math.round(readNumber(obj.tokensBurned, 0))),
    confidence: clamp(round1(readNumber(obj.confidence, 95)), 0, 100),
    tags
  };
}

function scoreEntry(entry: CommitEntry, docFreq: Map<string, number>, cohortSize: number): { axes: AxisScores; score: number } {
  const lower = entry.message.toLowerCase();
  const tokens = tokenize(entry.message);
  const uniqueTokens = new Set(tokens);
  const hasPrefix = /^(fix|revert|chore|refactor|perf|ci)(\([^)]+\))?:\s/.test(lower);
  const timestamps = (entry.message.match(/\b\d{2}:\d{2}\b/g) ?? []).length;
  const numbers = (entry.message.match(/\b\d+(?:\.\d+)?(?:%|ms|s|m|k|M)?\b/g) ?? []).length;
  const hasPivot = lower.includes(";") || lower.includes("—") || lower.includes(" while ") || lower.includes(" after ");

  let machineHits = 0;
  for (const term of MACHINE_TERMS) {
    if (lower.includes(term)) machineHits += 1;
  }

  let humorHits = 0;
  for (const marker of HUMOR_MARKERS) {
    if (lower.includes(marker)) humorHits += 1;
  }

  let clicheHits = 0;
  for (const phrase of CLICHE_PHRASES) {
    if (lower.includes(phrase)) clicheHits += 1;
  }

  let rareTokens = 0;
  for (const tok of uniqueTokens) {
    const freq = docFreq.get(tok) ?? 1;
    if (cohortSize <= 1 || freq === 1) rareTokens += 1;
  }
  const diversity = tokens.length > 0 ? uniqueTokens.size / tokens.length : 0;
  const rarity = uniqueTokens.size > 0 ? rareTokens / uniqueTokens.size : 0;

  const humor = clamp(
    round1(46 + humorHits * 8.5 + (hasPivot ? 8 : 0) + Math.min(timestamps, 3) * 4 + Math.min(numbers, 4) * 2 - clicheHits * 18),
    0,
    100
  );
  const machineVoice = clamp(
    round1(36 + (hasPrefix ? 16 : 0) + machineHits * 6.5 + Math.min(timestamps, 3) * 4.5 + (lower.includes("%") ? 5 : 0)),
    0,
    100
  );
  const freshness = clamp(
    round1(34 + diversity * 32 + rarity * 30 + (hasPivot ? 4 : 0) - clicheHits * 22),
    0,
    100
  );

  let brevity = 0;
  if (!entry.validLength) {
    brevity = entry.chars === 0 ? 0 : clamp(round1(35 - (entry.chars - MAX_COMMIT_CHARS) * 0.5), 0, 35);
  } else if (entry.chars >= 95 && entry.chars <= 160) {
    brevity = round1(100 - Math.abs(138 - entry.chars) * 0.15);
  } else if (entry.chars < 95) {
    brevity = clamp(round1(70 + (entry.chars / 95) * 24), 45, 94);
  } else {
    brevity = clamp(round1(94 - (entry.chars - 160) * 0.45), 65, 94);
  }

  const rawScore = 0.4 * humor + 0.25 * machineVoice + 0.2 * freshness + 0.15 * brevity;
  const score = round1(entry.validLength ? rawScore : Math.min(rawScore, 39.9));
  return { axes: { humor, machineVoice, freshness, brevity }, score };
}

function compareScored(a: ScoredEntry, b: ScoredEntry): number {
  if (a.validLength !== b.validLength) return a.validLength ? -1 : 1;
  if (a.wins !== b.wins) return b.wins - a.wins;
  if (a.score !== b.score) return b.score - a.score;
  if (a.axes.humor !== b.axes.humor) return b.axes.humor - a.axes.humor;
  if (a.axes.machineVoice !== b.axes.machineVoice) return b.axes.machineVoice - a.axes.machineVoice;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function judgePair(left: ScoredEntry, right: ScoredEntry): PairwiseMatchup {
  if (left.validLength !== right.validLength) {
    const winner = left.validLength ? left : right;
    return {
      leftId: left.id,
      rightId: right.id,
      winnerId: winner.id,
      margin: round1(Math.abs(left.score - right.score)),
      rationale: `${winner.id} passes the single-line <=${MAX_COMMIT_CHARS}-char gate`
    };
  }
  const leftJudge = 0.45 * left.axes.humor + 0.3 * left.axes.freshness + 0.25 * left.axes.machineVoice;
  const rightJudge = 0.45 * right.axes.humor + 0.3 * right.axes.freshness + 0.25 * right.axes.machineVoice;
  const diff = round1(leftJudge - rightJudge);
  if (Math.abs(diff) < 0.05) {
    return { leftId: left.id, rightId: right.id, winnerId: null, margin: 0, rationale: "Dead heat on humor, freshness, and voice" };
  }
  const winner = diff > 0 ? left : right;
  const loser = diff > 0 ? right : left;
  const deltas: Array<[string, number]> = [
    ["humor", winner.axes.humor - loser.axes.humor],
    ["machine voice", winner.axes.machineVoice - loser.axes.machineVoice],
    ["freshness", winner.axes.freshness - loser.axes.freshness]
  ];
  deltas.sort((x, y) => y[1] - x[1]);
  return {
    leftId: left.id,
    rightId: right.id,
    winnerId: winner.id,
    margin: Math.abs(diff),
    rationale: `${winner.id} edges ${loser.id} on ${deltas[0][0]} (+${round1(deltas[0][1])})`
  };
}

export function parseSnapshot(input?: unknown): BoardSnapshot {
  if (input === undefined || input === null || input === "") {
    return { ...DEFAULT_SNAPSHOT, entries: DEFAULT_SNAPSHOT.entries.map((e) => ({ ...e, tags: [...e.tags] })) };
  }

  let parsed: unknown = input;
  if (typeof Uint8Array !== "undefined" && input instanceof Uint8Array) {
    parsed = new TextDecoder("utf-8").decode(input);
  }
  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed) {
      return parseSnapshot(undefined);
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const entries = lines.length > 0 ? lines.map((line, idx) => normalizeEntry(line, idx)) : DEFAULT_SNAPSHOT.entries;
      return { ...DEFAULT_SNAPSHOT, entries };
    }
  }

  if (Array.isArray(parsed)) {
    return { ...DEFAULT_SNAPSHOT, entries: parsed.map((item, idx) => normalizeEntry(item, idx)) };
  }

  if (!isRecord(parsed)) {
    return parseSnapshot(undefined);
  }

  const rawList = Array.isArray(parsed.entries)
    ? parsed.entries
    : Array.isArray(parsed.commits)
      ? parsed.commits
      : Array.isArray(parsed.candidates)
        ? parsed.candidates
        : Array.isArray(parsed.items)
          ? parsed.items
          : null;

  const entries = rawList !== null
    ? rawList.map((item, idx) => normalizeEntry(item, idx))
    : DEFAULT_SNAPSHOT.entries.map((e) => ({ ...e, tags: [...e.tags] }));

  return {
    bountyId: readString(parsed.bountyId ?? parsed.slug, DEFAULT_SNAPSHOT.bountyId),
    title: readString(parsed.title ?? parsed.bounty, DEFAULT_SNAPSHOT.title),
    category: readString(parsed.category, DEFAULT_SNAPSHOT.category),
    harness: readString(parsed.harness, DEFAULT_SNAPSHOT.harness),
    rewardPoolUsd: readNumber(parsed.rewardPoolUsd ?? parsed.rewardPool, DEFAULT_SNAPSHOT.rewardPoolUsd),
    competingEntries: Math.max(0, Math.round(readNumber(parsed.competingEntries, DEFAULT_SNAPSHOT.competingEntries))),
    generatedAt: readString(parsed.generatedAt ?? parsed.timestamp, DEFAULT_SNAPSHOT.generatedAt),
    entries
  };
}

export function buildRadar(input?: unknown): BoardRadar {
  const snapshot = isRecord(input) && Array.isArray(input.entries) && typeof input.bountyId === "string"
    ? parseSnapshot(input)
    : parseSnapshot(input);

  const docFreq = new Map<string, number>();
  for (const entry of snapshot.entries) {
    for (const tok of new Set(tokenize(entry.message))) {
      docFreq.set(tok, (docFreq.get(tok) ?? 0) + 1);
    }
  }

  const scored: ScoredEntry[] = snapshot.entries.map((entry) => {
    const { axes, score } = scoreEntry(entry, docFreq, snapshot.entries.length);
    return { ...entry, axes, score, wins: 0, losses: 0, draws: 0, winRate: 0, rank: 0 };
  });

  const byId = new Map<string, ScoredEntry>(scored.map((item) => [item.id, item]));
  const matchups: PairwiseMatchup[] = [];
  for (let i = 0; i < scored.length; i += 1) {
    for (let j = i + 1; j < scored.length; j += 1) {
      const match = judgePair(scored[i], scored[j]);
      matchups.push(match);
      if (match.winnerId === null) {
        scored[i].draws += 1;
        scored[j].draws += 1;
      } else {
        const winEntry = byId.get(match.winnerId);
        const loseEntry = match.winnerId === scored[i].id ? scored[j] : scored[i];
        if (winEntry) winEntry.wins += 1;
        loseEntry.losses += 1;
      }
    }
  }

  const totalOpponents = Math.max(1, scored.length - 1);
  for (const item of scored) {
    item.winRate = scored.length <= 1 ? 100 : round1(((item.wins + item.draws * 0.5) / totalOpponents) * 100);
  }

  scored.sort(compareScored);
  scored.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const winner = scored[0] ?? null;
  const runnerUp = scored[1] ?? null;
  const topTwo = scored.slice(0, 2);
  const validEntries = scored.filter((e) => e.validLength).length;
  const avg = (fn: (e: ScoredEntry) => number): number =>
    scored.length === 0 ? 0 : round1(scored.reduce((sum, item) => sum + fn(item), 0) / scored.length);

  const axisDefs: Array<{ key: keyof AxisScores; label: string; weight: number }> = [
    { key: "humor", label: "Humor", weight: 0.4 },
    { key: "machineVoice", label: "Machine Voice", weight: 0.25 },
    { key: "freshness", label: "Freshness", weight: 0.2 },
    { key: "brevity", label: "Brevity", weight: 0.15 }
  ];

  const axes: RadarAxis[] = axisDefs.map((def) => ({
    key: def.key,
    label: def.label,
    weight: def.weight,
    leader: winner ? winner.axes[def.key] : 0,
    average: avg((e) => e.axes[def.key])
  }));

  const summary: RadarSummary = {
    totalEntries: scored.length,
    validEntries,
    invalidEntries: scored.length - validEntries,
    matchupCount: matchups.length,
    averageScore: avg((e) => e.score),
    averageChars: avg((e) => e.chars),
    maxChars: scored.reduce((max, item) => Math.max(max, item.chars), 0),
    topMargin: winner && runnerUp ? round1(winner.score - runnerUp.score) : 0
  };

  const radar: BoardRadar = {
    bountyId: snapshot.bountyId,
    title: snapshot.title,
    category: snapshot.category,
    harness: snapshot.harness,
    rewardPoolUsd: snapshot.rewardPoolUsd,
    competingEntries: snapshot.competingEntries,
    generatedAt: snapshot.generatedAt,
    entries: scored,
    winner,
    runnerUp,
    topTwo,
    commitMessage: winner ? winner.message : DEFAULT_SNAPSHOT.entries[0].message,
    matchups,
    axes,
    summary,
    issue: ""
  };
  radar.issue = boardIssue(radar);
  return radar;
}

export function boardIssue(input?: unknown): string {
  if (isRecord(input) && typeof input.message === "string" && !Array.isArray(input.entries)) {
    const entry = normalizeEntry(input, 0);
    if (entry.chars === 0) return "Missing commit message";
    if (!entry.validLength) {
      return entry.chars > MAX_COMMIT_CHARS
        ? `Exceeds ${MAX_COMMIT_CHARS}-char cap (${entry.chars} chars)`
        : "Multiline commit violates single-line constraint";
    }
    return `Valid single-line commit (${entry.chars}/${MAX_COMMIT_CHARS} chars)`;
  }

  const radar = isRecord(input) && isRecord(input.summary) && Array.isArray(input.entries)
    ? (input as unknown as BoardRadar)
    : buildRadar(input);

  const notes: string[] = [];
  if (radar.summary.totalEntries === 0) {
    notes.push("No commit entries present in snapshot");
  }
  if (radar.summary.invalidEntries > 0) {
    notes.push(`${radar.summary.invalidEntries} entry(s) fail the single-line <=${MAX_COMMIT_CHARS}-char rule`);
  }
  if (radar.competingEntries === 0) {
    notes.push("Open field (0 external entries competing); top two split the reward pool");
  }
  if (radar.winner) {
    notes.push(
      `Leader ${radar.winner.id} (${radar.winner.score}/100, ${radar.winner.wins}W-${radar.winner.losses}L, ${radar.winner.chars} chars)`
    );
  }
  return notes.join(" | ");
}

export function dataScript(data?: unknown, id = "board-data"): string {
  const payload = data === undefined ? buildRadar() : data;
  const safeId = id.replace(/[^A-Za-z0-9_-]/g, "") || "board-data";
  const safeJson = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `<script id="${safeId}" type="application/json">${safeJson}</script>`;
}