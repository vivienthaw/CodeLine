import type { ReactNode } from "react";
import { MeLayout, NotBuiltYet } from "./MeLayout";
import MySessions from "./MySessions";
import SessionReview from "./SessionReview";
import Practice from "./Practice";
import Progress from "./Progress";
import Rank from "./Rank";

/**
 * Student review area (works on or off campus after sign-in):
 *   /me, /me/sessions              My Sessions
 *   /me/sessions/:id               Session review
 *   /me/sessions/:id/practice/:qid Practice one round you played (access checked by canPractice)
 *   /me/progress                   Progress
 *   /me/rank                       Rank
 */
export function matchMeRoute(path: string): ReactNode | null {
  if (path !== "/me" && !path.startsWith("/me/")) return null;
  if (path === "/me" || path === "/me/sessions")
    return (
      <MeLayout>
        <MySessions />
      </MeLayout>
    );
  const practice = path.match(/^\/me\/sessions\/([^/]+)\/practice(?:\/([^/]+))?$/);
  if (practice)
    return (
      <MeLayout hero={false}>
        <Practice
          id={decodeURIComponent(practice[1]!)}
          questionId={practice[2] ? decodeURIComponent(practice[2]) : undefined}
        />
      </MeLayout>
    );
  const review = path.match(/^\/me\/sessions\/([^/]+)$/);
  if (review)
    return (
      <MeLayout hero={false}>
        <SessionReview id={decodeURIComponent(review[1]!)} />
      </MeLayout>
    );
  if (path === "/me/progress")
    return (
      <MeLayout>
        <Progress />
      </MeLayout>
    );
  if (path === "/me/rank")
    return (
      <MeLayout>
        <Rank />
      </MeLayout>
    );
  return (
    <MeLayout>
      <NotBuiltYet title="Page not found" step={0} />
    </MeLayout>
  );
}
