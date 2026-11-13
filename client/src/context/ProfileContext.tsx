import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_USER_ID,
  fetchProfile,
  updateProfileApi,
} from "../api/profile";

// Self-reported skill tiers from the SRS (informational labels only)
export const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

// Mirrors the `profiles` table: directory information only (FERPA)
export type Profile = {
  id: string;
  displayName: string;
  email: string;
  skillLevel: SkillLevel;
  bio?: string | null;
  classYear?: number | null;
};

type ProfileContextType = {
  profile: Profile;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (
    changes: Partial<Omit<Profile, "id" | "email">>,
  ) => Promise<void>;
};

export const ProfileContext = createContext<ProfileContextType | undefined>(
  undefined,
);

// Mock signed-in student until auth is wired up
const initialProfile: Profile = {
  id: DEFAULT_USER_ID,
  displayName: "You",
  email: "student@calvin.edu",
  skillLevel: "Intermediate",
};

// `startingProfile` lets tests (and later, real sign-in) start as a specific student
export function ProfileProvider({
  children,
  startingProfile,
}: {
  children: React.ReactNode;
  startingProfile?: Profile;
}) {
  const [profile, setProfile] = useState<Profile>(
    startingProfile ?? initialProfile,
  );
  const [loading, setLoading] = useState<boolean>(!startingProfile);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const serverProfile = await fetchProfile(profile.id);
      setProfile((prev) => ({
        ...prev,
        displayName: serverProfile.name || prev.displayName,
        email: serverProfile.schoolEmail || prev.email,
        ...(serverProfile.bio ? { bio: serverProfile.bio } : {}),
        ...(serverProfile.classYear ? { classYear: serverProfile.classYear } : {}),
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load profile";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => {
    if (!startingProfile) {
      refreshProfile();
    }
  }, [startingProfile, refreshProfile]);

  const updateProfile: ProfileContextType["updateProfile"] = async (
    changes,
  ) => {
    setError(null);
    try {
      const serverUpdates: {
        name?: string;
        bio?: string | null;
        classYear?: number | null;
      } = {};
      if (changes.displayName !== undefined) {
        serverUpdates.name = changes.displayName;
      }
      if (changes.bio !== undefined) {
        serverUpdates.bio = changes.bio;
      }
      if (changes.classYear !== undefined) {
        serverUpdates.classYear = changes.classYear;
      }

      if (Object.keys(serverUpdates).length > 0) {
        const updatedServerProfile = await updateProfileApi(
          profile.id,
          serverUpdates,
        );
        setProfile((prev) => ({
          ...prev,
          displayName: updatedServerProfile.name,
          email: updatedServerProfile.schoolEmail,
          bio: updatedServerProfile.bio,
          classYear: updatedServerProfile.classYear,
          ...(changes.skillLevel ? { skillLevel: changes.skillLevel } : {}),
        }));
      } else {
        setProfile((prev) => ({ ...prev, ...changes }));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
      throw err;
    }
  };

  return (
    <ProfileContext.Provider
      value={{ profile, loading, error, refreshProfile, updateProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

// Custom hook for easy access
export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context)
    throw new Error("useProfile must be used within a ProfileProvider");
  return context;
}
