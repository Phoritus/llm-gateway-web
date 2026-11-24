import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { credentialsQuery, useCreateCredential, useDeleteCredential, useTestCredential } from "@/api/queries";
import { PROVIDERS, type Credential, type Provider } from "@/api/types";
import { ago, checkLabel, providerName } from "@/ui/format";
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogActions,
  Dot,
  Empty,
  ErrorNote,
  Field,
  Loading,
  Mono,
  PageHeader,
  Select,
  Table,
  TextField,
  fieldError,
} from "@/ui/primitives";

export function CredentialsPage() {
  const { data, isPending, error } = useQuery(credentialsQuery);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Credential | null>(null);

  const addButton = (
    <Button variant="primary" onClick={() => setAdding(true)}>
      <Plus size={16} aria-hidden /> Add provider key
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Provider keys"
        description="Your own API keys for each provider. They are encrypted at rest and only the last four characters are ever shown again."
        action={data?.length ? addButton : undefined}
      />
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorNote error={error} />
      ) : data.length === 0 ? (
        <Empty title="No provider keys yet" action={addButton}>
          Add a key from OpenAI, Anthropic, Groq, Gemini or another provider. Routes send requests with it.
        </Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Provider</th>
              <th>Key</th>
              <th>Health</th>
              <th className="w-0">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <CredentialRow key={c.id} credential={c} onDelete={() => setDeleting(c)} />
            ))}
          </tbody>
        </Table>
      )}
      <AddCredentialDialog open={adding} onClose={() => setAdding(false)} />
      <DeleteCredentialDialog credential={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function CredentialRow({ credential: c, onDelete }: { credential: Credential; onDelete: () => void }) {
  const test = useTestCredential();
  const check = c.last_check ? checkLabel[c.last_check.result] : null;
  return (
    <tr>
      <td className="font-medium">{c.name || <span className="text-muted">Unnamed</span>}</td>
      <td>
        {providerName[c.provider] ?? c.provider}
        {c.base_url && <Mono className="block text-muted truncate max-w-[28ch]">{c.base_url}</Mono>}
      </td>
      <td>
        <Mono className="text-muted">…{c.last4}</Mono>
      </td>
      <td>
        {check ? (
          <span className="inline-flex items-center gap-2" title={`Checked ${ago(c.last_check!.checked_at)}`}>
            <Dot tone={check.tone} />
            {check.text}
            <span className="text-xs text-muted">{ago(c.last_check!.checked_at)}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-muted">
            <Dot tone="idle" /> Not checked yet
          </span>
        )}
      </td>
      <td>
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            busy={test.isPending}
            onClick={() =>
              test.mutate(c.id, {
                onSuccess: (r) =>
                  r.ok ? toast.success(`${c.name || providerName[c.provider]} works`) : toast.error(r.message ?? "The provider refused the key."),
                onError: (e) => toast.error(e.message),
              })
            }
          >
            {test.isPending ? "Testing" : "Test"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

const choosable = PROVIDERS.filter((p) => p !== "mock" || import.meta.env.DEV);

function AddCredentialDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [provider, setProvider] = useState<Provider>("openai");
  const [name, setName] = useState("");
  const [secret, setSecret] = useState("");
  const [baseURL, setBaseURL] = useState("");
  const create = useCreateCredential();

  const close = () => {
    setName("");
    setSecret("");
    setBaseURL("");
    create.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title="Add provider key">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            { provider, name, secret, ...(provider === "custom" ? { base_url: baseURL } : {}) },
            {
              onSuccess: () => {
                toast.success("Provider key added");
                close();
              },
            },
          );
        }}
      >
        <Field label="Provider" error={fieldError(create.error, "provider")}>
          {({ id, describedBy, invalid }) => (
            <Select id={id} aria-describedby={describedBy} aria-invalid={invalid} value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
              {choosable.map((p) => (
                <option key={p} value={p}>
                  {providerName[p]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {provider === "custom" && (
          <TextField
            label="Base URL"
            mono
            required
            placeholder="https://llm.example.com/v1"
            value={baseURL}
            onChange={(e) => setBaseURL(e.target.value)}
            hint="Any OpenAI-compatible server reachable over https from the internet."
            error={fieldError(create.error, "base_url")}
          />
        )}
        <TextField
          label="Name"
          placeholder={`${providerName[provider]} personal`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint="Helps you tell keys apart. Optional."
          error={fieldError(create.error, "name")}
        />
        <TextField
          label="API key"
          mono
          required
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          error={fieldError(create.error, "secret")}
        />
        <ErrorNote error={create.error} fields={["provider", "base_url", "name", "secret"]} />
        <DialogActions>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" busy={create.isPending}>
            Add key
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function DeleteCredentialDialog({ credential, onClose }: { credential: Credential | null; onClose: () => void }) {
  const del = useDeleteCredential();
  const close = () => {
    del.reset();
    onClose();
  };
  return (
    <ConfirmDialog
      open={!!credential}
      onClose={close}
      title="Delete provider key?"
      description={
        credential && (
          <>
            <span className="text-ink font-medium">{credential.name || providerName[credential.provider]}</span> (…{credential.last4}) is removed
            from the gateway. The key itself stays valid at {providerName[credential.provider]}.
          </>
        )
      }
      confirmLabel="Delete key"
      busy={del.isPending}
      error={del.error}
      onConfirm={() =>
        credential &&
        del.mutate(credential.id, {
          onSuccess: () => {
            toast.success("Provider key deleted");
            close();
          },
        })
      }
    />
  );
}
