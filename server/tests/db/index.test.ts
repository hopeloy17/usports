import { getEventRows, getParticipantStatus, updateEventStatus } from "../../src/db";
import { supabase } from "../../src/db/client";

jest.mock("../../src/db/client", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockedSupabase = jest.mocked(supabase);

function createQueryBuilder(result: { data: unknown; error: Error | null }) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    gte: jest.fn(),
    lt: jest.fn(),
    match: jest.fn(),
    update: jest.fn(),
    maybeSingle: jest.fn(),
    then: jest.fn((resolve) => resolve(result)),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lt.mockReturnValue(query);
  query.match.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.maybeSingle.mockReturnValue(result);

  return query;
}

describe("getEventRows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("applies sport and date filters and normalizes relationship arrays", async () => {
    const query = createQueryBuilder({
      data: [
        {
          id: "event-1",
          title: "Casual 3v3 Runs",
          start_time: "2030-06-15T18:00:00.000Z",
          description: null,
          min_players: 4,
          max_players: 6,
          skill_level: null,
          status: "open",
          host_id: "user-1",
          host: [{ name: "Alex Johnson" }],
          sport: [{ name: "Basketball" }],
          venue: [{ name: "Fieldhouse" }],
          participants: [
            { status: "going", user: [{ name: "Alex Johnson" }] },
          ],
        },
      ],
      error: null,
    });
    mockedSupabase.from.mockReturnValue(query as never);

    const result = await getEventRows({
      sport: "Basketball",
      date: "2030-06-15",
    });

    expect(mockedSupabase.from).toHaveBeenCalledWith("events");
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("sport:sports!inner(name)"));
    expect(query.eq).toHaveBeenCalledWith("sports.name", "Basketball");
    expect(query.gte).toHaveBeenCalledWith(
      "start_time",
      "2030-06-15T00:00:00.000Z",
    );
    expect(query.lt).toHaveBeenCalledWith(
      "start_time",
      "2030-06-15T23:59:59.999Z",
    );
    expect(result[0].host).toEqual({ name: "Alex Johnson" });
    expect(result[0].participants[0].user).toEqual({ name: "Alex Johnson" });
  });

  it("surfaces Supabase query errors", async () => {
    const query = createQueryBuilder({
      data: null,
      error: new Error("database unavailable"),
    });
    mockedSupabase.from.mockReturnValue(query as never);

    await expect(getEventRows()).rejects.toThrow(
      "getEventRows error: database unavailable",
    );
  });

  it("returns a participant status or null when no participant exists", async () => {
    const query = createQueryBuilder({ data: { status: "going" }, error: null });
    mockedSupabase.from.mockReturnValue(query as never);

    await expect(getParticipantStatus("event-1", "user-1")).resolves.toBe("going");
    expect(query.match).toHaveBeenCalledWith({
      event_id: "event-1",
      user_id: "user-1",
    });
  });

  it("updates an event status", async () => {
    const query = createQueryBuilder({ data: null, error: null });
    mockedSupabase.from.mockReturnValue(query as never);

    await expect(updateEventStatus("event-1", "full")).resolves.toBeUndefined();
    expect(mockedSupabase.from).toHaveBeenCalledWith("events");
    expect(query.update).toHaveBeenCalledWith({ status: "full" });
    expect(query.eq).toHaveBeenCalledWith("id", "event-1");
  });
});
