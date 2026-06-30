import { Inngest } from "inngest";

// Event payloads.
export type Events = {
  "app/briefing.requested": {
    data: { userId: string; date?: string; force?: boolean };
  };
};

export const inngest = new Inngest({ id: "morning-briefing" });
