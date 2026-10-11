import { Picker } from "@react-native-picker/picker";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { Stack, router } from "expo-router";
import { useEvents } from "../context/EventContext";
import {
  SKILL_LEVELS,
  SkillLevel,
  useProfile,
} from "../context/ProfileContext";
import { colors, commonStyles } from "../styles/common";

// Selectable options for the form's dropdowns and buttons
const SPORTS = [
  "Basketball",
  "Soccer",
  "Volleyball",
  "Tennis",
  "Football",
  "Frisbee",
  "Rock Climbing",
  "Spikeball"
];

export const CALVIN_VENUES = [
  "Spoelhof Fieldhouse",
  "Van Noord Arena",
  "Gainey Athletic Complex",
  "Hoogenboom Health & Rec Center",
  "Zuidema Soccer Stadium",
  "Huizenga Tennis Courts",
  "Venema Aquatic Center",
  "Strikwerda Climbing Wall",
  "Custom location",
];

export const VENUES = CALVIN_VENUES;

// Hours 1-12, quarter-hour slots, and player counts 2-30
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ["00", "15", "30", "45"];
const MERIDIEMS = ["AM", "PM"];
const PLAYER_COUNTS = Array.from({ length: 29 }, (_, i) => i + 2);

// Local calendar date as YYYY-MM-DD. Not toISOString(), which shifts to UTC
// and can land on the wrong day.
const toDateString = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// 12-hour clock to 24-hour. Midnight and noon are the awkward cases: 12 AM is
// hour 0, while 12 PM stays 12.
const to24Hour = (hour: number, meridiem: string) => {
  if (meridiem === "AM") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
};

export default function CreateScreen() {
  // createEvent adds the game; profile supplies the host, so it's never typed in
  const { createEvent } = useEvents();
  const { profile } = useProfile();

  // Gets todays date
  const today = toDateString(new Date());

  // One piece of state per field
  const [sport, setSport] = useState(SPORTS[0]);
  const [venue, setVenue] = useState(CALVIN_VENUES[0]);
  const [customVenue, setCustomVenue] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(MINUTES[0]);
  const [meridiem, setMeridiem] = useState("PM");
  const [minPlayers, setMinPlayers] = useState(10);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("Intermediate");

  // Combine the separate date and time selections into the single ISO string
  const handleSubmit = () => {
    const finalVenue =
      venue === "Custom location"
        ? (customVenue.trim() || "Custom location")
        : venue;
    const finalMinPlayers = Math.max(2, Number(minPlayers) || 10);
    const finalHost = profile?.displayName?.trim() || "You";

    const [year, month, day] = date.split("-").map(Number);
    const dateTime = new Date(
      year,
      month - 1,
      day,
      to24Hour(hour, meridiem),
      Number(minute),
      0,
      0,
    );
    const finalDateTime = Number.isNaN(dateTime.getTime())
      ? new Date().toISOString()
      : dateTime.toISOString();

    createEvent({
      sport,
      venue: finalVenue,
      description: description.trim(),
      dateTime: finalDateTime,
      minPlayers: finalMinPlayers,
      skillLevel,
      host: finalHost,
    });

    // Close the popup and take the user to the homepage feed
    router.replace("/(tabs)");
  };

  return (
    <ScrollView
      style={[commonStyles.container, { paddingTop: 16 }]}
      contentContainerStyle={styles.content}
      // Let taps reach buttons while the keyboard is open
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen
        options={{
          title: "Host a Game",
          headerLeft: () => (
            <Pressable
              onPress={() => router.replace("/(tabs)")}
              style={styles.headerBackButton}
              accessibilityLabel="Back to Home"
            >
              <Text style={styles.headerBackText}>‹ Home</Text>
            </Pressable>
          ),
        }}
      />

      {/* Sport as a grid of toggle buttons, venue as a dropdown, and description as a plain old textbox */}
      <View style={[commonStyles.card, styles.card]}>
        <Text style={styles.label}>Sport</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.buttonContainer}
        >
          {SPORTS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setSport(option)}
              style={[
                styles.Button,
                option === sport && styles.ButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.ButtonText,
                  option === sport && styles.ButtonTextSelected,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Venue</Text>
        <View style={styles.dropdownWrapper}>
          <Picker
            testID="venue-picker"
            selectedValue={venue}
            onValueChange={(val) => setVenue(val)}
            itemStyle={styles.dropdownPickerItem}
          >
            {CALVIN_VENUES.map((option) => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
        </View>

        {venue === "Custom location" && (
          <View style={styles.customLocationContainer}>
            <Text style={styles.customLocationPrompt}>Specify Custom Location</Text>
            <View style={styles.textInputWrapper}>
              <TextInput
                testID="custom-venue-input"
                style={styles.textInput}
                value={customVenue}
                onChangeText={setCustomVenue}
                placeholder="Enter custom location name..."
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>
          </View>
        )}

        {/* Input a description of the event */}
        <Text style={styles.label}>Description</Text>
        <View style={styles.textInputWrapper}>
          <TextInput
            multiline
            maxLength={500}
            style={[styles.textInput, { textAlignVertical: "top", height: 100 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add details about the game (e.g. gear to bring, skill expectations)..."
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      {/* When the game happens: calendar for the day, three pickers for the time */}
      <View style={[commonStyles.card, styles.card]}>
        <Text style={styles.label}>Date</Text>
        {/* minDate blocks scheduling games in the past */}
        <Calendar
          minDate={today}
          onDayPress={(day: { dateString: string }) => setDate(day.dateString)}
          markedDates={{
            [date]: { selected: true, selectedColor: colors.primary },
          }}
        />

        <Text style={styles.label}>Time</Text>
        <View style={styles.timeRow}>
          <View style={[styles.wheelPickerWrapper, styles.timePicker]}>
            <Picker selectedValue={hour} onValueChange={setHour} itemStyle={styles.wheelPicker}>
              {HOURS.map((option) => (
                <Picker.Item
                  key={option}
                  label={String(option)}
                  value={option}
                />
              ))}
            </Picker>
          </View>
          <View style={[styles.wheelPickerWrapper, styles.timePicker]}>
            <Picker selectedValue={minute} onValueChange={setMinute} itemStyle={styles.wheelPicker}>
              {MINUTES.map((option) => (
                <Picker.Item key={option} label={option} value={option} />
              ))}
            </Picker>
          </View>
          <View style={[styles.wheelPickerWrapper, styles.timePicker]}>
            <Picker selectedValue={meridiem} onValueChange={setMeridiem} itemStyle={styles.wheelPicker}>
              {MERIDIEMS.map((option) => (
                <Picker.Item key={option} label={option} value={option} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Headcount threshold and the skill tier the game is aimed at */}
      <View style={[commonStyles.card, styles.card]}>
        <Text style={styles.label}>Minimum Players</Text>
        <View style={styles.textInputWrapper}>
          <TextInput
            keyboardType="number-pad"
            value={minPlayers.toString()}
            style={styles.textInput}
            onChangeText={(text) => setMinPlayers(+text.replace(/[^0-9]/g, ''))}
          />
        </View>

        <Text style={styles.label}>Skill Level</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.buttonContainer}
        >
          {SKILL_LEVELS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setSkillLevel(option)}
              style={[
                styles.Button,
                skillLevel === option && styles.ButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.ButtonText,
                  skillLevel === option && styles.ButtonTextSelected,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Submits the form or returns to the homepage */}
      <View style={styles.actionRow}>
        <Pressable
          style={[commonStyles.button, styles.backButton, styles.secondaryButton]}
          onPress={() => router.replace("/(tabs)")}
          accessibilityLabel="Back to Home"
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={[commonStyles.button, styles.submitButton]}
          onPress={handleSubmit}
        >
          <Text style={commonStyles.buttonText}>Create Game</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// Layout only; colors and card/button styling come from commonStyles
const styles = StyleSheet.create({
  content: { paddingBottom: 40, gap: 16 },
  card: { marginHorizontal: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },

  // Textbox selectors
  textInputWrapper: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  textInput: {
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },

  // Dropdown selector
  dropdownWrapper: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: { height: 120 },
      default: {},
    }),
  },
  dropdownPickerItem: {
    fontSize: 16,
    color: colors.textPrimary,
    ...Platform.select({
      ios: { height: 120 },
      default: {},
    }),
  },
  customLocationContainer: {
    marginTop: 8,
    gap: 6,
  },
  customLocationPrompt: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  // Wheel selectors
  wheelPickerWrapper: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    overflow: "hidden",
    ...Platform.select({
      ios: { height: 120 },
      default: {},       // web/Android stay compact — they render a real dropdown
    }),
  },
  wheelPicker: {
    fontSize: 16,
    color: colors.textPrimary,
    ...Platform.select({
      ios: { height: 120 },
      default: {},       // web/Android stay compact — they render a real dropdown
    }),
  },
  timeRow: { flexDirection: "row", gap: 8, height: 120 },
  timePicker: { flex: 1, height: 120 },

  // Buttons
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
  },
  backButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  headerBackButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBackText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "600",
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  Button: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#E5E5E1',
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  ButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3D3D3A',
  },
  ButtonTextSelected: {
    color: "white",
  },
});
