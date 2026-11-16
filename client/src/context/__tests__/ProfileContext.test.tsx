import { act, render, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import * as profileApi from "../../api/profile";
import { clearSession, loadSession } from "../../api/session";
import { ProfileProvider, useProfile } from "../ProfileContext";

jest.mock("../../api/profile");

// Another student who signed in on this device earlier
const STUDENT_A_ID = "33333333-3333-4333-8333-333333333333";

// A student who signs in during a test, and their profile as the server returns it
const NEW_ID = "22222222-2222-4222-8222-222222222222";
const NEW_STUDENT = {
  id: NEW_ID,
  name: "jdoe12",
  schoolEmail: "jdoe12@calvin.edu",
  classYear: null,
  bio: null,
  profilePhotoUrl: null,
};

// Renders the profile context the way the app does (no starting student)
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProfileProvider>{children}</ProfileProvider>
);

describe("ProfileContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Nobody signed in on this "device" at the start of each test
    clearSession();
    (profileApi.fetchProfile as jest.Mock).mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      name: "You",
      schoolEmail: "student@calvin.edu",
      classYear: null,
      bio: null,
      profilePhotoUrl: null,
    });
    (profileApi.updateProfileApi as jest.Mock).mockImplementation(
      async (_userId: string, updates: profileApi.UpdateProfileInput) => ({
        id: "11111111-1111-1111-1111-111111111111",
        name: updates.name ?? "You",
        schoolEmail: "student@calvin.edu",
        classYear: updates.classYear ?? 2027,
        bio: updates.bio ?? null,
        profilePhotoUrl: null,
      }),
    );
  });

  it("provides default profile data", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProfileProvider>{children}</ProfileProvider>
    );

    const { result } = await renderHook(() => useProfile(), { wrapper });

    expect(result.current.profile).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      displayName: "You",
      email: "student@calvin.edu",
      skillLevel: "Intermediate",
    });
  });

  it("updates profile fields when updateProfile is called", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProfileProvider>{children}</ProfileProvider>
    );

    const { result } = await renderHook(() => useProfile(), { wrapper });

    await act(async () => {
      await result.current.updateProfile({
        displayName: "Taylor Swift",
        skillLevel: "Advanced",
      });
    });

    expect(result.current.profile.displayName).toBe("Taylor Swift");
    expect(result.current.profile.skillLevel).toBe("Advanced");
    expect(result.current.profile.email).toBe("student@calvin.edu");
    expect(profileApi.updateProfileApi).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      {
        name: "Taylor Swift",
      },
    );
  });

  it("doesn't load a profile while nobody is signed in (the server would refuse anyway)", async () => {
    const { result } = await renderHook(() => useProfile(), { wrapper });
    // Let any start-up loading run
    await act(async () => {});

    expect(result.current.isSignedIn).toBe(false);
    expect(profileApi.fetchProfile).not.toHaveBeenCalled();
  });

  it("switches to the student who signed in and loads their own profile", async () => {
    // Student A has a bio and class year; the new student has neither yet
    (profileApi.fetchProfile as jest.Mock).mockImplementation(async (userId: string) =>
      userId === NEW_ID
        ? NEW_STUDENT
        : {
            id: userId,
            name: "Spongebob",
            schoolEmail: "alex.j@calvin.edu",
            classYear: 2026,
            bio: "Pickup hoops",
            profilePhotoUrl: null,
          },
    );
    const { result } = await renderHook(() => useProfile(), { wrapper });
    await act(async () => {
      result.current.setSignedInUser({ userId: STUDENT_A_ID, accessToken: "token-a" });
    });
    await waitFor(() => expect(result.current.profile.displayName).toBe("Spongebob"));

    // Then the new student signs in on the same device
    await act(async () => {
      result.current.setSignedInUser({ userId: NEW_ID, accessToken: "token-abc" });
    });

    // Their own details, loaded from the server, with nothing left over from student A
    await waitFor(() => expect(result.current.profile.displayName).toBe("jdoe12"));
    expect(profileApi.fetchProfile).toHaveBeenLastCalledWith(NEW_ID);
    expect(result.current.profile).toEqual({
      id: NEW_ID,
      displayName: "jdoe12",
      email: "jdoe12@calvin.edu",
      skillLevel: "Intermediate",
    });
  });

  it("starts signed out when nobody has signed in on this device", async () => {
    const { result } = await renderHook(() => useProfile(), { wrapper });

    expect(result.current.sessionChecked).toBe(true);
    expect(result.current.isSignedIn).toBe(false);
  });

  it("counts a test's starting student as signed in", async () => {
    const withStudent = ({ children }: { children: React.ReactNode }) => (
      <ProfileProvider
        startingProfile={{ id: NEW_ID, displayName: "jdoe12", email: "jdoe12@calvin.edu", skillLevel: "Beginner" }}
      >
        {children}
      </ProfileProvider>
    );

    const { result } = await renderHook(() => useProfile(), { wrapper: withStudent });

    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.profile.id).toBe(NEW_ID);
  });

  it("remembers who signed in, so a fresh start (like a reload) opens as them", async () => {
    (profileApi.fetchProfile as jest.Mock).mockResolvedValue(NEW_STUDENT);
    const first = await renderHook(() => useProfile(), { wrapper });
    await act(async () => {
      first.result.current.setSignedInUser({ userId: NEW_ID, accessToken: "token-abc" });
    });
    // Saved on this device
    expect(loadSession()).toEqual({ userId: NEW_ID, accessToken: "token-abc" });

    // The app starts again from scratch
    await first.unmount();
    const second = await renderHook(() => useProfile(), { wrapper });

    expect(second.result.current.isSignedIn).toBe(true);
    await waitFor(() => expect(second.result.current.profile.displayName).toBe("jdoe12"));
    expect(second.result.current.profile.id).toBe(NEW_ID);
    expect(profileApi.fetchProfile).toHaveBeenLastCalledWith(NEW_ID);
  });

  it("signs out: forgets the student on this device and goes back to the demo student", async () => {
    (profileApi.fetchProfile as jest.Mock).mockResolvedValue(NEW_STUDENT);
    const { result } = await renderHook(() => useProfile(), { wrapper });
    await act(async () => {
      result.current.setSignedInUser({ userId: NEW_ID, accessToken: "token-abc" });
    });
    expect(result.current.isSignedIn).toBe(true);

    await act(async () => {
      result.current.signOut();
    });

    expect(result.current.isSignedIn).toBe(false);
    expect(loadSession()).toBeNull();
    expect(result.current.profile.id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("never lets a slow load for the previous student overwrite the new student's profile", async () => {
    // Student A's profile is still loading when the new student signs in; A's arrives last
    let finishStudentALoad!: (profile: unknown) => void;
    (profileApi.fetchProfile as jest.Mock).mockImplementation((userId: string) =>
      userId === NEW_ID
        ? Promise.resolve(NEW_STUDENT)
        : new Promise((resolve) => {
            finishStudentALoad = resolve;
          }),
    );
    const { result } = await renderHook(() => useProfile(), { wrapper });
    await act(async () => {
      result.current.setSignedInUser({ userId: STUDENT_A_ID, accessToken: "token-a" });
    });

    await act(async () => {
      result.current.setSignedInUser({ userId: NEW_ID, accessToken: "token-abc" });
    });
    await waitFor(() => expect(result.current.profile.displayName).toBe("jdoe12"));

    // Student A's load finally finishes: it must not replace the signed-in student's details
    await act(async () => {
      finishStudentALoad({ ...NEW_STUDENT, id: STUDENT_A_ID, name: "Spongebob" });
    });

    expect(result.current.profile.displayName).toBe("jdoe12");
    expect(result.current.profile.id).toBe(NEW_ID);
  });

  it("throws an error when useProfile is called outside ProfileProvider", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: Error | null }
    > {
      state = { error: null };
      static getDerivedStateFromError(error: Error) {
        return { error };
      }
      render() {
        if (this.state.error) {
          const { Text } = require("react-native");
          return <Text testID="error">{(this.state.error as Error).message}</Text>;
        }
        return this.props.children;
      }
    }

    const Consumer = () => {
      useProfile();
      return null;
    };

    const { getByTestId } = await render(
      <ErrorBoundary>
        <Consumer />
      </ErrorBoundary>,
    );

    expect(getByTestId("error").props.children).toBe(
      "useProfile must be used within a ProfileProvider",
    );

    errorSpy.mockRestore();
  });
});
