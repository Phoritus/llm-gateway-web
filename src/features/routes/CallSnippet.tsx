import { CopyButton } from "@/ui/primitives";

export function CallSnippet({ alias }: { alias: string }) {
  const curl = `curl ${window.location.origin}/v1/chat/completions \\
  -H "Authorization: Bearer $GATEWAY_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${alias}", "messages": [{"role": "user", "content": "Hello"}]}'`;
  return (
    <div className="flex items-start rounded-panel border border-line bg-surface">
      <pre className="min-w-0 flex-1 overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">{curl}</pre>
      <div className="shrink-0 p-3">
        <CopyButton value={curl} />
      </div>
    </div>
  );
}
