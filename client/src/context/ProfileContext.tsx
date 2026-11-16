import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { SignInResult } from "../api/auth";
import {
  DEFAULT_USER_ID,
  fetchProfile,
  updateProfileApi,
} from "../api/profile";
import {
  SESSION_NOT_CHECKED,
  clearSession,
  getSavedSessionSnapshot,
  getServerSessionSnapshot,
  parseSession,
  saveSession,
  subscribeToSession,
} from "../api/session";

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
  // True when someone is signed in on this device (on the web this survives a reload)
  isSignedIn: boolean;
  // False only while the web page is still starting up and hasn't read the saved sign-in yet.
  // Screens that redirect based on isSignedIn wait for this, so nobody is bounced by mistake
  sessionChecked: boolean;
  // Remembers the student who just signed in on this device and loads their profile
  setSignedInUser: (signIn: SignInResult) => void;
  // Signs out: forgets the signed-in student on this device
  signOut: () => void;
};

export const ProfileContext = createContext<ProfileContextType | undefined>(
  undefined,
);

// The demo student shown while nobody is signed in
const initialProfile: Profile = {
  id: DEFAULT_USER_ID,
  displayName: "You",
  email: "student@calvin.edu",
  skillLevel: "Intermediate",
};

// An empty profile for a student whose details haven't loaded yet. Starting blank means
// nothing from the previous student (name, bio, class year) ever shows for the new one
function blankProfile(id: string): Profile {
  return { id, displayName: "", email: "", skillLevel: initialProfile.skillLevel };
}

// `startingProfile` lets tests start as a specific student, already signed in
// (real sign-in goes through setSignedInUser)
export function ProfileProvider({
  children,
  startingProfile,
}: {
  children: React.ReactNode;
  startingProfile?: Profile;
}) {
  // Who's signed in on this device. useSyncExternalStore re-reads the saved sign-in whenever
  // someone signs in or out. While the web page is still being built on the server it reports
  // SESSION_NOT_CHECKED ("don't know yet"), and the browser fills in the real answer on load
  const savedText = useSyncExternalStore(
    subscribeToSession,
    getSavedSessionSnapshot,
    getServerSessionSnapshot,
  );
  const savedSession = useMemo(
    () => (savedText === SESSION_NOT_CHECKED ? null : parseSession(savedText)),
    [savedText],
  );
  const sessionChecked = Boolean(startingProfile) || savedText !== SESSION_NOT_CHECKED;
  const isSignedIn = Boolean(startingProfile) || savedSession !== null;

  // Whose profile to show: a test's starting student, else whoever signed in, else the demo
  const currentId = startingProfile?.id ?? savedSession?.userId ?? initialProfile.id;

  // Loaded profiles, kept per student id, so a slow load for one student can never overwrite
  // another's details (e.g. the demo student's load finishing after someone signs in)
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>(() => {
    const first = startingProfile ?? initialProfile;
    return { [first.id]: first };
  });
  const profile = profilesById[currentId] ?? blankProfile(currentId);

  // True only while a profile load is in progress
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Loads the current student's profile from the server and stores it under their id
  const refreshProfile = useCallback(async () => {
    const id = currentId;
    setLoading(true);
    setError(null);
    try {
      const serverProfile = await fetchProfile(id);
      setProfilesById((all) => {
        const prev = all[id] ?? blankProfile(id);
        return {
          ...all,
          [id]: {
            ...prev,
            displayName: serverProfile.name || prev.displayName,
            email: serverProfile.schoolEmail || prev.email,
            ...(serverProfile.bio ? { bio: serverProfile.bio } : {}),
            ...(serverProfile.classYear ? { classYear: serverProfile.classYear } : {}),
          },
        };
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load profile";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentId]);

  // Load the profile once we know who's signed in, and again whenever that changes
  // (refreshProfile is rebuilt whenever currentId changes). Nobody signed in means nothing to
  // load: the server only answers with the signed-in student's own sign-in token
  useEffect(() => {
    if (!startingProfile && sessionChecked && isSignedIn) {
      refreshProfile();
    }
  }, [startingProfile, sessionChecked, isSignedIn, refreshProfile]);

  // Remembers the student who just signed in. Saving notifies useSyncExternalStore above, so
  // currentId switches to them and the effect loads their profile
  const setSignedInUser = useCallback((signIn: SignInResult) => {
    saveSession({ userId: signIn.userId, accessToken: signIn.accessToken });
  }, []);

  // Signs out: forgets the student on this device (screens then send them to sign-in)
  const signOut = useCallback(() => {
    clearSession();
  }, []);

  const updateProfile: ProfileContextType["updateProfile"] = async (
    changes,
  ) => {
    // Edits always belong to the student who was showing when they pressed Save
    const id = currentId;
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
          id,
          serverUpdates,
        );
        setProfilesById((all) => ({
          ...all,
          [id]: {
            ...(all[id] ?? blankProfile(id)),
            displayName: updatedServerProfile.name,
            email: updatedServerProfile.schoolEmail,
            bio: updatedServerProfile.bio,
            classYear: updatedServerProfile.classYear,
            ...(changes.skillLevel ? { skillLevel: changes.skillLevel } : {}),
          },
        }));
      } else {
        setProfilesById((all) => ({
          ...all,
          [id]: { ...(all[id] ?? blankProfile(id)), ...changes },
        }));
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
      value={{
        profile,
        loading,
        error,
        refreshProfile,
        updateProfile,
        isSignedIn,
        sessionChecked,
        setSignedInUser,
        signOut,
      }}
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
