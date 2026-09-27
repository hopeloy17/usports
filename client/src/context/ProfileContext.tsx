import React, { createContext, useContext, useState } from "react";

// Self-reported skill tiers from the SRS (informational labels only)
export const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

// Mirrors the `profiles` table: directory information only (FERPA)
export type Profile = {
  id: string;
  displayName: string;
  email: string;
  skillLevel: SkillLevel;
};

type ProfileContextType = {
  profile: Profile;
  updateProfile: (changes: Partial<Omit<Profile, "id" | "email">>) => void;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// Mock signed-in student until auth is wired up
const initialProfile: Profile = {
  id: "me",
  displayName: "You",
  email: "student@calvin.edu",
  skillLevel: "Intermediate",
};

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(initialProfile);

  const updateProfile: ProfileContextType["updateProfile"] = (changes) => {
    setProfile((prev) => ({ ...prev, ...changes }));
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
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
