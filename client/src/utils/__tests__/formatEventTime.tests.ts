import { datePickerStyle } from "@expo/ui/swift-ui/modifiers";
import {formatEventDateTime} from "../formatEventTime";
import { toHaveDisplayValue } from "@testing-library/react-native/matchers";


// tests for diffent callender dates; toHaveDisplayValue, tomorrow and any day further out
describe("formateventDateTime", () => {
    it("formats a same-day event as 'Tonight @ ...'", () => {
        const today = new Date();
        today.setHours(19, 0, 0, 0); // 7:00pm
        const iso = today.toISOString();

        expect(formatEventDateTime(iso)).toBe("Tonight @ 7:00 PM");
    });

    it("formats a same-day event as 'Tomorrow @ ...'", () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() +1);
        tomorrow.setHours(17, 30, 0, 0); // 5:30 PM
        const iso = tomorrow.toISOString();

        expect(formatEventDateTime(iso)).toBe("Tomorrow @ 5:30 PM");
    });

    it("formats a same-day event as 'Tomorrow @ ...'", () => {
        const future = new Date();
        future.setDate(future.getDate() +7);
        future.setHours(18, 0, 0, 0); // 6:00 PM
        const iso = future.toISOString();

        const expectedMonthDay = future.toLocaleDateString("en-US", {month: "short", day: "numeric"})
        expect(formatEventDateTime(iso)).toBe(`${expectedMonthDay} @ 6:00 PM`);
    });
})