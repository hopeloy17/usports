import { ServerEvent } from "../src/api/events";

// An in-memory copy of the server's REST API, so e2e tests can run the real
// client code without a network. It follows the same rules as
// server/src/services/eventService.ts (cancelled, full, double-join, host).
// Install it with `fakeApi.install()` and reset it with `fakeApi.reset(seed)`.

type JsonResponse = { ok: boolean; status: number; statusText: string; json: () => Promise<unknown> };

function respond(status: number, body: unknown): JsonResponse {
  return { ok: status < 400, status, statusText: String(status), json: async () => body };
}

function fail(status: number, error: string): JsonResponse {
  return respond(status, { error });
}

export function createFakeApi() {
  let events: ServerEvent[] = [];
  let nextId = 100;
  let profileState: Record<string, { name: string; schoolEmail: string; bio?: string | null; classYear?: number | null }> = {};

  // Applies a join or leave to one event, enforcing the same rules as the server
  function changeRoster(event: ServerEvent, participant: string, joining: boolean): JsonResponse {
    if (joining) {
      if (event.status === "cancelled") return fail(409, "Event is cancelled");
      if (event.roster.includes(participant)) return fail(409, "Participant has already joined");
      if (event.maxPlayers !== undefined && event.joinedCount >= event.maxPlayers) {
        return fail(409, "Event is full");
      }
      event.roster = [...event.roster, participant];
      event.joinedCount += 1;
      if (event.maxPlayers !== undefined && event.joinedCount >= event.maxPlayers) {
        event.status = "full";
      }
    } else {
      if (!event.roster.includes(participant)) return fail(404, "Participant not found");
      if (participant === event.host) return fail(409, "The host cannot leave the event");
      event.roster = event.roster.filter((name) => name !== participant);
      event.joinedCount -= 1;
      if (event.status === "full") event.status = "open";
    }
    return respond(200, event);
  }

  // Handles one request the way the Express server would
  async function handle(url: string, init: RequestInit = {}): Promise<JsonResponse> {
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : {};
    const path = new URL(url).pathname;

    const headers = (init.headers as Record<string, string>) || {};
    const userId = headers["x-user-id"] || "11111111-1111-4111-8111-111111111111";
    const participant =
      profileState[userId]?.name ||
      ({ taylor: "Taylor", jordan: "Jordan" }[userId] ?? "Student");

    if (path === "/api/profile" && method === "GET") {
      const user = profileState[userId] || {
        name: "Student",
        schoolEmail: "student@calvin.edu",
        bio: null,
        classYear: 2027,
      };
      return respond(200, {
        id: userId,
        name: user.name,
        schoolEmail: user.schoolEmail,
        classYear: user.classYear ?? 2027,
        bio: user.bio ?? null,
        profilePhotoUrl: null,
      });
    }

    if (path === "/api/profile" && method === "PUT") {
      const current = profileState[userId] || {
        name: "Student",
        schoolEmail: "student@calvin.edu",
        bio: null,
        classYear: 2027,
      };
      const updated = {
        ...current,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.classYear !== undefined ? { classYear: body.classYear } : {}),
      };
      profileState[userId] = updated;
      return respond(200, {
        id: userId,
        name: updated.name,
        schoolEmail: updated.schoolEmail,
        classYear: updated.classYear ?? 2027,
        bio: updated.bio ?? null,
        profilePhotoUrl: null,
      });
    }

    if (path === "/api/events" && method === "GET") return respond(200, events);

    if (path === "/api/events" && method === "POST") {
      const created: ServerEvent = {
        ...body,
        id: String(nextId++),
        name: `${body.host}'s ${body.sport} Game`,
        joinedCount: 1,
        status: "open",
        roster: [body.host],
      };
      events = [...events, created];
      return respond(201, created);
    }

    const match = path.match(/^\/api\/events\/([^/]+)(\/join)?$/);
    const event = match && events.find((candidate) => candidate.id === match[1]);
    if (!match || !event) return fail(404, "Event not found");

    if (!match[2] && method === "GET") return respond(200, event);
    if (match[2] && method === "POST") return changeRoster(event, participant, true);
    if (match[2] && method === "DELETE") return changeRoster(event, participant, false);
    return fail(404, "Not found");
  }

  return {
    // Replaces everything in the fake database with a fresh copy of the seed
    reset(seed: ServerEvent[]) {
      events = structuredClone(seed);
      nextId = 100;
    },
    // What the "server" currently holds, for assertions
    getEvents: () => events,
    // Points the client's fetch at this fake
    install() {
      globalThis.fetch = jest.fn((url: unknown, init?: RequestInit) =>
        handle(String(url), init),
      ) as unknown as typeof fetch;
    },
  };
}
