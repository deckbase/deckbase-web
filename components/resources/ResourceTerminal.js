import { cn } from "@/components/resources/cn";

/** macOS-style window chrome + dark terminal body. */
export function TerminalWindow({ title = "deckbase — mcp-session", children, className }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#30363d] bg-[#0d1117] font-mono text-[13px] leading-relaxed shadow-2xl ring-1 ring-black/40 sm:text-[13.5px]",
        className
      )}
    >
      <TerminalTitleBar title={title} />
      <div className="overflow-x-auto p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function TerminalTitleBar({ title }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#21262d] bg-[#161b22] px-3 py-2.5">
      <span className="flex gap-1.5" aria-hidden>
        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
      </span>
      <span className="flex-1 text-center text-[11px] font-medium tracking-wide text-[#8b949e]">{title}</span>
      <span className="w-14 shrink-0" aria-hidden />
    </div>
  );
}

export function TerminalPromptSection({ comment, lines }) {
  return (
    <div className="mb-6 border-b border-[#21262d] pb-6">
      {comment ? <p className="mb-3 text-[#6e7681]">{comment}</p> : null}
      <ul className="space-y-2">
        {lines.map((line) => (
          <li key={line} className="text-[#7ee787]">
            <span className="select-none text-[#3fb950]">$ </span>
            <span className="text-[#aff5b4]/90">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TerminalSessionDivider({ className }) {
  return <p className={cn("mb-4 text-[11px] uppercase tracking-wider text-[#6e7681]", className)}>— session —</p>;
}

/** Split dialogue on blank lines; preserve single newlines. */
export function TerminalDialogueBody({ text }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((part, i) => (
        <p key={i} className="whitespace-pre-line leading-[1.65] text-[#c9d1d9]">
          {part.trim()}
        </p>
      ))}
    </div>
  );
}

export function TerminalUserTurn({ body }) {
  return (
    <>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#3fb950]">You</p>
      <p className="whitespace-pre-wrap border-l-2 border-[#238636] pl-3 text-[#7ee787]">{body}</p>
    </>
  );
}

export function TerminalAssistantTurn({ body, table }) {
  return (
    <>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#58a6ff]">Assistant</p>
      <div className="border-l-2 border-[#1f6feb] pl-3">
        <TerminalDialogueBody text={body} />
        {table ? <TerminalDataTable table={table} /> : null}
      </div>
    </>
  );
}

export function TerminalDataTable({ table }) {
  return (
    <div className="mt-4 overflow-x-auto rounded border border-[#30363d] bg-[#010409]">
      <table className="w-full min-w-[min(100%,520px)] border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-b border-[#30363d] bg-[#161b22]">
            {table.columns.map((col) => (
              <th key={col} className="px-3 py-2 font-semibold text-[#8b949e]">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[#21262d] last:border-0">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-[#c9d1d9]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
