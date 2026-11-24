import { MailCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ResendVerification } from "./pages";

export function VerifyGate({ email }: { email: string }) {
  return (
    <div className="max-w-lg py-10">
      <MailCheck size={28} className="text-relay" aria-hidden />
      <h1 className="mt-4 text-xl">Confirm your email to continue</h1>
      <p className="mt-2 text-muted">
        We sent a link to <span className="text-ink font-medium">{email}</span>. Until you open it, the gateway cannot
        hold provider keys or answer requests.
      </p>
      <div className="mt-6">
        <ResendVerification email={email} />
      </div>
      <p className="mt-8 text-sm text-muted">
        Wrong address, or think someone else signed up as you?{" "}
        <Link to="/account" className="font-medium text-relay underline-offset-4 hover:underline">
          Manage your account
        </Link>
      </p>
    </div>
  );
}
