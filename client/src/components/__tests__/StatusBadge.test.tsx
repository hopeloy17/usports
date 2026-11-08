import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { colors } from "../../styles/common";
import StatusBadge from "../StatusBadge";

describe("StatusBadge", () => {
  it("shows an open game as a green 'Open' badge", async () => {
    const { getByText, getByTestId } = await render(<StatusBadge status="open" />);

    expect(getByText("Open")).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId("status-badge").props.style).backgroundColor).toBe(
      colors.success,
    );
  });

  it("shows a full game as a blue 'Full' badge", async () => {
    const { getByText, getByTestId } = await render(<StatusBadge status="full" />);

    expect(getByText("Full")).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId("status-badge").props.style).backgroundColor).toBe(
      colors.information,
    );
  });

  it("shows a cancelled game as a red 'Cancelled' badge", async () => {
    const { getByText, getByTestId } = await render(<StatusBadge status="cancelled" />);

    expect(getByText("Cancelled")).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId("status-badge").props.style).backgroundColor).toBe(
      colors.danger,
    );
  });
});
