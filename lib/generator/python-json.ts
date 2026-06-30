// pythonJsonDumps — reproduces Python's json.dumps() default output so the
// pattern-watch prompt (which embeds the briefing payload as text) is
// byte-identical to the Python reference. Differences from JSON.stringify:
//   - item separator ", " and key separator ": " (json.dumps defaults)
//   - ensure_ascii=True: every code unit outside 0x20..0x7e is escaped \uXXXX
//     (astral chars become surrogate pairs, matching Python)
// This is the deliberate resolution of the "json.dumps vs JSON.stringify"
// parity trap flagged in the plan.

function escapeString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const code = s.charCodeAt(i);
    switch (ch) {
      case '"':
        out += '\\"';
        break;
      case "\\":
        out += "\\\\";
        break;
      case "\n":
        out += "\\n";
        break;
      case "\t":
        out += "\\t";
        break;
      case "\r":
        out += "\\r";
        break;
      case "\b":
        out += "\\b";
        break;
      case "\f":
        out += "\\f";
        break;
      default:
        if (code < 0x20 || code > 0x7e) {
          out += "\\u" + code.toString(16).padStart(4, "0");
        } else {
          out += ch;
        }
    }
  }
  return out + '"';
}

export function pythonJsonDumps(value: unknown): string {
  if (value === null || value === undefined) return "null";
  const t = typeof value;
  if (t === "boolean") return value ? "true" : "false";
  if (t === "number") {
    // Briefing payloads carry only integers/strings; match Python's str() for ints.
    return String(value);
  }
  if (t === "string") return escapeString(value as string);
  if (Array.isArray(value)) {
    return "[" + value.map((v) => pythonJsonDumps(v)).join(", ") + "]";
  }
  if (t === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined
    );
    return (
      "{" +
      entries.map(([k, v]) => `${escapeString(k)}: ${pythonJsonDumps(v)}`).join(", ") +
      "}"
    );
  }
  return "null";
}
