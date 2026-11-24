import type { Budget, BudgetAction } from "@/api/types";
import { Field, Input, Select, Switch, fieldError } from "@/ui/primitives";

export type BudgetForm = { enabled: boolean; amount: string; action: BudgetAction };

export function budgetToForm(b: Budget): BudgetForm {
  return {
    enabled: b.monthly_budget_usd != null,
    amount: b.monthly_budget_usd != null ? String(b.monthly_budget_usd) : "",
    action: b.budget_action,
  };
}

export function budgetFromForm(f: BudgetForm): Budget {
  return {
    monthly_budget_usd: f.enabled ? Number(f.amount || 0) : null,
    budget_action: f.action,
  };
}

export function BudgetFields({
  value,
  onChange,
  error,
  scope,
}: {
  value: BudgetForm;
  onChange: (v: BudgetForm) => void;
  error: unknown;
  scope: "key" | "workspace";
}) {
  return (
    <div className="flex flex-col gap-4">
      <Switch
        checked={value.enabled}
        onChange={(enabled) => onChange({ ...value, enabled })}
        label="Monthly budget"
        description={
          scope === "key"
            ? "Cap what this key may spend on paid models each calendar month (UTC)."
            : "Cap what the whole workspace may spend on paid models each calendar month (UTC)."
        }
      />
      {value.enabled && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (USD)" hint="0 allows free tiers only." error={fieldError(error, "monthly_budget_usd")}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                required
                value={value.amount}
                onChange={(e) => onChange({ ...value, amount: e.target.value })}
              />
            )}
          </Field>
          <Field label="When it runs out" error={fieldError(error, "budget_action")}>
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={value.action}
                onChange={(e) => onChange({ ...value, action: e.target.value as BudgetAction })}
              >
                <option value="block">Use free tiers only</option>
                <option value="warn">Keep going, email me</option>
              </Select>
            )}
          </Field>
        </div>
      )}
    </div>
  );
}
