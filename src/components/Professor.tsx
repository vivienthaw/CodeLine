export type ProfessorMood = "idle" | "hit" | "heal" | "defeated" | "friendly";

/**
 * Hand-drawn stick-figure professor: angry eyebrows, sly grin, pointer stick.
 * Orange stroke, no fill.
 */
export function Professor({
  mood = "idle",
  tapping = false,
  className = "",
  stroke = "var(--color-accent)",
}: {
  mood?: ProfessorMood;
  /** Idle animation: pointer stick taps (lobby). */
  tapping?: boolean;
  className?: string;
  stroke?: string;
}) {
  const defeated = mood === "defeated";
  /** staff-facing variant: relaxed brows, big smile, thumbs up instead of the pointer stick */
  const friendly = mood === "friendly";
  return (
    <svg
      viewBox="0 0 200 220"
      role="img"
      aria-label={`Professor doodle, ${mood}`}
      className={`cl-doodle overflow-visible ${className}`}
      fill="none"
      stroke={stroke}
      strokeWidth={4.5}
    >
      {/* hair tufts */}
      <path d="M70 40c-4-10 0-20 9-24M84 30c2-12 12-19 22-18-3 8-7 13-13 16M110 22c9-6 19-4 24 4-7 2-12 3-17 1" />
      {/* head (wobbly circle) */}
      <path d="M100 24c-22-1-37 15-37 37 1 21 16 36 37 36 21 1 37-15 37-36 0-20-14-36-34-37-2 0-3 0-5 1" />
      {/* glasses bridge */}
      <path d="M95 60h10" strokeWidth={3} />
      <path
        d="M78 60c0-6 5-9 9-9s8 3 8 9-4 8-8 8-9-2-9-8ZM105 60c0-6 4-9 8-9s9 3 9 9-5 8-9 8-8-2-8-8Z"
        strokeWidth={3}
      />

      {/* angry eyebrows (slant down toward the nose) */}
      {friendly && <path d="M78 47c4-4 10-5 15-2M107 45c5-3 11-2 15 2" strokeWidth={4} />}
      {!defeated && !friendly && (
        <path
          d={mood === "hit" ? "M76 42l18 6M124 42l-18 6" : "M76 46l18 4M124 46l-18 4"}
          strokeWidth={5}
        />
      )}

      {/* eyes */}
      {defeated ? (
        <path d="M82 56l9 9M91 56l-9 9M109 56l9 9M118 56l-9 9" strokeWidth={3.5} />
      ) : mood === "hit" ? (
        <path d="M83 60h8M109 60h8" strokeWidth={3.5} />
      ) : (
        <>
          <circle cx="88" cy="61" r="2.4" fill={stroke} stroke="none" />
          <circle cx="114" cy="61" r="2.4" fill={stroke} stroke="none" />
        </>
      )}

      {/* nose */}
      <path d="M101 66c2 4 1 7-3 8" strokeWidth={3} />

      {/* mouth */}
      {defeated ? (
        <path d="M86 86c4-5 9-6 14-3s9 2 13-2" strokeWidth={3.5} />
      ) : mood === "hit" ? (
        <path d="M92 84c3-4 13-4 16 0 0 4-16 4-16 0Z" strokeWidth={3.5} />
      ) : friendly ? (
        // open, friendly smile
        <path d="M84 78c6 10 26 10 32 0" strokeWidth={3.5} />
      ) : mood === "heal" ? (
        // wide sly grin
        <path d="M80 78c8 12 30 14 42-4M84 81l3 4" strokeWidth={3.5} />
      ) : (
        // sly lopsided grin
        <path d="M86 81c8 6 20 6 30-6" strokeWidth={3.5} />
      )}

      {/* body */}
      <path d="M100 97v62" />
      {/* bow tie */}
      <path d="M92 101l8 5-8 5ZM108 101l-8 5 8 5Z" strokeWidth={3} />
      {/* left arm on hip */}
      <path d="M100 118c-14 2-24 10-26 20 4 6 12 8 22 4" />
      {/* legs */}
      <path d="M100 158c-6 18-14 32-22 44M100 158c6 18 12 32 22 44M70 203h12M118 203h12" />

      {/* right arm: thumbs up (friendly) or pointer stick */}
      {friendly ? (
        <g>
          <path d="M100 118c14-2 24-9 30-20" />
          <path
            d="M124 100c-1-7 3-11 9-11h5c4 0 6 3 5 7l-2 7c-1 3-3 5-6 5h-6c-3 0-5-3-5-8Z"
            strokeWidth={3.5}
          />
          <path d="M134 89c0-6 1-11 3-14 2-2 5-1 5 2 0 4-1 8-2 12" strokeWidth={3.5} />
        </g>
      ) : (
        <g className={tapping && !defeated ? "cl-pointer-tap" : ""}>
          <path d="M100 118c14-2 26-8 36-18" />
          <path d="M134 102l46-46" strokeWidth={4} />
          <circle cx="181" cy="55" r="3" fill={stroke} stroke="none" />
        </g>
      )}
    </svg>
  );
}
