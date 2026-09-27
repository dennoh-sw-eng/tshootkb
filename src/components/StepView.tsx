import CommandBlock from "./CommandBlock";

export default function StepView({ step, index }: { step: any; index: number }) {
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <span className="badge">Step {index + 1}</span>
        <span className="badge">{step.type}</span>
      </div>
      {step.title && <h3 className="font-semibold">{step.title}</h3>}
      {step.content && <p className="text-sm whitespace-pre-wrap">{step.content}</p>}

      {step.type === "COMMAND" && step.command && <CommandBlock command={step.command} shell={step.shell} />}

      {step.type === "WARNING" && (
        <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-3 text-sm text-amber-200">
          ⚠ WARNING — {step.warning || step.content}
        </div>
      )}

      {step.type === "NOTE" && (
        <div className="rounded-lg border border-sky-800 bg-sky-950/30 p-3 text-sm text-sky-200">
          💡 NOTE — {step.notes || step.content}
        </div>
      )}

      {step.type === "LINK" && step.linkUrl && (
        <a href={step.linkUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline text-sm">
          🔗 {step.linkLabel || step.linkUrl}
        </a>
      )}

      {step.type === "CHECKPOINT" && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">
          ✅ Checkpoint — {step.content}
        </div>
      )}

      {step.type === "DECISION" && (
        <div className="rounded-lg border border-purple-800 bg-purple-950/30 p-3 text-sm text-purple-200 space-y-1">
          <div>❓ {step.content}</div>
          {step.decisionYesStepOrder != null && <div>YES → go to step {step.decisionYesStepOrder + 1}</div>}
          {step.decisionNoStepOrder != null && <div>NO → go to step {step.decisionNoStepOrder + 1}</div>}
        </div>
      )}

      {step.attachments?.map((a: any) => (
        <figure key={a.id} className="space-y-1">
          <img src={a.path} alt={a.caption || ""} className="rounded-lg border border-[var(--border)] max-w-full" />
          {a.caption && <figcaption className="text-xs text-[var(--muted)]">{a.caption}</figcaption>}
        </figure>
      ))}

      {step.expectedResult && (
        <div className="text-xs text-[var(--muted)]">
          <span className="font-semibold">Expected result: </span>{step.expectedResult}
        </div>
      )}
      {step.warning && step.type !== "WARNING" && (
        <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-2 text-xs text-amber-200">⚠ {step.warning}</div>
      )}
      {step.notes && step.type !== "NOTE" && (
        <div className="text-xs text-[var(--muted)]">💡 {step.notes}</div>
      )}
    </div>
  );
}
