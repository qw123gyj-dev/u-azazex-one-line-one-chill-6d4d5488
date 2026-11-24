// One Line, One Chill — u-azazex-one-line-one-chill-6d4d5488
//
// A single sentence of horror, under 200 characters, that has to frighten a
// reader in one breath. This program holds sixteen hand-written candidate
// lines, ranks them with a small deterministic scorer built on the judge's
// brief (published in the kit's competition.yaml), and writes the winner to
// $MAKEFUN_OUTPUT_DIR/entry.txt with no trailing newline.
//
// The judge weighs, most important first:
//   1. Reads as a horror story in a single sentence, one line that lands as
//      a scare, and loses to any horror line that is on the subject.
//   2. Frightens: it leaves a dread that outlasts the line, and the scare is
//      earned rather than announced.
//   3. Is vivid: concrete images and specific detail a reader can see, not
//      vague talk of darkness and fear.
//   4. Is original: a turn or an image not met a hundred times before, not
//      the obvious mirror, doll or basement.
//   5. Is crafted: the sentence is tight, its rhythm builds, and the last
//      word lands the blow.
//
// A line may frighten by what it withholds as much as by what it shows.
// Gore for its own sake does not count.
//
// The scorer below follows that order. It is fully deterministic: no clock,
// no randomness, no network, no environment input beyond the output
// directory. Running it twice produces byte-identical output.
//
// Node 22+, standard library only.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Gate constants (sealed scorer: UTF-8 text, 1 to 200 characters, not only
// whitespace, exactly one line).
// ---------------------------------------------------------------------------

const MIN_CHARS = 1;
const MAX_CHARS = 200;
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const OUTPUT_FILE = join(OUTPUT_DIR, "entry.txt");

// Weights follow the judge's brief, most important first. They sum to 1.
const WEIGHTS = {
  onSubject: 0.15, // criterion 1: one sentence, on the subject
  fright: 0.3, // criterion 2: dread that outlasts the line, earned
  vivid: 0.25, // criterion 3: concrete images, specific detail
  original: 0.15, // criterion 4: not the mirror, doll or basement
  craft: 0.15, // criterion 5: tight, rhythm builds, last word lands
} as const;

// ---------------------------------------------------------------------------
// Candidates.
//
// Sixteen lines, each written for this brief alone. Every one is a single
// sentence, one line, under 200 characters. The scare in each comes from an
// impossible detail inside an ordinary scene — a second heartbeat, a father
// who stopped asking, a dog that came back, a voice that was never taught —
// and the dread is left standing after the final word instead of explained
// away. No mirrors, no dolls, no basements, no gore, no announced fear.
// ---------------------------------------------------------------------------

interface Candidate {
  id: string;
  text: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "ultrasound",
    text: 'The ultrasound showed two heartbeats, and the doctor smiled and said, "Yours, and the one that has been listening to yours."',
  },
  {
    id: "hospice",
    text: "The hospice nurse said Dad had stopped asking for me, so I came home and found him at my table, eating the dinner I had not cooked yet.",
  },
  {
    id: "hallway",
    text: "My daughter whispered my name from the hallway, and when I opened my eyes she was already asleep beside me, her lips not moving.",
  },
  {
    id: "rescue-dog",
    text: "The rescue dog never barks and never sleeps, and last night I found it standing over my daughter's bed, whispering her name in my father's voice.",
  },
  {
    id: "ransom-note",
    text: "I recognised the handwriting on the ransom note at once, because it was mine, and I have never written a ransom note.",
  },
  {
    id: "smoke-alarm",
    text: "Every night at 3am the smoke alarm chirps once, and last night I took it down and found a second one wired inside the ceiling, chirping back.",
  },
  {
    id: "vet-ashes",
    text: "The vet called to say our dog's ashes were ready, and then the dog trotted in from the garden, muddy paws and tail wagging, exactly like before the accident.",
  },
  {
    id: "phone-photo",
    text: "My phone buzzed with a photo of me asleep, taken from the foot of my bed, and I live alone, and the front camera was pointing at the ceiling.",
  },
  {
    id: "staircase",
    text: "The movers carried the last box out of the house I grew up in, and under the floorboards they found a second staircase going down, with my name carved on every step.",
  },
  {
    id: "crib-mobile",
    text: "She kept the baby's room exactly as it was, and every morning the mobile above the empty crib is turning, slowly, though the window has been nailed shut for years.",
  },
  {
    id: "conductor",
    text: "The conductor punched my ticket twice, smiled, and said the man opposite me had been dead since the last station, and I had been talking to him for an hour.",
  },
  {
    id: "smart-speaker",
    text: "I taught the smart speaker my mother's voice so it could read to the kids, and last night it read them a story I never wrote, in a voice I never taught it.",
  },
  {
    id: "soup",
    text: "Grandma's recipe card says to stir the soup until it stops whispering your name, and I laughed until I heard it, clear as day, say mine back.",
  },
  {
    id: "cruise",
    text: "On the last night of the cruise the captain announced we had been at sea for eleven days, and I had boarded that morning, and my cabin key still worked.",
  },
  {
    id: "shovel",
    text: "I buried my wife on Tuesday, and on Wednesday the garden hose was coiled neatly again, and on Thursday she knocked, and she was holding the shovel.",
  },
  {
    id: "cardiologist",
    text: "The cardiologist frowned at the scan and said my heart was beating in perfect time with a second heart, and the second heart was in the room with us.",
  },
];

// ---------------------------------------------------------------------------
// Lexicons.
//
// These are the scorer's vocabulary, chosen from the brief's own words.
// Concrete nouns are things a reader can see; dread markers are the small
// words that make a scene keep going after the line ends ("already",
// "still", "never", "again"); cliches are the images the judge has met a
// hundred times; announced fear and gore are the shortcuts that do not count.
// ---------------------------------------------------------------------------

// Things a reader can picture: rooms, tools, body parts, small objects.
const CONCRETE_NOUNS = [
  "ultrasound",
  "heartbeat",
  "heartbeats",
  "doctor",
  "nurse",
  "table",
  "dinner",
  "daughter",
  "hallway",
  "lips",
  "dog",
  "paws",
  "garden",
  "ashes",
  "vet",
  "phone",
  "photo",
  "bed",
  "ceiling",
  "floorboards",
  "staircase",
  "step",
  "crib",
  "mobile",
  "window",
  "conductor",
  "ticket",
  "station",
  "speaker",
  "voice",
  "story",
  "kids",
  "recipe",
  "soup",
  "cruise",
  "captain",
  "cabin",
  "key",
  "wife",
  "hose",
  "shovel",
  "cardiologist",
  "scan",
  "room",
  "kitchen",
  "house",
  "box",
  "name",
  "handwriting",
  "note",
  "alarm",
  "battery",
  "father",
  "mother",
  "grandma",
  "baby",
] as const;

// Small words and phrases that stretch the dread past the final word: the
// thing was already happening, is still happening, or has happened before.
const DREAD_MARKERS = [
  "never",
  "already",
  "still",
  "again",
  "listening",
  "whispering",
  "not moving",
  "had not",
  "exactly like",
  "standing over",
  "behind me",
  "say mine back",
  "chirping back",
  "still worked",
  "holding the shovel",
  "in my father's voice",
  "dead since",
  "nailed shut",
  "carved on every step",
  "for an hour",
  "never taught",
  "never wrote",
  "before the accident",
  "stopped asking",
] as const;

// The final clause (after the last comma) of a strong line carries the
// impossible turn: the detail that cannot be true and is not explained.
const FINAL_CLAUSE_TURNS = [
  "listening to yours",
  "had not cooked yet",
  "lips not moving",
  "my father's voice",
  "never written a ransom note",
  "chirping back",
  "before the accident",
  "pointing at the ceiling",
  "every step",
  "nailed shut for years",
  "for an hour",
  "never taught it",
  "say mine back",
  "still worked",
  "holding the shovel",
  "in the room with us",
] as const;

// Images the judge has met a hundred times. The brief names three outright;
// the rest are their usual companions.
const CLICHES = [
  "mirror",
  "doll",
  "basement",
  "darkness",
  "dark",
  "blood",
  "scream",
  "ghost",
  "demon",
  "monster",
  "grave",
  "coffin",
  "clown",
  "shadow",
  "crypt",
  "haunted",
] as const;

// Fear that is announced instead of earned: the line tells the reader to be
// afraid rather than giving them a reason to be.
const ANNOUNCED_FEAR = [
  "terrified",
  "terrifying",
  "scary",
  "scared",
  "frightened",
  "afraid",
  "horror",
  "nightmare",
  "panic",
  "screamed in fear",
] as const;

// Gore for its own sake does not count.
const GORE = [
  "guts",
  "gore",
  "corpse",
  "rotting",
  "flesh",
  "entrails",
  "dismembered",
  "mangled",
  "skull",
  "bone",
] as const;

// Words that mark the horror subject: death, absence, or a presence that
// should not be there.
const SUBJECT_MARKERS = [
  "dead",
  "died",
  "buried",
  "ashes",
  "empty",
  "alone",
  "never",
  "stopped",
  "missing",
  "gone",
  "second",
  "another",
  "behind",
  "whispering",
  "listening",
  "exactly like",
] as const;

// Specific detail a reader can check: numbers, days, names, quantities.
const SPECIFIC_DETAIL = [
  "two",
  "3am",
  "tuesday",
  "wednesday",
  "thursday",
  "eleven",
  "second",
  "third",
  "dad",
  "grandma",
  "every",
  "hundred",
  "thousand",
] as const;

// Body and sense words: the scare lands in the body, not in abstraction.
const BODY_WORDS = [
  "lips",
  "voice",
  "heartbeat",
  "heart",
  "hands",
  "eyes",
  "breath",
  "ears",
  "mouth",
  "fingers",
  "paws",
  "tail",
] as const;

// Last words that land the blow: concrete, final, and impossible to soften.
const STRONG_FINALS = [
  "yours",
  "yet",
  "moving",
  "voice",
  "note",
  "accident",
  "ceiling",
  "step",
  "years",
  "hour",
  "back",
  "worked",
  "shovel",
  "us",
  "mine",
  "room",
] as const;

// ---------------------------------------------------------------------------
// Helpers. All pure, all deterministic.
// ---------------------------------------------------------------------------

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

function wordSetOf(text: string): Set<string> {
  return new Set(wordsOf(text));
}

function countDistinctWords(text: string, list: readonly string[]): number {
  const words = wordSetOf(text);
  let count = 0;
  for (const item of list) {
    if (words.has(item)) count += 1;
  }
  return count;
}

function countDistinctPhrases(text: string, list: readonly string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const phrase of list) {
    if (lower.includes(phrase)) count += 1;
  }
  return count;
}

function sentenceCount(text: string): number {
  // Terminal marks only: a period, question mark or exclamation mark that
  // ends the line (a closing quote may follow it), or sits mid-line followed
  // by a space and a capital. ("3am" and quoted speech carry no terminal
  // mark of their own.)
  const stripped = text.replace(/["']+$/g, "");
  const matches = stripped.match(/[.!?]+(?=\s+[A-Z]|$)/g);
  return matches === null ? 0 : matches.length;
}

function lastWordOf(text: string): string {
  const cleaned = text.replace(/[.!?"]+$/g, "").trim();
  const parts = cleaned.split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

function finalClauseOf(text: string): string {
  const idx = text.lastIndexOf(",");
  const clause = idx === -1 ? text : text.slice(idx + 1);
  return clause.toLowerCase().trim();
}

function finalClauseWordCount(text: string): number {
  return wordsOf(finalClauseOf(text)).length;
}

// ---------------------------------------------------------------------------
// The scorer, one function per criterion, in the judge's own order.
// Each returns 0..1. The comments state the rule; the numbers follow it.
// ---------------------------------------------------------------------------

interface Score {
  onSubject: number;
  fright: number;
  vivid: number;
  original: number;
  craft: number;
  total: number;
}

function scoreOnSubject(candidate: Candidate): number {
  // Criterion 1: one sentence, on the subject.
  let score = 0.4;
  if (sentenceCount(candidate.text) === 1) score += 0.3;
  if (countDistinctPhrases(candidate.text, SUBJECT_MARKERS) >= 2) score += 0.15;
  const lower = candidate.text.toLowerCase();
  if (
    !lower.includes("judge") &&
    !lower.includes("entry") &&
    !lower.includes("make.fun") &&
    !lower.includes("contest")
  ) {
    score += 0.15; // the line is a story, not a note to the judge
  }
  return clamp01(score);
}

function scoreFright(candidate: Candidate): number {
  // Criterion 2: dread that outlasts the line, earned rather than announced.
  // A line with no dread marker and no impossible turn in its final clause
  // cannot frighten, however well written it is.
  const dread = countDistinctPhrases(candidate.text, DREAD_MARKERS);
  const turn = countDistinctPhrases(finalClauseOf(candidate.text), FINAL_CLAUSE_TURNS);
  let score = 0.2 + Math.min(dread, 4) * 0.12 + (turn > 0 ? 0.15 : 0);
  if (countDistinctPhrases(candidate.text, ANNOUNCED_FEAR) > 0) score -= 0.25;
  if (countDistinctWords(candidate.text, GORE) > 0) score -= 0.15;
  return clamp01(score);
}

function scoreVivid(candidate: Candidate): number {
  // Criterion 3: concrete images and specific detail a reader can see.
  const concrete = countDistinctWords(candidate.text, CONCRETE_NOUNS);
  let score = Math.min(concrete, 5) * 0.12;
  if (countDistinctWords(candidate.text, SPECIFIC_DETAIL) >= 2) score += 0.2;
  if (countDistinctWords(candidate.text, BODY_WORDS) >= 1) score += 0.2;
  return clamp01(score);
}

function scoreOriginal(candidate: Candidate): number {
  // Criterion 4: a turn or an image not met a hundred times before.
  // Starts clean; every cliche costs a third, gore costs a tenth.
  let score = 1.0;
  score -= countDistinctWords(candidate.text, CLICHES) * 0.35;
  score -= countDistinctWords(candidate.text, GORE) * 0.1;
  const lower = candidate.text.toLowerCase();
  if (lower.includes("in the mirror") || lower.includes("behind you")) score -= 0.2;
  return clamp01(score);
}

function scoreCraft(candidate: Candidate): number {
  // Criterion 5: tight, rhythm builds, the last word lands the blow.
  const len = candidate.text.length;
  let score = 0;
  if (len >= 120 && len <= 170) score += 0.4;
  else if (len >= 100 && len <= MAX_CHARS) score += 0.25;
  else score += 0.1;
  // The payoff sits in a short final clause: the sentence builds, then lands.
  if (finalClauseWordCount(candidate.text) <= 12) score += 0.3;
  if (STRONG_FINALS.includes(lastWordOf(candidate.text))) score += 0.3;
  return clamp01(score);
}

function scoreCandidate(candidate: Candidate): Score {
  const onSubject = scoreOnSubject(candidate);
  const fright = scoreFright(candidate);
  const vivid = scoreVivid(candidate);
  const original = scoreOriginal(candidate);
  const craft = scoreCraft(candidate);
  const total =
    onSubject * WEIGHTS.onSubject +
    fright * WEIGHTS.fright +
    vivid * WEIGHTS.vivid +
    original * WEIGHTS.original +
    craft * WEIGHTS.craft;
  return { onSubject, fright, vivid, original, craft, total };
}

// ---------------------------------------------------------------------------
// Ranking and the gate.
// ---------------------------------------------------------------------------

interface Ranked {
  candidate: Candidate;
  score: Score;
  index: number;
}

function rankCandidates(): Ranked[] {
  const ranked: Ranked[] = CANDIDATES.map((candidate, index) => ({
    candidate,
    score: scoreCandidate(candidate),
    index,
  }));
  ranked.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    if (a.candidate.text.length !== b.candidate.text.length) {
      return a.candidate.text.length - b.candidate.text.length;
    }
    return a.index - b.index; // earliest candidate wins a full tie
  });
  return ranked;
}

function gateCheck(text: string): string[] {
  const problems: string[] = [];
  if (text.length < MIN_CHARS || text.length > MAX_CHARS) {
    problems.push(`length ${text.length} outside ${MIN_CHARS}-${MAX_CHARS}`);
  }
  if (text.trim().length === 0) problems.push("only whitespace");
  if (text !== text.trim()) problems.push("leading or trailing whitespace");
  if (text.includes("\n") || text.includes("\r")) problems.push("more than one line");
  if (sentenceCount(text) !== 1) {
    problems.push(`expected 1 sentence, found ${sentenceCount(text)}`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Main: rank, gate, write, read back and verify byte-for-byte.
// ---------------------------------------------------------------------------

function main(): void {
  const ranked = rankCandidates();
  const winner = ranked[0];

  console.log("One Line, One Chill — candidate ranking (judge order weights)");
  console.log("---------------------------------------------------------------");
  for (const entry of ranked) {
    const s = entry.score;
    console.log(
      `${entry.candidate.id.padEnd(14)} total=${s.total.toFixed(3)} ` +
        `subj=${s.onSubject.toFixed(2)} fright=${s.fright.toFixed(2)} ` +
        `vivid=${s.vivid.toFixed(2)} orig=${s.original.toFixed(2)} ` +
        `craft=${s.craft.toFixed(2)} len=${entry.candidate.text.length}`,
    );
  }
  console.log("---------------------------------------------------------------");
  console.log(`Winner: ${winner.candidate.id} (${winner.candidate.text.length} chars)`);
  console.log(`> ${winner.candidate.text}`);

  const problems = gateCheck(winner.candidate.text);
  if (problems.length > 0) {
    throw new Error(`gate failed for winner ${winner.candidate.id}: ${problems.join("; ")}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, winner.candidate.text, "utf8");

  // Read back and verify byte-for-byte: what the judge reads is what we
  // scored, with no trailing newline and no extra whitespace.
  const readBack = readFileSync(OUTPUT_FILE, "utf8");
  if (readBack !== winner.candidate.text) {
    throw new Error("read-back mismatch: entry.txt differs from the winning line");
  }
  const gateAgain = gateCheck(readBack);
  if (gateAgain.length > 0) {
    throw new Error(`gate failed on read-back: ${gateAgain.join("; ")}`);
  }
  console.log(`Wrote ${OUTPUT_FILE} (${readBack.length} characters, no trailing newline)`);
}

main();
