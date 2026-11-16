import { useEffect, useMemo, useState } from "react";

type Screen = "signin" | "lobby" | "activity" | "results" | "quiz" | "final" | "projector";

const NAVY = "#1B365D";

const Icon = ({
  name,
  size = 18,
}: {
  name:
    | "arrow"
    | "clock"
    | "users"
    | "check"
    | "lock"
    | "play"
    | "monitor"
    | "chevron"
    | "spark"
    | "code";
  size?: number;
}) => {
  const paths = {
    arrow: (
      <>
        <path d="M5 12h14M14 6l6 6-6 6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    users: (
      <>
        <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8M22 20v-2a4 4 0 0 0-3-3.87M16 2.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7Z" />,
    monitor: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
    chevron: <path d="m7 10 5 5 5-5" />,
    spark: (
      <>
        <path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8Z" />
        <path d="m19 15 .7 2.3L22 18.5l-2.3 1.2L19 22l-.7-2.3-2.3-1.2 2.3-1.2Z" />
      </>
    ),
    code: (
      <>
        <path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
};

function Professor({
  mood = "angry",
  large = false,
}: {
  mood?: "angry" | "hurt" | "defeated";
  large?: boolean;
}) {
  return (
    <svg
      className={`professor ${large ? "professor-large" : ""} ${mood}`}
      viewBox="0 0 260 205"
      role="img"
      aria-label={`Doodle professor, ${mood}`}
    >
      <g
        className="doodle-lines"
        fill="none"
        stroke={NAVY}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M94 57c-13 4-24 17-23 33 1 19 17 33 36 33 19 0 35-15 35-34 0-16-10-29-25-33" />
        <path d="M83 57c2-15 13-29 29-33M104 56c6-18 20-25 31-25-1 11-6 19-13 25M98 54c-9-10-19-13-27-10 4 9 10 14 17 17" />
        <path d="M84 79l14-5M125 79l-14-5" className="brows" />
        <circle cx="94" cy="86" r="2" fill={NAVY} />
        <circle cx="119" cy="86" r="2" fill={NAVY} />
        {mood === "defeated" ? (
          <>
            <path d="m89 82 8 8m0-8-8 8m21-8 8 8m0-8-8 8" />
            <path d="M92 106c9-7 20-7 29 0" />
          </>
        ) : (
          <path d="M92 105c10-8 20-8 30 0" />
        )}
        <path d="M100 91c1 4 0 7-3 9h9" />
        <path d="M87 126c-8 7-14 25-14 45M130 126c9 9 13 26 11 45M73 170c20 10 47 10 68 1" />
        <path d="M91 127l16 16 18-17M107 143v29" />
        <path d="M77 140c-16 7-26 18-34 32M137 139c15 4 25 12 34 23" />
        <path d="M43 172l-8 19M171 162l47 24M214 177l7 13M218 186l11-7" className="pointer" />
        <path d="M89 178l-6 22M124 178l8 22" />
      </g>
      {mood === "hurt" && (
        <g className="impact" fill="#F28C28">
          <path d="m184 48 8 15 15-8-9 14 15 7-17 1 3 17-10-14-12 13 5-17-17-2 16-6-8-14 13 10Z" />
          <text x="159" y="38" fontSize="20" fontWeight="800" fill="#E5484D">
            -500
          </text>
        </g>
      )}
      {mood === "defeated" && (
        <path
          d="M50 194c43 8 91 8 135 0"
          fill="none"
          stroke="#F28C28"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="8 10"
        />
      )}
    </svg>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">&lt;/&gt;</span>
      <span>
        Code<span>Line</span>
      </span>
    </div>
  );
}

function Topbar({ right, onBrand }: { right?: React.ReactNode; onBrand?: () => void }) {
  return (
    <header className="topbar">
      <button className="brand-button" onClick={onBrand}>
        <Brand />
      </button>
      {right}
    </header>
  );
}

function HpBar({ hp, big = false }: { hp: number; big?: boolean }) {
  const level = hp <= 0 ? "defeated" : hp <= 30 ? "low" : "healthy";
  return (
    <div className={`hp-wrap ${big ? "big" : ""}`}>
      <div className="hp-label">
        <span>PROFESSOR HP</span>
        <strong>{hp <= 0 ? "DEFEATED" : `${hp.toLocaleString()} / 10,000`}</strong>
      </div>
      <div className="hp-track">
        <div className={`hp-fill ${level}`} style={{ width: `${Math.max(0, hp / 100)}%` }} />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

const students = [
  "AM",
  "JR",
  "SK",
  "LO",
  "NH",
  "DP",
  "MT",
  "AK",
  "GS",
  "EC",
  "RJ",
  "YN",
  "PV",
  "CA",
  "MR",
  "JL",
];
const avatarColors = ["orange", "blue", "green", "plum"];

function SignIn({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || !email.includes("."))
      return setError("Enter your university email address.");
    setError("");
    setStage("code");
  };
  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.replace(/\s/g, "").length !== 6)
      return setError("That class code isn’t valid. Check the 6 characters and try again.");
    setError("");
    onDone();
  };
  return (
    <main className="auth-page">
      <Topbar
        right={
          <div className="campus-pill">
            <span /> Campus network connected
          </div>
        }
      />
      <section className="auth-shell">
        <div className="auth-art">
          <div className="challenge-tag">TODAY’S CHALLENGE</div>
          <h1>
            The Class <em>vs</em>
            <br />
            The Professor
          </h1>
          <p>
            Match the Java. Build the program.
            <br />
            Defeat your professor.
          </p>
          <div className="hero-code hero-code-one">
            <span>01</span>
            <code>for (Student s : class) &#123;</code>
          </div>
          <div className="hero-code hero-code-two">
            <Icon name="check" size={15} />
            <code>scores.add(score);</code>
          </div>
          <div className="hero-prof">
            <div className="professor-spot" />
            <Professor />
            <div className="hero-hp">
              <HpBar hp={68} />
            </div>
          </div>
          <div className="doodle-arrow">
            Join in! <span>↗</span>
          </div>
        </div>
        <div className={`auth-card auth-card-${stage}`}>
          <div className="auth-card-accent" />
          <div className="step-count">STEP {stage === "email" ? "1" : "2"} OF 2</div>
          {stage === "email" ? (
            <>
              <div className="auth-icon">@</div>
              <h2>
                Sign in with
                <br />
                student email
              </h2>
              <p>Use your university email to join your class session.</p>
              <form onSubmit={submitEmail}>
                <label>STUDENT EMAIL</label>
                <input
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                />
                {error && <div className="form-error">{error}</div>}
                <button className="primary-button" type="submit">
                  Continue <Icon name="arrow" />
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                className="back-link"
                onClick={() => {
                  setStage("email");
                  setError("");
                }}
              >
                ← Back
              </button>
              <div className="auth-icon code-icon">#</div>
              <h2>Enter class code</h2>
              <p>Your lecturer will show this 6-character code on the projector.</p>
              <form onSubmit={submitCode}>
                <label>CLASS CODE</label>
                <input
                  autoFocus
                  className="class-input"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="A7K2M9"
                />
                {error && <div className="form-error">{error}</div>}
                <button className="primary-button" type="submit">
                  Join class <Icon name="arrow" />
                </button>
              </form>
              <div className="network-note">
                <span /> On campus network &nbsp;·&nbsp; CS-201
              </div>
            </>
          )}
          <div className="privacy">
            <Icon name="lock" size={14} /> Your answers are visible to your lecturer
          </div>
        </div>
      </section>
    </main>
  );
}

function Lobby({ onStart }: { onStart: () => void }) {
  return (
    <main className="page">
      <Topbar
        right={
          <div className="user-chip">
            <span>AM</span> alex.morgan@uni.edu
          </div>
        }
      />
      <div className="lobby-wrap">
        <div className="session-banner">
          <div>
            <span>CS 201 · DATA STRUCTURES</span>
            <h1>The Class vs The Professor</h1>
          </div>
          <div className="session-code">
            <small>CLASS CODE</small>
            <strong>A7K2M9</strong>
          </div>
        </div>
        <div className="lobby-grid">
          <section className="card roster-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">YOUR CLASS</span>
                <h2>Students joined</h2>
              </div>
              <div className="count">
                <strong>34</strong> / 40
              </div>
            </div>
            <div className="roster-grid">
              {students.map((s, i) => (
                <div className="student" key={s}>
                  <span className={`avatar ${avatarColors[i % 4]}`}>{s}</span>
                  <small>
                    {
                      [
                        "Alex M.",
                        "Jules R.",
                        "Sam K.",
                        "Liv O.",
                        "Noah H.",
                        "Dana P.",
                        "Mina T.",
                        "Ari K.",
                        "Gia S.",
                        "Eli C.",
                        "Rui J.",
                        "Yara N.",
                        "Pia V.",
                        "Cam A.",
                        "Mo R.",
                        "Jae L.",
                      ][i]
                    }
                  </small>
                  {i < 7 && <i />}
                </div>
              ))}
            </div>
            <div className="roster-more">+ 18 more classmates joined</div>
          </section>
          <aside className="lobby-side">
            <div className="card mode-card">
              <div className="mode-icon">
                <Icon name="users" size={24} />
              </div>
              <div>
                <span className="eyebrow">PLAY MODE</span>
                <h3>Individual</h3>
                <p>Your score, your code.</p>
              </div>
              <span className="live-badge">LIVE</span>
            </div>
            <div className="card rounds-card">
              <span className="eyebrow">TODAY’S ROUNDS</span>
              {[
                ["01", "CodeLine", "Match Java to pseudocode", "active"],
                ["02", "Quick quiz", "4 questions", ""],
                ["03", "Results", "Class leaderboard", "locked"],
              ].map((r) => (
                <div className={`round ${r[3]}`} key={r[0]}>
                  <span>{r[0]}</span>
                  <div>
                    <strong>{r[1]}</strong>
                    <small>{r[2]}</small>
                  </div>
                  {r[3] === "active" ? (
                    <div className="orange-dot" />
                  ) : (
                    <Icon name="lock" size={16} />
                  )}
                </div>
              ))}
            </div>
            <button className="waiting-button" onClick={onStart}>
              <span className="pulse" /> Enter activity <Icon name="arrow" />
            </button>
            <p className="waiting-copy">Lecturer is about to begin</p>
          </aside>
        </div>
      </div>
    </main>
  );
}

const rows = [
  {
    pseudo: "Create a new empty list called scores",
    code: "List<Integer> scores = new ArrayList<>();",
    state: "correct",
  },
  {
    pseudo: "Repeat for every student in the class",
    code: "for (Student student : classList) {",
    state: "correct",
  },
  {
    pseudo: "Get the student’s latest score",
    code: "int score = student.getLatestScore();",
    state: "empty",
  },
  { pseudo: "If the score is greater than 70", code: "if (score > 70) {", state: "empty" },
  { pseudo: "Add the score to the list", code: "scores.add(score);", state: "empty" },
  { pseudo: "Close the condition", code: "}", state: "auto" },
];

function Activity({ onDone, onProjector }: { onDone: () => void; onProjector: () => void }) {
  const [matched, setMatched] = useState<number[]>([0, 1]);
  const [selected, setSelected] = useState(2);
  const [wrong, setWrong] = useState<number | null>(null);
  const [toast, setToast] = useState<"good" | "bad" | null>(null);
  const [hp, setHp] = useState(7200);
  const [score, setScore] = useState(1240);
  const [seconds, setSeconds] = useState(104);
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = useMemo(
    () => rows.map((_, i) => i).filter((i) => !matched.includes(i) && rows[i].state !== "auto"),
    [matched],
  );
  const drop = (i: number) => {
    if (matched.includes(i) || rows[i].state === "auto" || selected === -1) return;
    if (i === selected) {
      setMatched((m) => [...m, i]);
      setHp((h) => Math.max(0, h - 500));
      setScore((s) => s + 135);
      setToast("good");
      setWrong(null);
      const next = remaining.find((n) => n !== i);
      setSelected(next ?? -1);
      window.setTimeout(() => setToast(null), 1800);
    } else {
      setWrong(i);
      setScore((s) => Math.max(0, s - 10));
      setToast("bad");
      window.setTimeout(() => {
        setWrong(null);
        setToast(null);
      }, 900);
    }
  };
  return (
    <main className="game-page">
      <Topbar
        right={
          <div className="game-stats">
            <button onClick={onProjector}>
              <Icon name="monitor" /> Projector
            </button>
            <span>
              <Icon name="clock" />{" "}
              <b>
                {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
              </b>
            </span>
            <span>
              SCORE <b>{score.toLocaleString()}</b>
            </span>
            <span>
              PROGRESS <b>{9 + matched.length}/20 lines</b>
            </span>
          </div>
        }
      />
      <div className="game-layout">
        <aside className="game-left">
          <div className="boss-card card">
            <div className="boss-title">
              <div>
                <span className="eyebrow">BOSS BATTLE</span>
                <h2>Professor Syntax</h2>
              </div>
              <span className="level">LV. 10</span>
            </div>
            <Professor mood={toast === "good" ? "hurt" : "angry"} />
            <HpBar hp={hp} />
            <p>
              Correct matches deal <strong>500 damage</strong>
            </p>
          </div>
          <div className="clipped card">
            <div className="clipped-head">
              <div>
                <span className="eyebrow">YOUR CLIPPED CODE</span>
                <h3>Pick up a line</h3>
              </div>
              <span>{remaining.length}</span>
            </div>
            <p className="hint">Tap a chip, then its matching pseudocode.</p>
            <div className="chips">
              {remaining.map((i) => (
                <button
                  key={i}
                  className={`code-chip ${selected === i ? "selected" : ""}`}
                  onClick={() => setSelected(i)}
                >
                  <span className="grip">⠿</span>
                  <code>{rows[i].code}</code>
                </button>
              ))}
              {remaining.length === 0 && (
                <div className="all-matched">
                  <Icon name="check" /> All lines matched!
                </div>
              )}
            </div>
          </div>
        </aside>
        <section className="problem card">
          <div className="problem-head">
            <div>
              <span className="eyebrow">ROUND 1 · CODELINE</span>
              <h1>Build the honour roll</h1>
              <p>Match each Java line to the pseudocode step it performs.</p>
            </div>
            <div className="problem-count">
              <strong>{matched.length}</strong>
              <span>/ 5 matched</span>
            </div>
          </div>
          <div className="column-head">
            <span>PSEUDOCODE</span>
            <span>JAVA CODE</span>
          </div>
          <div className="match-list">
            {rows.map((row, i) => (
              <div className={`match-row ${wrong === i ? "wrong" : ""}`} key={row.pseudo}>
                <div className="pseudo">
                  <span>{i + 1}</span>
                  <p>{row.pseudo}</p>
                </div>
                <div className="connector">
                  <i />
                  <b>→</b>
                </div>
                {row.state === "auto" ? (
                  <div className="drop-slot auto">
                    <Icon name="lock" size={15} />
                    <code>{row.code}</code>
                    <small>Auto-filled (absent)</small>
                  </div>
                ) : matched.includes(i) ? (
                  <div className="drop-slot correct">
                    <Icon name="check" />
                    <code>{row.code}</code>
                    <strong>+100</strong>
                  </div>
                ) : (
                  <button className="drop-slot empty" onClick={() => drop(i)}>
                    <span>Drop Java line here</span>
                    <small>or tap to place selected</small>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="problem-footer">
            <div>
              <span className="key">↵</span> Tap or drag to match
            </div>
            <button onClick={onDone} disabled={remaining.length > 0}>
              {remaining.length ? `${remaining.length} lines remaining` : "Finish round"}{" "}
              <Icon name="arrow" />
            </button>
          </div>
        </section>
      </div>
      {toast && (
        <div className={`toast ${toast}`}>
          <span>{toast === "good" ? <Icon name="spark" /> : "!"}</span>
          <div>
            <strong>
              {toast === "good" ? "+100 points · +35 speed bonus" : "-10 pts, try again"}
            </strong>
            <small>
              {toast === "good"
                ? "Great match! Professor took 500 damage."
                : "That line belongs somewhere else."}
            </small>
          </div>
        </div>
      )}
    </main>
  );
}

function Projector({ onBack }: { onBack: () => void }) {
  return (
    <main className="projector">
      <div className="projector-banner">
        <Brand />
        <strong>
          THE CLASS <em>VS</em> PROFESSOR
        </strong>
        <div className="projector-timer">
          <Icon name="clock" size={28} /> 01:42
        </div>
      </div>
      <section className="projector-boss">
        <div className="class-status">
          <span>34 STUDENTS PLAYING</span>
          <h1>Keep going, class!</h1>
          <p>Every correct line deals damage.</p>
        </div>
        <Professor mood="hurt" large />
        <div className="projector-hp">
          <HpBar hp={2800} big />
          <span>LOW HP!</span>
        </div>
      </section>
      <section className="projector-board">
        <div className="board-head">
          <div>
            <span>LIVE CODELINE</span>
            <h2>Build the honour roll</h2>
          </div>
          <strong>
            12 <small>/ 20 LINES</small>
          </strong>
        </div>
        <div className="board-lines">
          {rows.slice(0, 5).map((r, i) => (
            <div key={r.pseudo} className={i < 3 ? "filled" : ""}>
              <span>{i + 1}</span>
              <p>{r.pseudo}</p>
              <code>{i < 3 ? r.code : "Waiting for class…"}</code>
              {i < 3 && <Icon name="check" />}
            </div>
          ))}
        </div>
      </section>
      <button className="exit-projector" onClick={onBack}>
        Exit projector view
      </button>
    </main>
  );
}

const answers = [
  "It sorts the list from highest to lowest",
  "It removes scores below 70",
  "It adds passing scores to a new list",
  "It calculates the class average",
];

function Quiz({ onDone }: { onDone: () => void }) {
  const [answer, setAnswer] = useState<number | null>(null);
  return (
    <main className="page quiz-page">
      <Topbar
        right={
          <div className="game-stats">
            <span>
              <Icon name="clock" /> <b>00:28</b>
            </span>
            <span>
              QUESTION <b>2 / 4</b>
            </span>
          </div>
        }
      />
      <div className="quiz-wrap">
        <div className="quiz-boss">
          <Professor mood={answer === 2 ? "hurt" : "angry"} />
          <div>
            <span className="eyebrow">FINAL ROUND</span>
            <h2>Professor Syntax</h2>
            <HpBar hp={answer === 2 ? 800 : 1300} />
          </div>
          <div className="combo">
            <Icon name="spark" />
            <span>
              CLASS COMBO<strong>× 8</strong>
            </span>
          </div>
        </div>
        <section className="quiz-card card">
          <div className="quiz-meta">
            <span>JAVA COLLECTIONS</span>
            <strong>+250 pts</strong>
          </div>
          <h1>What does this code do?</h1>
          <pre>
            <code>
              <span>for</span> (Integer score : scores) {"{"}
              {"\n"} <span>if</span> (score &gt;= <b>70</b>) {"{"}
              {"\n"} passingScores.add(score);{"\n"} {"}"}
              {"\n"}
              {"}"}
            </code>
          </pre>
          <div className="answers">
            {answers.map((a, i) => (
              <button
                key={a}
                onClick={() => setAnswer(i)}
                className={`${answer === i ? "chosen" : ""} ${answer !== null && i === 2 ? "right" : ""} ${answer === i && i !== 2 ? "incorrect" : ""}`}
              >
                <span>{String.fromCharCode(65 + i)}</span>
                {a}
                {answer !== null && i === 2 && <Icon name="check" />}
              </button>
            ))}
          </div>
          <div className="quiz-foot">
            <div className="waiting-others">
              <span className="pulse" />{" "}
              {answer === null ? "Choose your best answer" : "Waiting for 8 others…"}
            </div>
            <button disabled={answer === null} onClick={onDone}>
              See class results <Icon name="arrow" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function Results({ final = false, onNext }: { final?: boolean; onNext: () => void }) {
  const [expanded, setExpanded] = useState(0);
  return (
    <main className="page results-page">
      <Topbar
        right={
          <div className="user-chip">
            <span>AM</span> Alex Morgan
          </div>
        }
      />
      <div className="results-wrap">
        <div className="victory-banner">
          <div>
            <span className="eyebrow">{final ? "CLASS VICTORY" : "ROUND COMPLETE"}</span>
            <h1>Professor defeated!</h1>
            <p>
              {final
                ? "Your class knocked out Professor Syntax with a 34-answer combo."
                : "Perfect program. You landed the final blow this round."}
            </p>
          </div>
          <div className="victory-prof">
            <Professor mood="defeated" />
          </div>
          <div className="final-score">
            <small>YOUR SCORE</small>
            <strong>{final ? "2,840" : "2,175"}</strong>
            <span>TOP {final ? "10" : "15"}%</span>
          </div>
        </div>
        <div className="results-grid">
          <section className="card solution">
            <div className="section-head">
              <div>
                <span className="eyebrow">YOUR SOLUTION</span>
                <h2>Build the honour roll</h2>
              </div>
              <span className="perfect">
                <Icon name="check" /> PERFECT MATCH
              </span>
            </div>
            <div className="solution-cols">
              <span>PSEUDOCODE</span>
              <span>JAVA PROGRAM</span>
            </div>
            {rows.slice(0, 5).map((r, i) => (
              <div className="solution-row" key={r.pseudo}>
                <button onClick={() => setExpanded(expanded === i ? -1 : i)}>
                  <span>{i + 1}</span>
                  <p>{r.pseudo}</p>
                  <Icon name="chevron" />
                </button>
                <code>{r.code}</code>
                {expanded === i && (
                  <div className="explain">
                    This line{" "}
                    {i === 0
                      ? "creates a typed, resizable list that stores integer score values."
                      : "translates the pseudocode instruction directly into Java syntax."}
                  </div>
                )}
              </div>
            ))}
          </section>
          <aside>
            <div className="card score-breakdown">
              <span className="eyebrow">SCORE BREAKDOWN</span>
              {[
                ["Correct matches", "5 × 100", "+500"],
                ["Speed bonus", "Average 8.2s", "+175"],
                ["No-hint bonus", "Clean run", "+100"],
                ["Quiz round", final ? "3 of 4" : "Up next", final ? "+750" : "—"],
              ].map((r) => (
                <div key={r[0]}>
                  <span>
                    {r[0]}
                    <small>{r[1]}</small>
                  </span>
                  <strong>{r[2]}</strong>
                </div>
              ))}
              <div className="score-total">
                <span>ROUND TOTAL</span>
                <strong>+{final ? "1,525" : "775"}</strong>
              </div>
            </div>
            <div className="card leaderboard">
              <div className="section-head">
                <div>
                  <span className="eyebrow">CLASS LEADERBOARD</span>
                  <h3>Top coders</h3>
                </div>
                <span>34 players</span>
              </div>
              {[
                ["1", "JR", "Jules R.", "3,120"],
                ["2", "SK", "Sam K.", "2,960"],
                [final ? "6" : "5", "AM", "You", "2,840"],
              ].map((r, i) => (
                <div className={`leader ${i === 2 ? "you" : ""}`} key={r[1]}>
                  <strong>{r[0]}</strong>
                  <span className={`avatar ${avatarColors[i]}`}>{r[1]}</span>
                  <p>{r[2]}</p>
                  <b>{r[3]}</b>
                </div>
              ))}
            </div>
            <button className="primary-button results-next" onClick={onNext}>
              {final ? "Play again" : "Continue to quick quiz"} <Icon name="arrow" />
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("signin");
  if (screen === "signin") return <SignIn onDone={() => setScreen("lobby")} />;
  if (screen === "lobby") return <Lobby onStart={() => setScreen("activity")} />;
  if (screen === "activity")
    return (
      <Activity onDone={() => setScreen("results")} onProjector={() => setScreen("projector")} />
    );
  if (screen === "projector") return <Projector onBack={() => setScreen("activity")} />;
  if (screen === "results") return <Results onNext={() => setScreen("quiz")} />;
  if (screen === "quiz") return <Quiz onDone={() => setScreen("final")} />;
  return <Results final onNext={() => setScreen("signin")} />;
}
