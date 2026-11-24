import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { meQuery, queryClient, useChangePassword, useLogoutAll } from "@/api/queries";
import { Button, ConfirmDialog, ErrorNote, Loading, PageHeader, Panel, TextField, fieldError } from "@/ui/primitives";

export function AccountPage() {
  const { data: me } = useQuery(meQuery);
  if (!me) return <Loading />;
  return (
    <>
      <PageHeader title="Account" description="Your sign-in and your sessions." />
      <div className="flex max-w-xl flex-col gap-10">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted">Email</dt>
          <dd>{me.user.email}</dd>
          <dt className="text-muted">Workspace</dt>
          <dd>{me.workspace.name}</dd>
        </dl>
        <PasswordForm />
        <SignOutEverywhere />
      </div>
    </>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const change = useChangePassword();

  return (
    <Panel className="p-5">
      <h2 className="mb-4 text-base">Change password</h2>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          change.mutate(
            { current_password: current, new_password: next },
            {
              onSuccess: () => {
                setCurrent("");
                setNext("");
                toast.success("Password changed");
              },
            },
          );
        }}
      >
        <TextField
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={fieldError(change.error, "current_password")}
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          hint="At least 12 characters."
          error={fieldError(change.error, "new_password")}
        />
        <ErrorNote error={change.error} fields={["current_password", "new_password"]} />
        <div>
          <Button type="submit" variant="primary" busy={change.isPending}>
            Change password
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function SignOutEverywhere() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const logoutAll = useLogoutAll();
  const close = () => {
    logoutAll.reset();
    setOpen(false);
  };
  return (
    <section>
      <h2 className="text-base">Sessions</h2>
      <p className="mb-3 mt-1 text-muted">Sign out of this browser and every other one where you are signed in.</p>
      <Button onClick={() => setOpen(true)}>Sign out everywhere</Button>
      <ConfirmDialog
        open={open}
        onClose={close}
        title="Sign out everywhere?"
        description="Every session ends, including this one. You will need to sign in again."
        confirmLabel="Sign out everywhere"
        busy={logoutAll.isPending}
        error={logoutAll.error}
        onConfirm={() =>
          logoutAll.mutate(undefined, {
            onSuccess: () => {
              queryClient.clear();
              void navigate({ to: "/login", search: { next: undefined } });
            },
          })
        }
      />
    </section>
  );
}
