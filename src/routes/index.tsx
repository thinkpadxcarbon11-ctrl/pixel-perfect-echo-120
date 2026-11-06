import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type FormEvent } from "react";
import {
  Bell, Briefcase, CheckCircle2, Info, Loader2, Mail, MailX, ShieldCheck, Target, TrendingUp, Zap, CalendarDays, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { callNewsletterWebhook, JOB_TYPES } from "@/lib/newsletter.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Job Letter — Job Circulars in Your Inbox" },
      { name: "description", content: "Subscribe to Job Letter for job circulars, employment news and career opportunities by category." },
      { property: "og:title", content: "Job Letter — Your Next Career Opportunity Starts Here" },
      { property: "og:description", content: "Personalized job alerts and weekly digests delivered to your inbox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type AppState = "initial" | "submitting" | "subscribed" | "already_subscribed" | "unsubscribing" | "unsubscribed" | "error";
type Subscriber = { name: string; email: string; job_type: string };
const empty: Subscriber = { name: "", email: "", job_type: "" };

function Index() {
  const call = useServerFn(callNewsletterWebhook);
  const [state, setState] = useState<AppState>("initial");
  const [form, setForm] = useState<Subscriber>(empty);
  const [subscriber, setSubscriber] = useState<Subscriber>(empty);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastSubStatus, setLastSubStatus] = useState<"subscribed" | "already_subscribed">("subscribed");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const unsubscribePending = useRef(false);

  async function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    const data = { name: form.name.trim(), email: form.email.trim(), job_type: form.job_type };
    if (!data.name || !data.job_type) return setError("Please fill in all fields.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return setError("Please enter a valid email address.");
    setError("");
    setState("submitting");
    try {
      const r = await call({ data: { action: "subscribe", ...data } });
      if (r.status === "subscribed" || r.status === "already_subscribed") {
        setSubscriber(data);
        setMessage(r.message || (r.status === "subscribed" ? "Your subscription was successful." : "You are already subscribed to Job Letter!"));
        setLastSubStatus(r.status);
        setState(r.status);
      } else {
        setError(r.message || "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setState("error");
    }
  }

  async function handleUnsubscribe() {
    console.debug("[Unsubscribe] handleUnsubscribe executed");
    if (unsubscribePending.current) return;
    if (!subscriber.name || !subscriber.email || !subscriber.job_type) {
      setError("Your subscriber details are missing. Please subscribe before unsubscribing.");
      return;
    }
    unsubscribePending.current = true;
    setConfirmOpen(false);
    setError("");
    setState("unsubscribing");
    try {
      console.debug("[Unsubscribe] Requesting cancellation for stored subscriber");
      const r = await call({ data: { action: "unsubscribe", ...subscriber } as never });
      if (r.success && r.status === "unsubscribed") {
        setMessage(r.message || "You have successfully unsubscribed.");
        setState("unsubscribed");
      } else {
        setError(r.message || "We couldn't unsubscribe you. Please try again.");
        setState(lastSubStatus);
      }
    } catch {
      setError("We couldn't unsubscribe you. Please try again.");
      setState(lastSubStatus);
    } finally {
      unsubscribePending.current = false;
    }
  }

  function handleSubscribeAgain() {
    setForm(empty); setSubscriber(empty); setMessage(""); setError(""); setState("initial");
  }

  const showForm = state === "initial" || state === "submitting" || state === "error";
  const showSubscribed = state === "subscribed" || state === "already_subscribed" || state === "unsubscribing";

  return (
    <div className="min-h-screen bg-background bg-gradient-soft font-sans">
      <header className="mx-auto max-w-5xl px-5 pt-14 pb-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-card">
          <Mail className="h-7 w-7" />
        </div>
        <h1 className="font-display text-5xl font-bold tracking-tight text-foreground md:text-6xl">Job Letter</h1>
        <p className="mt-3 text-lg text-muted-foreground">Your Next Career Opportunity Starts Here.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {[[Zap, "Real-time Updates"], [ShieldCheck, "Privacy First"], [CalendarDays, "Weekly Job Digest"]].map(([I, t]) => {
            const Icon = I as typeof Zap;
            return (
              <span key={t as string} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-secondary-foreground">
                <Icon className="h-3.5 w-3.5 text-primary" /> {t as string}
              </span>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5">
        <div className="rounded-3xl border border-border bg-card p-7 shadow-card md:p-9">
          {showForm && (
            <form onSubmit={handleSubscribe} className="animate-rise space-y-5" noValidate>
              <div>
                <h2 className="font-display text-2xl font-bold">Join Our Community</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">Subscribe to receive the latest job circulars, career opportunities, and employment news directly in your inbox.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" required maxLength={100} placeholder="Enter your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" required maxLength={255} placeholder="Enter your email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job">Job Type</Label>
                <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                  <SelectTrigger id="job" className="h-11 rounded-xl"><SelectValue placeholder="Select your preferred job type" /></SelectTrigger>
                  <SelectContent>{JOB_TYPES.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
              )}
              <Button type="submit" variant="hero" size="lg" className="h-12 w-full rounded-xl text-base" disabled={state === "submitting"}>
                {state === "submitting" ? <><Loader2 className="animate-spin" /> Subscribing…</> : "Subscribe Now"}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Your information is safe with us. We respect your privacy.
              </p>
            </form>
          )}

          {showSubscribed && (
            <div className="animate-rise text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
                {lastSubStatus === "subscribed" ? <CheckCircle2 className="h-9 w-9" /> : <Info className="h-9 w-9" />}
              </div>
              <h2 className="font-display text-2xl font-bold">
                {lastSubStatus === "subscribed" ? "Welcome to Job Letter!" : "You're already with us"}
              </h2>
              <p className="mt-2 text-muted-foreground">{message}</p>
              <dl className="mt-6 space-y-2 rounded-2xl bg-muted p-4 text-left text-sm">
                {[["Name", subscriber.name], ["Email", subscriber.email], ["Job Type", subscriber.job_type]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="truncate font-medium">{v}</dd></div>
                ))}
              </dl>
              {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
              <Button variant="outline" className="mt-6 rounded-xl" disabled={state === "unsubscribing"} onClick={() => {
                console.debug("[Unsubscribe] Unsubscribe button clicked");
                setConfirmOpen(true);
              }}>
                {state === "unsubscribing" ? <><Loader2 className="animate-spin" /> Unsubscribing…</> : <><MailX /> Unsubscribe</>}
              </Button>
            </div>
          )}

          {state === "unsubscribed" && (
            <div className="animate-rise text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary"><MailX className="h-8 w-8" /></div>
              <h2 className="font-display text-2xl font-bold">Successfully Unsubscribed</h2>
              <p className="mt-2 text-muted-foreground">{message}</p>
              <p className="mt-1 text-sm text-muted-foreground">Thank you for being part of Job Letter. You're always welcome back.</p>
              <Button variant="hero" className="mt-6 rounded-xl" onClick={handleSubscribeAgain}>Subscribe Again</Button>
            </div>
          )}
        </div>
      </main>

      <section className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="text-center font-display text-3xl font-bold">Why Choose Job Letter?</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            [Bell, "Latest Job Circulars", "Stay updated with new job announcements and employment opportunities."],
            [Target, "Personalized Job Alerts", "Receive job news based on your selected job category."],
            [TrendingUp, "Career Opportunities", "Discover new opportunities and take the next step in your career."],
          ].map(([I, t, d]) => {
            const Icon = I as typeof Bell;
            return (
              <div key={t as string} className="rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary"><Icon className="h-5 w-5" /></div>
                <h3 className="font-semibold">{t as string}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 px-5 py-8 text-center">
          <div className="flex items-center gap-2 font-display text-lg font-bold"><Briefcase className="h-4 w-4 text-primary" /> Job Letter</div>
          <p className="text-sm text-muted-foreground">Connecting you with your next career opportunity.</p>
          <p className="mt-2 text-xs text-muted-foreground">© 2026 Job Letter. All rights reserved.</p>
        </div>
      </footer>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsubscribe from Job Letter?</AlertDialogTitle>
            <AlertDialogDescription>You will no longer receive job updates at {subscriber.email}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={state === "unsubscribing"} onClick={() => {
              console.debug("[Unsubscribe] Confirmation button clicked");
              void handleUnsubscribe();
            }}>Yes, Unsubscribe</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
