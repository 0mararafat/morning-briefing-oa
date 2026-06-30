// Robust JSON extraction — ported char-for-char from extract_json() in
// morning_dashboard_v4.py. Strips code fences, tries a direct parse, then
// brace-balances the first {...} or [...] (string/escape aware).
export function extractJson(text: string): unknown | null {
  let t = text.trim().replace(/^```(?:json)?\s*/, "");
  t = t.trim().replace(/\s*```\s*$/, "");

  try {
    return JSON.parse(t);
  } catch {
    // fall through to brace balancing
  }

  const pairs: Array<[string, string]> = [
    ["{", "}"],
    ["[", "]"],
  ];

  for (const [openC, closeC] of pairs) {
    const start = t.indexOf(openC);
    if (start === -1) continue;

    let depth = 0;
    let end = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = start; i < t.length; i++) {
      const c = t[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (c === "\\" && inString) {
        escapeNext = true;
        continue;
      }
      if (c === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (c === openC) {
        depth += 1;
      } else if (c === closeC) {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }

    if (end !== -1) {
      try {
        return JSON.parse(t.slice(start, end));
      } catch {
        continue;
      }
    }
  }

  return null;
}
