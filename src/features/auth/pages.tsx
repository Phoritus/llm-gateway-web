import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import { queryClient } from "@/api/queries";
import type { Me } from "@/api/types";
import { Button, ErrorNote, TextField, fieldError } from "@/ui/primitives";
import { AuthHeading } from "./AuthLayout";

const link = "font-medium text-relay underline-offset-4 hover:underline";

function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginPage() {
  const { next } = useSearch({ from: "/public/login" });
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: () => api.post<Me>("/auth/login", { email, password }),
    onSuccess: (me) => {
      queryClient.setQueryData(["me"], me);
      router.history.push(safeNext(next));
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        login.mutate();
      }}
      className="flex flex-col gap-4"
    >
      <AuthHeading title="Sign in" />
      <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError(login.error, "email")} />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={
          <Link to="/forgot-password" className={link}>
            Forgot your password?
          </Link>
        }
      />
      <ErrorNote error={login.error} fields={["email"]} />
      <Button type="submit" variant="primary" busy={login.isPending} className="mt-2">
        Sign in
      </Button>
      <p className="mt-4 text-muted">
        New here?{" "}
        <Link to="/signup" className={link}>
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupPage() {
  const [form, setForm] = useState({ email: "", password: "", workspace_name: "" });
  const signup = useMutation({ mutationFn: () => api.post("/auth/signup", form) });

  if (signup.isSuccess) return <CheckInbox email={form.email} />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        signup.mutate();
      }}
      className="flex flex-col gap-4"
    >
      <AuthHeading title="Create an account">Bring your own provider keys. One gateway key reaches all of them.</AuthHeading>
      <TextField label="Email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} error={fieldError(signup.error, "email")} />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        value={form.password}
        onChange={set("password")}
        hint="At least 12 characters."
        error={fieldError(signup.error, "password")}
      />
      <TextField
        label="Workspace name"
        autoComplete="organization"
        required
        value={form.workspace_name}
        onChange={set("workspace_name")}
        hint="Your team or project. You can have one workspace."
        error={fieldError(signup.error, "workspace_name")}
      />
      <ErrorNote error={signup.error} fields={["email", "password", "workspace_name"]} />
      <Button type="submit" variant="primary" busy={signup.isPending} className="mt-2">
        Create account
      </Button>
      <p className="mt-4 text-muted">
        Already have an account?{" "}
        <Link to="/login" search={{ next: undefined }} className={link}>
          Sign in
        </Link>
      </p>
    </form>
  );
}

function CheckInbox({ email }: { email: string }) {
  return (
    <div>
      <AuthHeading title="Check your inbox">
        We sent a confirmation link to <span className="text-ink font-medium">{email}</span>. Open it to finish setting up, then sign in.
      </AuthHeading>
      <ResendVerification email={email} />
      <p className="mt-8 text-muted">
        <Link to="/login" search={{ next: undefined }} className={link}>
          Go to sign in
        </Link>
      </p>
    </div>
  );
}

export function ResendVerification({ email }: { email: string }) {
  const resend = useMutation({ mutationFn: () => api.post("/auth/resend-verification", { email }) });
  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={() => resend.mutate()} busy={resend.isPending} disabled={resend.isSuccess}>
        {resend.isSuccess ? "Link sent" : "Send a new link"}
      </Button>
      {resend.isSuccess && <p className="text-xs text-muted">A new link is on its way. Earlier links no longer work.</p>}
      <ErrorNote error={resend.error} />
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const forgot = useMutation({ mutationFn: () => api.post("/auth/forgot-password", { email }) });

  if (forgot.isSuccess) {
    return (
      <div>
        <AuthHeading title="Check your inbox">
          If an account uses <span className="text-ink font-medium">{email}</span>, a link to choose a new password is on its way.
        </AuthHeading>
        <Link to="/login" search={{ next: undefined }} className={link}>
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        forgot.mutate();
      }}
      className="flex flex-col gap-4"
    >
      <AuthHeading title="Reset your password">Enter the address you signed up with and we will mail you a link.</AuthHeading>
      <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError(forgot.error, "email")} />
      <ErrorNote error={forgot.error} fields={["email"]} />
      <Button type="submit" variant="primary" busy={forgot.isPending} className="mt-2">
        Send reset link
      </Button>
      <Link to="/login" search={{ next: undefined }} className={`${link} mt-4`}>
        Back to sign in
      </Link>
    </form>
  );
}

function expiredLink(error: unknown) {
  return error instanceof ApiError && error.code === "invalid_token";
}

export function ResetPasswordPage() {
  const { token } = useSearch({ from: "/public/reset-password" });
  const [password, setPassword] = useState("");
  const reset = useMutation({ mutationFn: () => api.post("/auth/reset-password", { token, password }) });

  if (!token || expiredLink(reset.error)) {
    return (
      <div>
        <AuthHeading title="This link no longer works">Reset links work once and expire. Ask for a new one.</AuthHeading>
        <Link to="/forgot-password" className={link}>
          Get a new reset link
        </Link>
      </div>
    );
  }
  if (reset.isSuccess) {
    return (
      <div>
        <AuthHeading title="Password changed">Every session was signed out. Sign in with your new password.</AuthHeading>
        <Link to="/login" search={{ next: undefined }} className={link}>
          Sign in
        </Link>
      </div>
    );
  }
  const submit = (e: FormEvent) => {
    e.preventDefault();
    reset.mutate();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <AuthHeading title="Choose a new password" />
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint="At least 12 characters. This signs out every session."
        error={fieldError(reset.error, "password")}
      />
      <ErrorNote error={reset.error} fields={["password"]} />
      <Button type="submit" variant="primary" busy={reset.isPending} className="mt-2">
        Set new password
      </Button>
    </form>
  );
}

export function VerifyEmailPage() {
  const { token } = useSearch({ from: "/public/verify-email" });
  const navigate = useNavigate();
  const sent = useRef(false);
  const verify = useMutation({
    mutationFn: () => api.post("/auth/verify-email", { token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  // A token works once, so the request must not repeat when React re-runs
  // effects in development.
  useEffect(() => {
    if (token && !sent.current) {
      sent.current = true;
      verify.mutate();
    }
  }, [token, verify]);

  if (!token || expiredLink(verify.error)) {
    return (
      <div>
        <AuthHeading title="This link no longer works">
          Confirmation links work once and expire. Sign in to send yourself a new one.
        </AuthHeading>
        <Link to="/login" search={{ next: undefined }} className={link}>
          Sign in
        </Link>
      </div>
    );
  }
  if (verify.isSuccess) {
    return (
      <div>
        <AuthHeading title="Address confirmed">Your account is ready.</AuthHeading>
        <Button variant="primary" onClick={() => void navigate({ to: "/" })}>
          Continue
        </Button>
      </div>
    );
  }
  return (
    <div>
      <AuthHeading title="Confirming your address" />
      <ErrorNote error={verify.error} />
    </div>
  );
}
