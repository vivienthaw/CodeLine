import type { ReactNode } from "react";
import { Professor } from "../components";
import { Link } from "../router";
import QuestionBank from "./QuestionBank";
import QuestionEditor from "./editor/QuestionEditor";
import SessionBuilder from "./sessions/SessionBuilder";
import SessionsList from "./sessions/SessionsList";
import ClassOverview from "./reports/ClassOverview";
import SessionReport from "./reports/SessionReport";
import StudentReport from "./reports/StudentReport";
import { StaffHeader, StaffLayout } from "./StaffLayout";

/** Id of a mock set the dev panel can open in the editor. */
export const DEMO_SET_ID = "week9-loops";
/** Id of a mock report the dev panel can open. */
export const DEMO_REPORT_SESSION = "s9-loops-arrays";
export { DEMO_STUDENT_ID as DEMO_REPORT_STUDENT } from "./reports/data";

/**
 * Staff routes:
 *   /staff/questions            Question Bank
 *   /staff/questions/new        Question Editor (new)
 *   /staff/questions/:id/edit   Question Editor (edit)
 *   /staff/sessions             Sessions (created, with class codes)
 *   /staff/sessions/new         Session Builder
 *   /staff/reports                     Class overview
 *   /staff/reports/students/:id        Individual student report
 *   /staff/reports/sessions/:id        Single session report
 * Returns null for any path outside /staff.
 */
export function matchStaffRoute(path: string): ReactNode | null {
  if (!path.startsWith("/staff")) return null;
  return staffPage(path);
}

function staffPage(path: string): ReactNode {

  if (path === "/staff" || path === "/staff/questions") return <QuestionBank />;
  if (path === "/staff/questions/new") return <QuestionEditor />;
  const edit = path.match(/^\/staff\/questions\/([^/]+)\/edit$/);
  if (edit) return <QuestionEditor id={decodeURIComponent(edit[1]!)} />;
  if (path === "/staff/sessions") return <SessionsList />;
  if (path === "/staff/sessions/new") return <SessionBuilder />;
  if (path === "/staff/reports") return <ClassOverview />;
  const student = path.match(/^\/staff\/reports\/students\/([^/]+)$/);
  if (student) return <StudentReport id={decodeURIComponent(student[1]!)} />;
  const session = path.match(/^\/staff\/reports\/sessions\/([^/]+)$/);
  if (session) return <SessionReport id={decodeURIComponent(session[1]!)} />;
  return <Placeholder title="Page not found" step={0} />;
}

function Placeholder({
  title,
  subtitle,
  step,
  actions,
  back = false,
}: {
  title: string;
  subtitle?: ReactNode;
  step: number;
  actions?: ReactNode;
  back?: boolean;
}) {
  return (
    <StaffLayout>
      {back && (
        <div className="px-10 pt-6">
          <Link to="/staff/questions" className="text-sm font-semibold text-primary/60 hover:text-primary">
            ← Question Bank
          </Link>
        </div>
      )}
      <StaffHeader title={title} subtitle={subtitle} actions={actions} />
      <div className="px-10 pb-10">
        <div className="flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-primary/15 bg-surface/60 py-20 text-center">
          <Professor className="h-28" tapping />
          <div className="text-lg font-bold">
            {step > 0 ? `This screen is built in staff step ${step}` : "There's nothing at this address."}
          </div>
          <p className="max-w-md text-sm text-primary/60">
            {step > 0
              ? "The layout, navigation and route are in place — content comes next."
              : "Use the sidebar to get back to the Question Bank or Sessions."}
          </p>
        </div>
      </div>
    </StaffLayout>
  );
}
