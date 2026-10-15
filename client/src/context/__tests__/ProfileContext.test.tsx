import { act, render, renderHook } from "@testing-library/react-native";
import React from "react";
import { ProfileProvider, useProfile } from "../ProfileContext";

describe("ProfileContext", () => {
  it("provides default profile data", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProfileProvider>{children}</ProfileProvider>
    );

    const { result } = await renderHook(() => useProfile(), { wrapper });

    expect(result.current.profile).toEqual({
      id: "me",
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
      result.current.updateProfile({
        displayName: "Taylor Swift",
        skillLevel: "Advanced",
      });
    });


    expect(result.current.profile.displayName).toBe("Taylor Swift");
    expect(result.current.profile.skillLevel).toBe("Advanced");
    expect(result.current.profile.email).toBe("student@calvin.edu");
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
