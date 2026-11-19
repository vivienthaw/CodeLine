import { PROBLEM } from "./problem";

/** Answers and explanations for the CodeLine round (mock data; the mockup always shows them on Results). */
export function getRoundAnswers(_kind: "codeline" | "quiz") {
  return { title: PROBLEM.title, lines: PROBLEM.lines };
}
