# CodeLine — UI Spec (Student side + Projector)

Build the screens below one by one. Clickable prototype with **mock data only**: no real backend, auth or WebSocket. Use a local mock store and simulated timers so every state can be shown.

---

## 0. Global setup

### Concept
A gamified on-site classroom game. Students match **Java code snippets** to **pseudocode lines**. Theme: **"The Class vs The Professor"**. Correct answers damage a cartoon professor boss; wrong answers heal him.

### Design tokens
| Token | Value | Use |
|---|---|---|
| `primary` | `#1B365D` | nav, headings, primary buttons |
| `accent` | `#F28C28` | boss, drag arrows, hover slot, highlights |
| `success` | `#2EAD6B` | correct / locked |
| `danger` | `#E5484D` | wrong / penalty / low HP |
| `muted` | `#9AA4B2` | auto-filled, disabled |
| `bg` | `#F5F7FA` | page background |
| `surface` | `#FFFFFF` | cards |

- Fonts: **Inter** (UI), **JetBrains Mono** (all code + pseudocode)
- Radius 12px on cards, 8px on chips/buttons. Soft shadow `0 2px 8px rgba(0,0,0,.08)`
- Min touch target 44px. Desktop-first at 1440×900; projector route at 1920×1080
- Characters drawn as **inline SVG doodles**: stick-figure professor with angry eyebrows, sly grin and pointer stick, in a hand-drawn stroke style (orange stroke, no fill)

### Routes
| Route | Screen |
|---|---|
| `/` | Sign-in |
| `/join` | Enter class code |
| `/lobby` | Lobby |
| `/play/codeline` | CodeLine activity |
| `/play/quiz` | Quiz round |
| `/results` | Round results |
| `/projector` | Projector board |

Add a small floating **dev panel** (bottom-left, toggle with `` ` ``) to jump between routes and force states (wrong drop, low HP, time's up, etc.) for demos.

### Mock data
- Session: title "Week 9 — Loops", class code `CL7K2P`, mode Individual, 40 expected students
- Rounds: R1 CodeLine (5:00), R2 Quiz (0:30 per question, 5 questions)
- CodeLine problem: "Sum of even numbers from 1 to N" — 8 pseudocode lines, each with a Java snippet answer
- Current student: "Thit" with a student ID, assigned snippet = line 4
- Boss HP: 100%, max damage per correct line = 500 (HP scaled to total lines)

---

## 1. Shared components

### `BossCard`
- Props: `hp (0–100)`, `size: sm | md | lg`, `state: idle | hit | heal | defeated`
- Layout: professor SVG above a horizontal HP bar with the label "PROFESSOR" and the HP %
- HP bar color: >50% `danger`, 20–50% orange, <20% flashing red
- `hit`: professor shakes 300ms, red flash, floating `-500` number rises and fades over 800ms
- `heal`: green `+HP` floats up, professor grins wider
- `defeated`: professor tips over, eyes become X X, confetti

### `SnippetChip`
- Monospace code, 1–2 lines, drag handle `⋮⋮` on the left
- States:
  - `default`: white, navy border
  - `dragging`: lifted (scale 1.03, bigger shadow), 80% opacity original stays in place
  - `locked`: green background tint, ✓ icon, not draggable
  - `wrong`: red border + horizontal shake (3× over 400ms), then animate back to its origin
  - `autofilled`: gray background, "Auto-filled" tag, italic
  - `selected` (tap mode): orange outline

### `PseudoRow`
- Left: line number + pseudocode text (mono)
- Right: `DropSlot`, the same width as a chip
- Slot states: `empty` (dashed gray border, text "Drop code here"), `hover` (orange dashed border + orange tint), `filled` (holds a locked chip), `autofilled`

### `TopBar` (in-game)
- Left: round label ("Round 1 · CodeLine")
- Center: `TimerPill` (mm:ss; turns red and pulses under 0:30)
- Right: `ScorePill` (★ 240), `ProgressBar` ("12 / 20 lines placed"), avatar + name

### `Toast`
- Bottom-center, auto-hide after 2s, stacks max 2
- Wrong: red, "−10 pts · try again"
- Correct: green, "+100 pts · +35 speed bonus"

### Buttons and inputs
- `Button`: primary (navy), secondary (white + navy border), ghost; loading and disabled states
- `Input`: large variant for the class code (48px font, letter-spaced, auto-uppercase, 6 boxes)

---

## 2. Sign-in (`/`)

**Layout:** centered card (480px wide) on `bg`. The professor doodle peeks from the right edge of the card, holding the pointer stick over it.

**Content:**
1. Logo "CodeLine" + tagline "The Class vs The Professor"
2. Button **"Sign in with student email"** (primary, full width, mail icon)
3. Divider "or"
4. Email field + "Continue" button (validates the university email domain format)
5. Footnote: "On-site sessions only · campus network required"

**States:**
- Loading: button spinner
- Invalid email: red helper text "Use your university student email"
- Not on campus network: full-card warning with a wifi-off icon and "Connect to the campus network to join"

**On success →** `/join`

---

## 3. Join session (`/join`)

**Layout:** same centered card; top-right shows the signed-in name + student ID and a "Sign out" link.

**Content:**
1. Heading "Enter class code"; subtext "Shown on the projector"
2. 6-box code input (auto-advance, paste fills all boxes)
3. Toggle: **Individual / Join as team**
   - Team on: team name field + member list. Each row = name, ID and status (`Confirmed` ✓ / `Pending`). Button "Invite member" (mock adds a pending member who confirms after 2s)
4. Button **"Join session"** (disabled until 6 chars)

**Errors (inline under the code):**
- "Code not found"
- "Session hasn't started yet"
- "Session already ended"

**On success →** `/lobby`

---

## 4. Lobby (`/lobby`)

**Layout:** 3 zones.
- **Header bar:** session title, class code chip (large), mode badge `Individual` / `Team`
- **Center (70%):** grid of joined-student avatar cards (initials circle + display name). New ones pop in with a scale animation. Counter on top: **"34 / 40 joined"** with a progress ring
- **Right panel (30%):** "Today's rounds" list. Each item: round number, mode icon, name, timer length and a scoring rule line (e.g. "+100 correct · up to +50 speed · −10 wrong")

**Bottom:** an idle professor animation (tapping the pointer stick) + text "Waiting for lecturer to start…" with animated dots.

**Mock:** students join every 500ms until 38; then the dev panel can "Start round" → 3-2-1 countdown overlay → `/play/codeline`.

---

## 5. CodeLine activity (`/play/codeline`) ⭐ main screen

**Layout:** `TopBar` + two columns.

### Left column (28%)
1. `BossCard size=md` at the top
2. Panel **"Your clipped code"**
   - Main mode: 1 `SnippetChip` (the student's assigned snippet)
   - Practice variant (dev toggle): 4–5 chips stacked
   - Helper text: "Drag your code to the matching pseudocode step"

### Right column (72%)
1. **Problem card:** title + 1–2 sentence statement + a small "Show hint" link (disabled, tooltip "Hints unlock later")
2. **Pseudocode board:** scrollable list of `PseudoRow`s (8 rows in mock)
   - Rows 1, 2, 5 already `filled` by classmates (green, small classmate name under the chip)
   - Row 6 `autofilled` (gray "Auto-filled (absent)")
   - Others `empty`
3. Custom vertical scrollbar on the far right with a thumb indicator; rows auto-scroll when dragging near the edge

### Drag interaction
- Drag starts: an orange curved hand-drawn arrow (SVG path) follows from the chip origin to the cursor
- Over a valid empty slot: slot → `hover`
- Drop on a correct slot:
  1. Chip snaps in and becomes `locked`
  2. Toast "+100 pts · +35 speed bonus"
  3. Boss `hit` animation, HP decreases
  4. Progress bar increments
  5. Screen switches to the **waiting state**
- Drop on a wrong slot:
  1. Chip `wrong` shake, returns to the left panel
  2. Slot stays empty
  3. Toast "−10 pts · try again"
  4. Boss `heal` animation (+small HP)
- Drop outside a slot: chip returns, **no penalty**
- **Tap mode** (touch): tap chip → `selected`; tap slot → same as a drop

### Waiting state
- Left panel shows "✓ Your line is placed!" with the locked chip copy
- Board stays live: mock classmates fill a random empty slot every 2–4s (boss takes hits)
- Small text: "Watch the board — help the class defeat the professor"

### Round end
- All slots filled → boss `defeated` → after 2s go to `/results`
- Timer hits 0 → overlay "Time's up!" → `/results`

---

## 6. Quiz round (`/play/quiz`)

**Layout:** `TopBar` (shows "Question 2 / 5") + centered column (max 900px).

1. `BossCard size=sm` at the top + a **"Class combo ×3"** meter (flame icon; resets on a class-wide wrong majority)
2. **Question card:**
   - Question text ("What does this loop print?")
   - Code block (mono, dark theme, line numbers)
3. **Answers:** 2×2 grid of large buttons labelled A–D, each showing a letter badge + text
   - `selected`: orange border
   - After lock: `correct` = green with ✓, `wrong` = red with ✕ (shown when the question closes)
4. After answering: buttons lock; bar "Waiting for others… 27 / 38 answered"
5. Reveal (dev or timer): correct answer highlighted, boss takes damage proportional to the class correct %, one-line explanation below

**Variants (tabs in the dev panel):**
- **True / False:** two big buttons
- **Matching:** two columns (code ↔ meaning); click left then right to draw a connecting line
- **Fill-in-the-blank:** code block with an inline monospace input in the blank; "Submit" button

---

## 7. Results (`/results`)

**Top banner:** "Professor defeated! 🎉" (with the defeated boss) or "The professor escaped…" (boss laughing), based on the outcome.

**Layout:** two columns.

### Left (60%) — Answer & explanation
- Full program shown as rows: pseudocode | correct Java code
- The student's own line is highlighted with a "Your line" tag
- Each row expandable (chevron) → 1–2 sentence explanation of why the code matches the step

### Right (40%)
1. **Your score card**
   - Base +100
   - Speed bonus +35
   - Penalties −20 (2 wrong drops)
   - **Total 115** (large)
   - Time taken, attempts
2. **Leaderboard** titled "Game performance"
   - Top 10, with the current student's row pinned and highlighted if outside the top 10
   - Team rounds show a "Team" tag

**Bottom:** "Next round" button disabled with "Waiting for lecturer…"; the dev panel can advance to `/play/quiz`.

---

## 8. Projector board (`/projector`, 1920×1080)

For the classroom screen. All text is very large (body ≥ 28px, headings ≥ 56px).

**Layout:**
1. **Top (35%):** `BossCard size=lg` centered, with a wide HP bar. Floating `-500` numbers on each correct placement
2. **Middle (50%):** "desk" panel (wood-tone or navy card) holding the shared board: pseudocode left | code slot right. Slots fill live: green = correct (with display name), gray = auto-filled, dashed = empty
3. **Bottom strip (15%):** timer (huge), "12 / 20 lines placed", ✓ correct count, ✕ wrong count, and the banner **"The Class VS Professor"** in hand-drawn lettering

**Rules:** display names only, never student IDs or emails.

**States (dev panel):** in progress · low HP (screen edges pulse red) · defeated (full-screen confetti + "CLASS WINS!") · time's up ("The professor escaped!").

---

## 9. Animations summary
| Event | Animation |
|---|---|
| Correct drop | chip snap (spring), boss shake + `-500` float, green toast |
| Wrong drop | chip shake 400ms + return, boss heal float, red toast |
| HP change | bar width tween 500ms ease-out |
| Student joins lobby | avatar scale 0 → 1 pop |
| Round start | full-screen 3-2-1 countdown |
| Boss defeated | tip-over + confetti 2s |

Respect `prefers-reduced-motion`: replace shakes and confetti with color changes only.

---

## 10. Build order
1. Tokens, fonts, shared components (§1) on a `/components` demo page
2. Sign-in → Join → Lobby
3. CodeLine activity (all states)
4. Results
5. Projector board
6. Quiz + variants
7. Dev panel and full click-through: Sign-in → Join → Lobby → CodeLine (wrong → correct → waiting) → Results → Quiz → Results
