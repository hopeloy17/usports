import { act, fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { EventProvider, useEvents } from "../../../context/EventContext";
import { ProfileProvider } from "../../../context/ProfileContext";
import ProfileScreen from "../profile";

const renderWithProviders = async (component: React.ReactElement) => {
  return await render(
    <ProfileProvider>
      <EventProvider>{component}</EventProvider>
    </ProfileProvider>,
  );
};

describe("ProfileScreen", () => {
  it("renders the profile details and empty games state", async () => {
    const { getByText } = await renderWithProviders(<ProfileScreen />);

    expect(getByText("student@calvin.edu")).toBeTruthy();
    expect(getByText("Intermediate")).toBeTruthy();
    expect(getByText("You haven't joined any games yet.")).toBeTruthy();
  });

  it("edits the display name and skill level", async () => {
    const { getByText, getByPlaceholderText } = await renderWithProviders(
      <ProfileScreen />,
    );

    await act(async () => fireEvent.press(getByText("Edit Profile")));
    await act(async () =>
      fireEvent.changeText(getByPlaceholderText("Your name"), "Jordan K."),
    );
    await act(async () => fireEvent.press(getByText("Advanced")));
    await act(async () => fireEvent.press(getByText("Save")));

    expect(getByText("Jordan K.")).toBeTruthy();
    expect(getByText("Advanced")).toBeTruthy();
  });

  it("lists games the user has joined", async () => {
    let toggleJoin: (id: string) => void = () => {};
    const JoinHelper = () => {
      toggleJoin = useEvents().toggleJoin;
      return null;
    };

    const { getByText } = await renderWithProviders(
      <>
        <JoinHelper />
        <ProfileScreen />
      </>,
    );

    await act(async () => toggleJoin("1"));

    expect(getByText("Basketball")).toBeTruthy();
    expect(getByText("📍 Spoelhof Fieldhouse")).toBeTruthy();
  });
});
