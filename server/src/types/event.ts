export type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

export type Event = {
  id: string;
  name: string;
  sport: string;
  venue: string;
  dateTime: string;
  joinedCount: number;
  minPlayers: number;
  skillLevel: SkillLevel;
  host: string;
  roster: string[];
  description?: string;
};

export type CreateEventInput = {
  sport: string;
  venue: string;
  dateTime: string;
  minPlayers: number;
  skillLevel: SkillLevel;
  host: string;
  description?: string;
};

export type UpdateEventInput = Partial<Omit<Event, "id">>;