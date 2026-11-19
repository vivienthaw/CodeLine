import { CLASSMATES, CURRENT_STUDENT } from "../../mock/data";
import { PROBLEM } from "../../mock/problem";

/**
 * Staff reports — mock data for one class: 40 students, 10 sessions over 5 weeks
 * (individual + team), a few absences/auto-fills and 3 struggling students.
 * Everything is simulated per student, per round from a fixed seed, so every chart
 * and table is derived from the same records and agrees with the others.
 */

export type Topic = "Loops" | "Arrays" | "Strings" | "Conditions";
export const TOPICS: Topic[] = ["Loops", "Arrays", "Strings", "Conditions"];
export type RoundKind = "codeline" | "mc" | "tf" | "match" | "fill";
export const KIND_LABEL: Record<RoundKind, string> = {
  codeline: "CodeLine",
  mc: "Quiz",
  tf: "True/False",
  match: "Matching",
  fill: "Fill-blank",
};
export type Attendance = "joined" | "absent" | "autofilled";

export const CLASS = { id: "cosc1076-a", name: "COSC1076 · Group A", term: "Semester 2, 2026" };

/* ---------------- content ---------------- */

type Line = { pseudo: string; indent: number; java: string };

const PROBLEMS: Record<Topic, { title: string; lines: Line[] }> = {
  Loops: {
    title: PROBLEM.title,
    lines: PROBLEM.lines.map((l) => ({ pseudo: l.pseudo.trim(), indent: Math.floor((l.pseudo.length - l.pseudo.trimStart().length) / 4), java: l.java })),
  },
  Arrays: {
    title: "Average of an array",
    lines: [
      { pseudo: "SET total TO 0", indent: 0, java: "int total = 0;" },
      { pseudo: "FOR EACH value IN nums", indent: 0, java: "for (int value : nums) {" },
      { pseudo: "ADD value TO total", indent: 1, java: "total += value;" },
      { pseudo: "END FOR", indent: 0, java: "}" },
      { pseudo: "SET avg TO total / LENGTH", indent: 0, java: "double avg = (double) total / nums.length;" },
      { pseudo: "PRINT avg", indent: 0, java: "System.out.println(avg);" },
    ],
  },
  Strings: {
    title: "Count the vowels",
    lines: [
      { pseudo: "SET count TO 0", indent: 0, java: "int count = 0;" },
      { pseudo: "FOR EACH ch IN word", indent: 0, java: "for (char ch : word.toCharArray()) {" },
      { pseudo: "IF ch IS A VOWEL", indent: 1, java: 'if ("aeiou".indexOf(ch) >= 0) {' },
      { pseudo: "ADD 1 TO count", indent: 2, java: "count++;" },
      { pseudo: "END IF", indent: 1, java: "}" },
      { pseudo: "END FOR", indent: 0, java: "}" },
      { pseudo: "PRINT count", indent: 0, java: "System.out.println(count);" },
    ],
  },
  Conditions: {
    title: "Mark to grade",
    lines: [
      { pseudo: "READ mark", indent: 0, java: "int mark = sc.nextInt();" },
      { pseudo: "IF mark >= 80", indent: 0, java: "if (mark >= 80) {" },
      { pseudo: 'PRINT "HD"', indent: 1, java: 'System.out.println("HD");' },
      { pseudo: "ELSE IF mark >= 50", indent: 0, java: "} else if (mark >= 50) {" },
      { pseudo: 'PRINT "Pass"', indent: 1, java: 'System.out.println("Pass");' },
      { pseudo: "ELSE", indent: 0, java: "} else {" },
      { pseudo: 'PRINT "Fail"', indent: 1, java: 'System.out.println("Fail");' },
      { pseudo: "END IF", indent: 0, java: "}" },
    ],
  },
};

type Q = { kind: Exclude<RoundKind, "codeline">; prompt: string; correct: string; wrongs: string[] };
const q = (kind: Q["kind"], prompt: string, correct: string, ...wrongs: string[]): Q => ({ kind, prompt, correct, wrongs });

const BANK: Record<Topic, Q[]> = {
  Loops: [
    q("mc", "What does for (int i = 1; i <= 4; i++) sum += i; leave in sum?", "10", "4", "6", "15"),
    q("mc", "How many times does for (int i = 0; i < 5; i++) run?", "5", "4", "6", "Forever"),
    q("mc", "Which loop always runs its body at least once?", "do-while", "while", "for", "for-each"),
    q("mc", "What does i -= 3 do?", "Subtracts 3 from i", "Sets i to -3", "Compares i to 3", "Nothing"),
    q("tf", "for (int i = 0; i <= 5; i++) runs exactly 5 times.", "False", "True"),
    q("tf", "A while loop can run zero times.", "True", "False"),
    q("tf", "break skips to the next iteration.", "False", "True"),
    q("fill", "for (int i = 0; i ___ n; i++) visits 0..n-1", "<", "<=", ">", "!="),
    q("fill", "Add 1 to count: count___;", "++", "+", "+= ", "=+1"),
    q("fill", "Even test: if (i ___ 2 == 0)", "%", "/", "&", "=="),
  ],
  Arrays: [
    q("mc", "What is the index of the first element?", "0", "1", "-1", "It depends"),
    q("mc", "int[] a = {4, 8, 15}; a.length is", "3", "2", "15", "4"),
    q("mc", "What does a new int[3] contain?", "0, 0, 0", "null, null, null", "Random values", "Nothing"),
    q("match", "Match: a[0] → first element, a.length → size, a[a.length-1] → last", "All three correct", "a.length → last element", "a[0] → size", "a[a.length-1] → first"),
    q("match", "Match: int[] → numbers, String[] → words, boolean[] → flags", "All three correct", "String[] → numbers", "boolean[] → words", "int[] → flags"),
    q("match", "Match: for-each → read every value, for → use the index, while → unknown count", "All three correct", "for-each → use the index", "while → read every value", "for → unknown count"),
    q("tf", "a[a.length] is the last element.", "False", "True"),
    q("tf", "Arrays can change length after creation.", "False", "True"),
    q("tf", "A for-each loop gives you each value, not its index.", "True", "False"),
  ],
  Strings: [
    q("fill", 'Length of a String s: s.___()', "length", "size", "count", "len"),
    q("fill", "First char of s: s.___(0)", "charAt", "get", "at", "substring"),
    q("fill", 'Compare text: a.___(b)', "equals", "==", "compare", "same"),
    q("match", "Match: toUpperCase → CAPITALS, trim → no edge spaces, indexOf → position", "All three correct", "trim → CAPITALS", "indexOf → no edge spaces", "toUpperCase → position"),
    q("match", "Match: substring → part, charAt → one char, length → size", "All three correct", "charAt → part", "length → one char", "substring → size"),
    q("match", "Match: '' → char, \"\" → String, + → join", "All three correct", "'' → String", "+ → char", '"" → join'),
    q("mc", '"cat".indexOf("t") returns', "2", "3", "1", "-1"),
    q("mc", 'Which compares two Strings\' text?', "a.equals(b)", "a == b", "a = b", "a.compare(b)"),
    q("mc", '"Hi".length() is', "2", "1", "3", "0"),
  ],
  Conditions: [
    q("tf", "else always needs its own condition.", "False", "True"),
    q("tf", "&& is true only when both sides are true.", "True", "False"),
    q("tf", "if (x = 5) compares x with 5.", "False", "True"),
    q("mc", "mark = 65: which branch runs in the grade program?", "Pass", "HD", "Fail", "None"),
    q("mc", "!(a && b) is the same as", "!a || !b", "!a && !b", "a || b", "a && !b"),
    q("mc", "Which operator means 'or'?", "||", "&&", "|", "or"),
    q("fill", "Not equal: if (a ___ b)", "!=", "<>", "=!", "~="),
    q("fill", "Both true: if (x > 0 ___ y > 0)", "&&", "&", "and", "||"),
    q("fill", "Otherwise branch: } ___ {", "else", "elif", "otherwise", "then"),
  ],
};

/* ---------------- sessions ---------------- */

type Spec = { title: string; topic: Topic; kinds: RoundKind[]; play: "individual" | "team"; squads?: number };

const SPECS: Spec[] = [
  { title: "Loops warm-up", topic: "Loops", kinds: ["codeline", "mc"], play: "individual" },
  { title: "Counting loops", topic: "Loops", kinds: ["tf", "fill"], play: "individual" },
  { title: "Arrays intro", topic: "Arrays", kinds: ["codeline", "mc"], play: "team" },
  { title: "Array indexing", topic: "Arrays", kinds: ["match", "tf"], play: "individual" },
  { title: "Strings basics", topic: "Strings", kinds: ["codeline", "fill"], play: "individual", squads: 2 },
  { title: "String methods", topic: "Strings", kinds: ["match", "mc"], play: "team" },
  { title: "If / else", topic: "Conditions", kinds: ["codeline", "tf"], play: "individual" },
  { title: "Nested conditions", topic: "Conditions", kinds: ["mc", "fill"], play: "team" },
  { title: "Loops & arrays", topic: "Loops", kinds: ["codeline", "mc"], play: "individual", squads: 2 },
  { title: "Review battle", topic: "Arrays", kinds: ["codeline", "match"], play: "team" },
];
/** Two sessions a week for five weeks (Mon/Thu), oldest first. */
const DAYS_AGO = [34, 31, 27, 24, 20, 17, 13, 10, 6, 3];

const TEAM_NAMES = ["Stack Overflowers", "The Semicolons", "Null Pointers", "Bit Flippers", "Loop de Loops", "Off By One", "Hello Worlds", "Recursion Rangers", "Syntax Terrors", "Big O's"];

export type Student = { id: string; name: string; email: string; skill: number; struggling: boolean };
export type Attempt = { at: number; step: number; ok: boolean; points: number; speed?: number };

export type RoundResult = {
  kind: RoundKind;
  score: number;
  correct: number;
  attempted: number;
  wrong: number;
  /** CodeLine: seconds to place your line (null if auto-filled) */
  lineSec: number | null;
  /** CodeLine: your line and how you got there */
  line?: number;
  attempts?: Attempt[];
  autofilled?: boolean;
};

export type StudentSession = {
  studentId: string;
  attendance: Attendance;
  team?: string;
  rounds: RoundResult[];
  /** finished practice runs at home — not scored */
  practised: number;
};

export type QuestionStat = { n: number; kind: Q["kind"]; prompt: string; correct: string; pctCorrect: number; topWrong: { label: string; share: number } | null };

export type RoundInfo = {
  n: number;
  kind: RoundKind;
  timerSec: number;
  /** CodeLine */
  title?: string;
  lines?: Line[];
  /** wrong drops: confusion[droppedOnStep][snippetStep] (0-based) */
  confusion?: number[][];
  boards?: number;
  completionSec?: number;
  /** quiz */
  questions?: QuestionStat[];
};

export type Session = {
  id: string;
  n: number;
  title: string;
  date: string; // ISO local
  topic: Topic;
  code: string;
  play: "individual" | "team";
  kinds: RoundKind[];
  squads: number;
  rounds: RoundInfo[];
  results: StudentSession[];
};

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function isoDaysAgo(days: number, hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - days);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
}

/** Some topics are simply harder for this class — gives the topic chart something to say. */
const TOPIC_EASE: Record<Topic, number> = { Loops: 1.02, Arrays: 0.95, Strings: 0.84, Conditions: 0.9 };

const STRUGGLING = new Set(["Noah Wilson", "Rosa Garcia", "Ella Novak"]);

function buildStudents(): Student[] {
  const rnd = seeded(7);
  const names = [CURRENT_STUDENT.name, ...CLASSMATES].slice(0, 40);
  return names.map((name, i) => {
    const struggling = STRUGGLING.has(name);
    const id = i === 0 ? CURRENT_STUDENT.studentId : `661305${String(10000 + Math.floor(rnd() * 89999))}`;
    return {
      id,
      name,
      // SIT student mail is <student ID>@ad.sit.kmutt.ac.th
      email: `${id}@ad.sit.kmutt.ac.th`,
      // Vivi (the demo student) is a solid mid-table player, matching their own Rank page (#7 of 40)
      skill: i === 0 ? (rnd(), 1.02) : struggling ? 0.3 + rnd() * 0.04 : 0.8 + rnd() * 0.32,
      struggling,
    };
  });
}

function buildSessions(students: Student[]): Session[] {
  const rnd = seeded(2026);
  // a few fixed absences make the "2+ absences" rule demonstrable
  const absentFor: Record<string, number[]> = { "Noah Wilson": [2, 5, 8], "Lina Haddad": [3, 7], "Rosa Garcia": [6] };

  return SPECS.map((spec, si) => {
    const id = `s${si + 1}-${spec.title.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "")}`;
    const squads = spec.squads ?? 1;

    // who came
    const attendance = students.map((st): Attendance => {
      if (absentFor[st.name]?.includes(si)) return "absent";
      const r = rnd();
      return r < 0.03 ? "absent" : r < 0.06 ? "autofilled" : "joined";
    });

    // teams of 4 (team sessions) — a team's result is shared by its members
    const teamOf = new Map<string, string>();
    if (spec.play === "team") {
      const order = students.map((s) => s.id).sort(() => rnd() - 0.5);
      order.forEach((sid, k) => teamOf.set(sid, TEAM_NAMES[Math.floor(k / 4) % TEAM_NAMES.length]!));
    }
    const teamSkill = new Map<string, number>();
    if (spec.play === "team") {
      for (const name of TEAM_NAMES) {
        const members = students.filter((s) => teamOf.get(s.id) === name);
        teamSkill.set(name, members.reduce((a, s) => a + s.skill, 0) / Math.max(1, members.length) + 0.05);
      }
    }

    const results: StudentSession[] = students.map((st, k) => ({
      studentId: st.id,
      attendance: attendance[k]!,
      team: teamOf.get(st.id),
      rounds: [],
      practised: attendance[k] === "absent" ? 0 : Math.floor(rnd() * (st.struggling ? 2 : 4.5)),
    }));

    const rounds: RoundInfo[] = spec.kinds.map((kind, ri) => {
      if (kind === "codeline") {
        const prob = PROBLEMS[spec.topic];
        const L = prob.lines.length;
        const confusion = prob.lines.map(() => prob.lines.map(() => 0));
        const ease = prob.lines.map((_, i) => (i === Math.floor(L / 2) || i === L - 2 ? 0.45 : 0.75 + rnd() * 0.2)); // a couple of hard steps
        const teamDone = new Map<string, RoundResult>();
        let slowest = 0;
        students.forEach((st, k) => {
          const res = results[k]!;
          if (res.attendance === "absent") return;
          const team = res.team;
          if (team && teamDone.has(team)) return void res.rounds.push({ ...teamDone.get(team)! });
          const line = (k % L) + 1;
          if (res.attendance === "autofilled") {
            const wrongStep = ((line + (rnd() < 0.5 ? 0 : L - 2)) % L) + 1;
            confusion[wrongStep - 1]![line - 1]! += 1;
            res.rounds.push({ kind, score: -10, correct: 0, attempted: 1, wrong: 1, lineSec: null, line, autofilled: true, attempts: [{ at: 120, step: wrongStep, ok: false, points: -10 }] });
            return;
          }
          const skill = (team ? teamSkill.get(team)! : st.skill) * TOPIC_EASE[spec.topic];
          const p = clamp(ease[line - 1]! * skill, 0.05, 0.97);
          const attempts: Attempt[] = [];
          let at = 15 + Math.round((1 - p) * 40 + rnd() * 20);
          if (rnd() > p) {
            const tries = 1 + Math.floor(rnd() * (st.struggling ? 3 : 2));
            for (let t = 0; t < tries; t++) {
              // usually a neighbouring step
              const off = rnd() < 0.7 ? (rnd() < 0.5 ? -1 : 1) : rnd() < 0.5 ? -2 : 2;
              const cand = line + off;
              const step = cand < 1 || cand > L ? (line === 1 ? 2 : line - 1) : cand;
              confusion[step - 1]![line - 1]! += 1;
              attempts.push({ at, step, ok: false, points: -10 });
              at += 12 + Math.round(rnd() * 25);
            }
          }
          const speed = Math.round(50 * clamp(1 - at / 240, 0, 1));
          attempts.push({ at, step: line, ok: true, points: 100, speed });
          slowest = Math.max(slowest, at);
          const wrong = attempts.length - 1;
          const r: RoundResult = { kind, score: 100 + speed - 10 * wrong, correct: wrong ? 0 : 1, attempted: 1, wrong, lineSec: at, line, attempts };
          res.rounds.push(r);
          if (team) teamDone.set(team, r);
        });
        return { n: ri + 1, kind, timerSec: 300, title: prob.title, lines: prob.lines, confusion, boards: squads, completionSec: Math.min(300, slowest + 8) };
      }

      // quiz round: 3 questions of this kind from the topic's bank
      const pool = BANK[spec.topic].filter((x) => x.kind === kind);
      const qs = pool.slice(0, 3);
      const stats = qs.map(() => ({ right: 0, answered: 0, wrong: new Map<string, number>() }));
      const ease = qs.map((_, i) => (i === 1 ? 0.55 : 0.8 + rnd() * 0.15));
      const teamDone = new Map<string, RoundResult>();
      students.forEach((st, k) => {
        const res = results[k]!;
        if (res.attendance === "absent") return;
        const team = res.team;
        if (team && teamDone.has(team)) return void res.rounds.push({ ...teamDone.get(team)! });
        const skill = (team ? teamSkill.get(team)! : st.skill) * TOPIC_EASE[spec.topic];
        let score = 0;
        let right = 0;
        qs.forEach((qq, i) => {
          const ok = rnd() < clamp(ease[i]! * skill, 0.05, 0.97);
          stats[i]!.answered += 1;
          if (ok) {
            right += 1;
            stats[i]!.right += 1;
            score += 100 + Math.round(rnd() * 50);
          } else {
            // the first wrong option is the usual trap
            const w = qq.wrongs[rnd() < 0.6 ? 0 : Math.floor(rnd() * qq.wrongs.length)]!;
            stats[i]!.wrong.set(w, (stats[i]!.wrong.get(w) ?? 0) + 1);
          }
        });
        const r: RoundResult = { kind, score, correct: right, attempted: qs.length, wrong: qs.length - right, lineSec: null };
        res.rounds.push(r);
        if (team) teamDone.set(team, r);
      });
      const questions: QuestionStat[] = qs.map((qq, i) => {
        const s = stats[i]!;
        const top = [...s.wrong].sort((a, b) => b[1] - a[1])[0];
        return {
          n: i + 1,
          kind: qq.kind,
          prompt: qq.prompt,
          correct: qq.correct,
          pctCorrect: s.answered ? s.right / s.answered : 0,
          topWrong: top ? { label: top[0], share: top[1] / Math.max(1, s.answered - s.right) } : null,
        };
      });
      return { n: ri + 1, kind, timerSec: qs.length * 30, questions, completionSec: qs.length * 30 };
    });

    return {
      id,
      n: si + 1,
      title: `Week ${Math.floor(si / 2) + 1} — ${spec.title}`,
      date: isoDaysAgo(DAYS_AGO[si]!, si % 2 ? 14 : 10),
      topic: spec.topic,
      code: Array.from({ length: 6 }, () => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(rnd() * 31)]).join(""),
      play: spec.play,
      kinds: spec.kinds,
      squads,
      rounds,
      results,
    };
  });
}

export const STUDENTS = buildStudents();
export const SESSIONS = buildSessions(STUDENTS);
/** Noah Wilson — struggling, with 3 absences; the dev panel opens his report. */
export const DEMO_STUDENT_ID = STUDENTS.find((s) => s.name === "Noah Wilson")!.id;
/* Report data accessors (mock data). */
export function getStudents() {
  return STUDENTS;
}
export function getReportSessions() {
  return SESSIONS;
}
export function getStudent(id: string) {
  return STUDENTS.find((s) => s.id === id);
}
export function getSession(id: string) {
  return SESSIONS.find((s) => s.id === id);
}
