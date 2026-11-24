import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, TriangleAlert } from "lucide-react";
import { gatewayKeysQuery, useCreateGatewayKey, useRevokeGatewayKey, useSetKeyBudget } from "@/api/queries";
import type { Budget, GatewayKey } from "@/api/types";
import { ago, usd } from "@/ui/format";
import {
  Button,
  ConfirmDialog,
  CopyButton,
  Dialog,
  DialogActions,
  Empty,
  ErrorNote,
  Loading,
  Mono,
  PageHeader,
  Switch,
  Table,
  TextField,
  fieldError,
} from "@/ui/primitives";
import { BudgetFields, budgetFromForm, budgetToForm, type BudgetForm } from "@/features/budget/BudgetFields";

export function GatewayKeysPage() {
  const { data, isPending, error } = useQuery(gatewayKeysQuery);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ name: string; key: string } | null>(null);
  const [revoking, setRevoking] = useState<GatewayKey | null>(null);
  const [budgeting, setBudgeting] = useState<GatewayKey | null>(null);
  const [showRevoked, setShowRevoked] = useState(false);

  const active = data?.filter((k) => !k.revoked_at) ?? [];
  const revokedCount = (data?.length ?? 0) - active.length;
  const shown = showRevoked ? (data ?? []) : active;

  const createButton = (
    <Button variant="primary" onClick={() => setCreating(true)}>
      <Plus size={16} aria-hidden /> Create gateway key
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Gateway keys"
        description="Your apps authenticate with these instead of provider keys. Give each app its own, so you can cap or revoke it alone."
        action={active.length ? createButton : undefined}
      />
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorNote error={error} />
      ) : active.length === 0 && !showRevoked ? (
        <>
          <Empty title="No active gateway keys" action={createButton}>
            Create one, then send it as the bearer token from any OpenAI-compatible client.
          </Empty>
          {revokedCount > 0 && <RevokedToggle count={revokedCount} on={showRevoked} set={setShowRevoked} />}
        </>
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Last used</th>
                <th>Spent this month</th>
                <th className="w-0">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((k) => (
                <tr key={k.id} className={k.revoked_at ? "text-muted" : undefined}>
                  <td className="font-medium">
                    {k.name || "Unnamed"}
                    {k.revoked_at && <span className="ml-2 text-xs font-normal">Revoked {ago(k.revoked_at)}</span>}
                  </td>
                  <td>
                    <Mono className="text-muted">{k.prefix}…</Mono>
                  </td>
                  <td>{ago(k.last_used_at)}</td>
                  <td>
                    <KeySpend k={k} />
                  </td>
                  <td>
                    {!k.revoked_at && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setBudgeting(k)}>
                          Budget
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRevoking(k)}>
                          Revoke
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {revokedCount > 0 && <RevokedToggle count={revokedCount} on={showRevoked} set={setShowRevoked} />}
        </>
      )}

      <CreateKeyDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(name, key) => {
          setCreating(false);
          setRevealed({ name, key });
        }}
      />
      <RevealKeyDialog revealed={revealed} onClose={() => setRevealed(null)} />
      <BudgetDialog gatewayKey={budgeting} onClose={() => setBudgeting(null)} />
      <RevokeDialog gatewayKey={revoking} onClose={() => setRevoking(null)} />
    </>
  );
}

function RevokedToggle({ count, on, set }: { count: number; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="mt-4 max-w-xs">
      <Switch checked={on} onChange={set} label={`Show ${count} revoked`} />
    </div>
  );
}

function KeySpend({ k }: { k: GatewayKey }) {
  if (k.monthly_budget_usd == null) return <>{usd(k.spent_this_month_usd)}</>;
  return (
    <span>
      {usd(k.spent_this_month_usd)} <span className="text-muted">of {usd(k.monthly_budget_usd)}</span>
    </span>
  );
}

function CreateKeyDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (name: string, key: string) => void }) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState<BudgetForm>(budgetToForm({ monthly_budget_usd: null, budget_action: "block" }));
  const create = useCreateGatewayKey();
  const close = () => {
    setName("");
    create.reset();
    onClose();
  };
  return (
    <Dialog open={open} onClose={close} title="Create gateway key">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            { name, ...budgetFromForm(budget) },
            {
              onSuccess: (k) => {
                setName("");
                create.reset();
                onCreated(k.name, k.key);
              },
            },
          );
        }}
      >
        <TextField
          label="Name"
          placeholder="My chat app, production"
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint="Where this key will be used."
          error={fieldError(create.error, "name")}
        />
        <BudgetFields value={budget} onChange={setBudget} error={create.error} scope="key" />
        <ErrorNote error={create.error} fields={["name", "monthly_budget_usd", "budget_action"]} />
        <DialogActions>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" busy={create.isPending}>
            Create key
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** The only time the full key exists outside the app that uses it. */
function RevealKeyDialog({ revealed, onClose }: { revealed: { name: string; key: string } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const close = () => {
    setCopied(false);
    onClose();
  };
  return (
    <Dialog open={!!revealed} onClose={close} dismissible={false} title="Copy your new key" width="lg">
      {revealed && (
        <>
          <p className="flex items-start gap-2 text-sm">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-caution" aria-hidden />
            This is the only time the full key is shown. Store it in your app's secrets or a password manager now.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-control border border-line bg-paper p-2 pl-3">
            <Mono className="min-w-0 flex-1 break-all select-all">{revealed.key}</Mono>
            <CopyButton value={revealed.key} onCopied={() => setCopied(true)} />
          </div>
          <DialogActions>
            <Button variant={copied ? "primary" : "secondary"} onClick={close}>
              {copied ? "Done" : "I've stored it"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

function BudgetDialog({ gatewayKey, onClose }: { gatewayKey: GatewayKey | null; onClose: () => void }) {
  return (
    <Dialog open={!!gatewayKey} onClose={onClose} title={`Budget for ${gatewayKey?.name || "this key"}`}>
      {gatewayKey && <BudgetForm key={gatewayKey.id} gatewayKey={gatewayKey} onClose={onClose} />}
    </Dialog>
  );
}

function BudgetForm({ gatewayKey, onClose }: { gatewayKey: GatewayKey; onClose: () => void }) {
  const [form, setForm] = useState<BudgetForm>(budgetToForm(gatewayKey as Budget));
  const save = useSetKeyBudget();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(
          { id: gatewayKey.id, ...budgetFromForm(form) },
          {
            onSuccess: () => {
              toast.success("Budget saved");
              onClose();
            },
          },
        );
      }}
    >
      <BudgetFields value={form} onChange={setForm} error={save.error} scope="key" />
      <ErrorNote error={save.error} fields={["monthly_budget_usd", "budget_action"]} />
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" busy={save.isPending}>
          Save budget
        </Button>
      </DialogActions>
    </form>
  );
}

function RevokeDialog({ gatewayKey, onClose }: { gatewayKey: GatewayKey | null; onClose: () => void }) {
  const revoke = useRevokeGatewayKey();
  const close = () => {
    revoke.reset();
    onClose();
  };
  return (
    <ConfirmDialog
      open={!!gatewayKey}
      onClose={close}
      title="Revoke gateway key?"
      description={
        gatewayKey && (
          <>
            Apps using <span className="text-ink font-medium">{gatewayKey.name || "this key"}</span> (
            <Mono>{gatewayKey.prefix}…</Mono>) will be refused within a second. This cannot be undone.
          </>
        )
      }
      confirmLabel="Revoke key"
      busy={revoke.isPending}
      error={revoke.error}
      onConfirm={() =>
        gatewayKey &&
        revoke.mutate(gatewayKey.id, {
          onSuccess: () => {
            toast.success("Key revoked");
            close();
          },
        })
      }
    />
  );
}
