import { supabase } from './client'; // or './database' if you named the client file database.ts

export interface EventFilter {
  sport_id?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Retrieves events with optional filtering by sport and date range.
 * @param filters - Optional sport_id, startDate, and endDate.
 * @returns List of raw event rows from the database.
 * @throws Error if the Supabase query fails.
 */
export async function getEvents(filters: EventFilter = {}) {
  let query = supabase.from('events').select('*');

  if (filters.sport_id !== undefined) {
    query = query.eq('sport_id', filters.sport_id);
  }
  if (filters.startDate) {
    query = query.gte('start_time', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('start_time', filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getEvents error: ${error.message}`);
  return data;
}

/**
 * Retrieves a single event by its UUID.
 * @param eventId - The unique ID of the event.
 * @returns The raw event object or null if not found.
 * @throws Error if the query fails.
 */
export async function getEventById(eventId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) throw new Error(`getEventById error: ${error.message}`);
  return data;
}

/**
 * Inserts a new event row into the events table.
 * @param eventData - An object matching the events table schema.
 * @returns The newly created raw event row.
 * @throws Error if inserting fails.
 */
export async function createEvent(eventData: Record<string, any>) {
  const { data, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()
    .single();

  if (error) throw new Error(`createEvent error: ${error.message}`);
  return data;
}

/**
 * Adds a user to an event's roster in the database.
 * 
 * Sets the default participant status to 'going'.
 *
 * @param {string} eventId - UUID of the target event.
 * @param {string} userId - UUID of the student joining the event.
 * @returns {Promise<Record<string, any>>} Resolves to the newly created event_participant record.
 * @throws {Error} If the user is already joined (violating the composite primary key),
 *                 if foreign keys fail, or if the Supabase query encounters an error.
 */
export async function addParticipant(eventId: string, userId: string): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('event_participants')
    .insert([
      {
        event_id: eventId,
        user_id: userId,
        status: 'going',
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`addParticipant failed for user ${userId} on event ${eventId}: ${error.message}`);
  }

  return data;
}

/**
 * Marks a participant's attendance status as 'cancelled'.
 * 
 * Preserves the audit record rather than deleting the row, matching the database design spec.
 *
 * @param {string} eventId - UUID of the event the user is leaving.
 * @param {string} userId - UUID of the student leaving the event.
 * @returns {Promise<Record<string, any>>} Resolves to the updated event_participant record.
 * @throws {Error} If the row cannot be updated or if the Supabase request fails.
 */
export async function removeParticipant(eventId: string, userId: string): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('event_participants')
    .update({ status: 'cancelled' })
    .match({ event_id: eventId, user_id: userId })
    .select()
    .single();

  if (error) {
    throw new Error(`removeParticipant failed for user ${userId} on event ${eventId}: ${error.message}`);
  }

  return data;
}

/**
 * Calculates the total number of confirmed active attendees for a specific event.
 * 
 * Only counts participants with the status 'going' (ignoring 'cancelled').
 *
 * @param {string} eventId - UUID of the event.
 * @returns {Promise<number>} Resolves to the count of confirmed participants (defaults to 0).
 * @throws {Error} If the count aggregation query fails.
 */
export async function getParticipantCount(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from('event_participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'going');

  if (error) {
    throw new Error(`getParticipantCount failed for event ${eventId}: ${error.message}`);
  }

  return count || 0;
}

/**
 * Fetches the complete profile information for a user.
 *
 * @param {string} userId - UUID of the user to fetch.
 * @returns {Promise<Record<string, any>|null>} Resolves to the user profile row, or null if no matching user exists.
 * @throws {Error} If the query fails due to a network or database issue.
 */
export async function getProfile(userId: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`getProfile failed for user ${userId}: ${error.message}`);
  }

  return data;
}

/**
 * Updates editable profile attributes for a specific user.
 *
 * @param {string} userId - UUID of the user whose profile is being modified.
 * @param {Record<string, any>} updates - Key-value map of fields to update (e.g., bio, class_year, name).
 * @returns {Promise<Record<string, any>>} Resolves to the newly updated user record.
 * @throws {Error} If the user is not found, updates violate check constraints, or the query fails.
 */
export async function updateProfile(userId: string, updates: Record<string, any>): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`updateProfile failed for user ${userId}: ${error.message}`);
  }

  return data;
}