import { Professor } from "../components";
import { Link } from "../router";

/** Placeholder for routes whose screens are built in later steps. */
export default function ComingSoon({ title, step }: { title: string; step: number }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg font-sans text-primary">
      <Professor className="h-40" tapping />
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="text-primary/60">
        {step > 0 ? `This screen arrives in build step ${step} of UI_SPEC.md.` : "There's nothing at this address."}
      </p>
      <Link to="/" className="font-semibold text-accent underline underline-offset-2">
        Back to sign-in
      </Link>
    </div>
  );
}
