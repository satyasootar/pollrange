import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Clock, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandHeader } from "@/components/brand/brand-chrome";
import { fadeUp, stagger } from "@/lib/animations";
import { cn, formatCountdown } from "@/lib/utils";
import type { PublicForm } from "@/types";

interface QuizIntroProps {
  form: PublicForm;
  questionCount: number;
  totalPoints: number;
  hasMultiSelect: boolean;
  remaining: number | null;
  /** Signed-out taker of an open quiz: ask for a leaderboard name. */
  askName: boolean;
  name: string;
  onNameChange: (name: string) => void;
  needsEmail: boolean;
  email: string;
  onEmailChange: (email: string) => void;
  /** Sign-in quiz and nobody is signed in: Start opens the sign-in gate first. */
  signInRequired: boolean;
  signedInAs?: string | undefined;
  onStart: () => void;
}

function Step({ n, title, children, tone }: { n: number; title: string; children: React.ReactNode; tone?: "warn" }) {
  return (
    <li className="flex gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:px-5">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-xs font-bold",
          tone === "warn" ? "border-orange-400 text-orange-500" : "border-border"
        )}
        aria-hidden
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <p className="text-sm font-semibold">{title}</p>
        {children}
      </div>
    </li>
  );
}

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="-mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{children}</p>
);

/** A non-interactive picture of an answer row, matching the real QuestionRenderer styles. */
function SampleOption({ label, kind, picked }: { label: string; kind: "one" | "many"; picked: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-10 items-center gap-2.5 border px-3 text-[13px]",
        picked ? "border-primary bg-primary/10 text-primary" : "border-border"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center border-2",
          kind === "one" ? "rounded-full" : "rounded",
          picked ? (kind === "many" ? "border-primary bg-primary" : "border-primary") : "border-muted-foreground/40"
        )}
      >
        {picked &&
          (kind === "many" ? (
            <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
          ) : (
            <span className="h-2 w-2 rounded-full bg-primary" />
          ))}
      </span>
      {label}
    </div>
  );
}

function SampleTile({ n, state }: { n: number; state: "answered" | "current" | "open" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-8 w-8 items-center justify-center font-mono text-xs font-bold",
        state === "answered" && "bg-primary text-primary-foreground",
        state === "current" && "border-2 border-foreground",
        state === "open" && "border border-dashed border-muted-foreground/60 text-muted-foreground"
      )}
    >
      {n}
    </span>
  );
}

/**
 * The page a quiz taker sees before the first question: what the quiz is, how answering
 * works (with pictures of the real controls) and the details the leaderboard needs.
 */
export function QuizIntro(props: QuizIntroProps) {
  const { form, questionCount, totalPoints, hasMultiSelect, remaining, askName, needsEmail, signInRequired } = props;
  const [ready, setReady] = useState(false);
  const sections = form.sections.length;
  let step = 0;

  const start = () => {
    if (askName && !props.name.trim()) return toast.error("Please enter your name.");
    if (needsEmail && !props.email.trim()) return toast.error("Please provide your email address.");
    if (!ready) return toast.error("Tick the box to confirm you've read how the quiz works.");
    props.onStart();
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-6 sm:px-8 sm:pt-10">
      <motion.div variants={stagger} initial="hidden" animate="visible" className="mx-auto flex max-w-xl flex-col gap-4 sm:gap-5">
        <div className="flex items-center justify-between gap-3">
          <BrandHeader brand={form.brand} className="mb-0" />
          {remaining !== null && (
            <span className="ml-auto flex h-8 items-center gap-1.5 border border-border px-2.5 font-mono text-[13px] font-semibold tabular-nums">
              <Clock className="h-3.5 w-3.5 text-primary" aria-hidden /> Ends in {formatCountdown(remaining)}
            </span>
          )}
        </div>

        {form.coverImageUrl && <img src={form.coverImageUrl} alt="" className="max-h-44 w-full border border-border object-cover" />}

        <motion.header variants={fadeUp} className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary">Before you start</span>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-tight sm:text-4xl">{form.title}</h1>
          {form.description && <p className="text-sm leading-relaxed text-muted-foreground">{form.description}</p>}
        </motion.header>

        <motion.dl variants={fadeUp} className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          {[
            ["Questions", questionCount],
            ["Total points", totalPoints],
            ["Sections", sections],
            ["Attempts", 1],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 bg-card p-3">
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="font-mono text-xl font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </motion.dl>

        <motion.section variants={fadeUp} aria-labelledby="how-heading" className="border border-border bg-card">
          <h2 id="how-heading" className="px-4 pt-5 pb-1 text-base font-bold sm:px-5">
            How this quiz works
          </h2>
          <ol>
            <Step n={++step} title="Tap an option to answer">
              <Note>A round marker means pick one. Tap a different option to change your answer.</Note>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <SampleOption label="let" kind="one" picked />
                <SampleOption label="const" kind="one" picked={false} />
              </div>
            </Step>
            {hasMultiSelect && (
              <Step n={++step} title="Square boxes: pick all that apply">
                <Note>You score only when you pick every correct option and nothing else.</Note>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <SampleOption label="map()" kind="many" picked />
                  <SampleOption label="filter()" kind="many" picked />
                </div>
              </Step>
            )}
            <Step n={++step} title="Watch your progress">
              <Note>
                The bar at the top counts answered and unanswered questions. Open <strong className="text-foreground">Questions</strong>{" "}
                (or the side panel on a laptop) to jump back to one.
              </Note>
              <div className="flex items-center gap-1.5">
                <SampleTile n={1} state="answered" />
                <SampleTile n={2} state="answered" />
                <SampleTile n={3} state="current" />
                <SampleTile n={4} state="open" />
                <span className="ml-1.5 text-[11px] leading-snug text-muted-foreground">
                  Filled = answered
                  <br />
                  Dashed = not yet
                </span>
              </div>
            </Step>
            <Step n={++step} title={sections > 1 ? "Move with Next and Back" : "Submit when you're done"}>
              <Note>
                {sections > 1
                  ? `Questions come one section at a time (${sections} sections). You can change any answer until you press Submit.`
                  : "All questions are on one page. You can change any answer until you press Submit."}
              </Note>
            </Step>
            {remaining !== null && (
              <Step n={++step} title="The timer doesn't stop" tone="warn">
                <Note>It's already running for everyone. At 0:00 the quiz closes and whatever you've answered is submitted for you.</Note>
              </Step>
            )}
            <Step n={++step} title="One attempt, results on this link">
              <Note>
                {form.settings.releaseScoreImmediately ? "You'll see your score as soon as you submit. " : ""}
                Come back to this page to see your rank and the leaderboard once results are published.
              </Note>
            </Step>
          </ol>
        </motion.section>

        <motion.section variants={fadeUp} className="flex flex-col gap-4 border border-border bg-card p-4 sm:p-5">
          {askName && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quiz-name" className="text-[13px] font-semibold">
                Your name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quiz-name"
                value={props.name}
                maxLength={60}
                autoComplete="name"
                placeholder="e.g. Ada Lovelace"
                onChange={(e) => props.onNameChange(e.target.value)}
                className="h-11"
              />
              <span className="text-xs text-muted-foreground">Shown on the leaderboard when results are published.</span>
            </div>
          )}
          {needsEmail && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quiz-email" className="text-[13px] font-semibold">
                Email address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quiz-email"
                type="email"
                value={props.email}
                autoComplete="email"
                placeholder="you@example.com"
                onChange={(e) => props.onEmailChange(e.target.value)}
                className="h-11"
              />
            </div>
          )}
          {props.signedInAs && (
            <p className="text-sm text-muted-foreground">
              You'll appear on the leaderboard as <span className="font-medium text-foreground">{props.signedInAs}</span>.
            </p>
          )}
          {signInRequired && <p className="text-sm text-muted-foreground">This quiz needs you to sign in. Your account name is used on the leaderboard.</p>}
          <label htmlFor="quiz-ready" className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input
              id="quiz-ready"
              type="checkbox"
              checked={ready}
              onChange={(e) => setReady(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
            />
            I've read how the quiz works and I'm ready to start.
          </label>
        </motion.section>

        <div className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 border-t border-border bg-background/95 px-4 pt-3 pb-5 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-10">
          <Button size="lg" onClick={start} className="h-13 w-full gap-2 text-base font-bold">
            {signInRequired ? (
              <>
                <LogIn className="h-4 w-4" aria-hidden /> Sign in to start
              </>
            ) : (
              <>
                Start quiz <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </Button>
          {remaining !== null && <span className="text-center text-xs text-muted-foreground">The timer is already running for everyone.</span>}
        </div>
      </motion.div>
    </div>
  );
}
