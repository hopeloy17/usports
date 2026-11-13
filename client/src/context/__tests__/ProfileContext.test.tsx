import { act, render, renderHook } from "@testing-library/react-native";
import React from "react";
import * as profileApi from "../../api/profile";
import { ProfileProvider, useProfile } from "../ProfileContext";

jest.mock("../../api/profile");

describe("ProfileContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
