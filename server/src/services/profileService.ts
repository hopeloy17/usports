// Zuriel's Supabase data functions for the users table
import { getProfile, updateProfile } from "../db";
import { NotFoundError, ValidationError } from "./errors";

// The profile as the API sends it: camelCase, and only the fields a client should see
// (internal columns like email_verified and created_at stay in the database)
export type Profile = {
  id: string;
  name: string;
  schoolEmail: string;
  classYear: number | null;
  bio: string | null;
  profilePhotoUrl: string | null;
};

// Longest bio we accept, so profiles stay readable in the app
const MAX_BIO_LENGTH = 500;

// Range of graduation years we accept for classYear
const MIN_CLASS_YEAR = 2000;
const MAX_CLASS_YEAR = 2100;

// Standard UUID format (8-4-4-4-12 hex digits); users.id is a Postgres uuid,
// so anything else would make the database query itself fail with a 500
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Editable profile fields: the camelCase name the client sends -> its users-table column.
// Anything not listed here (schoolEmail, id, emailVerified...) is rejected, which matters
// because the server's Supabase key bypasses row-level security.
const EDITABLE_FIELDS = {
  name: "name",
  bio: "bio",
  classYear: "class_year",
} as const;

type EditableField = keyof typeof EDITABLE_FIELDS;

/**
 * Returns the profile of the given user.
 * @param userId - The user's id (a UUID); typed unknown because it comes straight from the request
 * @throws ValidationError if the id is missing or not a UUID
 * @throws NotFoundError if no user has that id
 */
export async function getUserProfile(userId: unknown): Promise<Profile> {
  const id = readUserId(userId);
  return toProfile(await findUserRow(id));
}

/**
 * Updates the editable fields (name, bio, classYear) of the given user's profile.
 * Only the fields present in the input are changed; bio and classYear can be cleared with null.
 * @param userId - The user's id (a UUID)
 * @param input - The request body; must be an object containing at least one editable field
 * @returns The profile after the update
 * @throws ValidationError if the id, the input, or any field value is invalid
 * @throws NotFoundError if no user has that id
 */
export async function updateUserProfile(userId: unknown, input: unknown): Promise<Profile> {
  const id = readUserId(userId);
  // Validate everything before touching the database, so a bad request writes nothing
  const columns = toColumnUpdates(input);

  // Check the user exists first so a missing user gets a clear 404 instead of a database error
  await findUserRow(id);

  return toProfile(await updateProfile(id, columns));
}

// Checks the user id is present and shaped like a UUID, and returns it as a string
function readUserId(userId: unknown): string {
  if (userId === undefined || userId === null || userId === "") {
    throw new ValidationError("User id is required");
  }

  if (typeof userId !== "string" || !UUID_PATTERN.test(userId)) {
    throw new ValidationError("Invalid user id");
  }

  return userId;
}

// Loads the user's row, turning "no such user" into a NotFoundError
async function findUserRow(userId: string): Promise<Record<string, any>> {
  const row = await getProfile(userId);

  if (!row) {
    throw new NotFoundError("Profile not found");
  }

  return row;
}

// Validates the request body and converts it to { column: value } for the users table
function toColumnUpdates(input: unknown): Record<string, unknown> {
  // Arrays are objects in JavaScript, so they need their own check
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError("Invalid profile data");
  }

  const fields = Object.entries(input);

  if (fields.length === 0) {
    throw new ValidationError("No profile fields to update");
  }

  const columns: Record<string, unknown> = {};

  for (const [field, value] of fields) {
    if (!isEditableField(field)) {
      throw new ValidationError(`Field cannot be updated: ${field}`);
    }

    validateField(field, value);
    columns[EDITABLE_FIELDS[field]] = value;
  }

  return columns;
}

// Narrows a field name to one of the editable fields.
// hasOwnProperty (not "in") so inherited names like "toString" don't count as editable.
function isEditableField(field: string): field is EditableField {
  return Object.prototype.hasOwnProperty.call(EDITABLE_FIELDS, field);
}

// Throws a ValidationError naming the field if its value breaks that field's rule
function validateField(field: EditableField, value: unknown): void {
  switch (field) {
    case "name":
      // users.name is NOT NULL, so it must be real text, never blank or null
      if (typeof value !== "string" || value.trim() === "") {
        throw new ValidationError("Invalid name");
      }
      return;

    case "bio":
      // null clears the bio
      if (value !== null && (typeof value !== "string" || value.length > MAX_BIO_LENGTH)) {
        throw new ValidationError("Invalid bio");
      }
      return;

    case "classYear":
      // null clears the class year; otherwise a whole number in range (a string like "2027" is rejected)
      if (
        value !== null &&
        (typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < MIN_CLASS_YEAR ||
          value > MAX_CLASS_YEAR)
      ) {
        throw new ValidationError("Invalid class year");
      }
      return;
  }
}

// Converts a users-table row (snake_case) into the public camelCase profile
function toProfile(row: Record<string, any>): Profile {
  return {
    id: row.id,
    name: row.name,
    schoolEmail: row.school_email,
    classYear: row.class_year,
    bio: row.bio,
    profilePhotoUrl: row.profile_photo_url,
  };
}
