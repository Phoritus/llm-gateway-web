import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsQuery, useSaveSettings } from "@/api/queries";
import type { WorkspaceSettings } from "@/api/types";
import { BudgetFields, budgetFromForm, budgetToForm, type BudgetForm } from "@/features/budget/BudgetFields";
import { Button, ErrorNote, Field, Input, Loading, PageHeader, Panel, Switch, fieldError } from "@/ui/primitives";

export function SettingsPage() {
  const { data, isPending, error } = useQuery(settingsQuery);
  return (
    <>
      <PageHeader title="Settings" description="Caching, prompt logging and the workspace budget." />
      {isPending ? <Loading /> : error ? <ErrorNote error={error} /> : <SettingsForm settings={data} />}
    </>
  );
}

type Draft = {
  cache: boolean;
  semantic: boolean;
  logging: boolean;
  retention: string;
  budget: BudgetForm;
};

function toDraft(s: WorkspaceSettings): Draft {
  return {
    cache: s.cache_enabled,
    semantic: s.semantic_cache_enabled,
    logging: s.prompt_logging_enabled,
    retention: String(s.prompt_log_retention_days),
    budget: budgetToForm(s),
  };
}

function SettingsForm({ settings }: { settings: WorkspaceSettings }) {
  const [draft, setDraft] = useState(() => toDraft(settings));
  const save = useSaveSettings();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <form
      className="flex max-w-2xl flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        const body: WorkspaceSettings = {
          cache_enabled: draft.cache,
          semantic_cache_enabled: draft.semantic,
          prompt_logging_enabled: draft.logging,
          prompt_log_retention_days: Number(draft.retention),
          ...budgetFromForm(draft.budget),
        };
        save.mutate(body, {
          onSuccess: (saved) => {
            setDraft(toDraft(saved));
            toast.success("Settings saved");
          },
        });
      }}
    >
      <Panel className="flex flex-col gap-5 p-5">
        <h2 className="text-base">Caching</h2>
        <Switch
          checked={draft.cache}
          onChange={(v) => set("cache", v)}
          label="Cache identical requests"
          description="Answer a repeated request from memory instead of calling a provider. Each route decides which requests qualify."
        />
        <Switch
          checked={draft.semantic}
          onChange={(v) => set("semantic", v)}
          label="Semantic cache"
          description="Also reuse answers to requests that mean the same thing but are worded differently."
        />
      </Panel>

      <Panel className="flex flex-col gap-5 p-5">
        <h2 className="text-base">Prompt logging</h2>
        <Switch
          checked={draft.logging}
          onChange={(v) => set("logging", v)}
          label="Keep requests and responses"
          description="Stores a redacted copy of each call so you can read it under Logs."
        />
        <div className="max-w-48">
          <Field label="Keep logs for (days)" hint="1 to 30." error={fieldError(save.error, "prompt_log_retention_days")}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                type="number"
                min={1}
                max={30}
                step={1}
                required
                value={draft.retention}
                onChange={(e) => set("retention", e.target.value)}
              />
            )}
          </Field>
        </div>
      </Panel>

      <Panel className="p-5">
        <BudgetFields value={draft.budget} onChange={(b) => set("budget", b)} error={save.error} scope="workspace" />
      </Panel>

      <ErrorNote error={save.error} fields={["prompt_log_retention_days", "monthly_budget_usd", "budget_action"]} />
      <div>
        <Button type="submit" variant="primary" busy={save.isPending}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
