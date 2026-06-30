"use client";

// Renders a stored standalone briefing HTML document in an isolated iframe.
// Interim viewer — later replaced by React components from the Claude Design
// system that render directly from the briefing JSON.
export function BriefingFrame({ html }: { html: string }) {
  return (
    <iframe
      title="Briefing"
      srcDoc={html}
      className="h-[80vh] w-full rounded-xl border border-border bg-surface"
    />
  );
}
