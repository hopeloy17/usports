import { Picker } from "@react-native-picker/picker";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { useEvents } from "../../context/EventContext";
import {
  SKILL_LEVELS,
  SkillLevel,
  useProfile,
} from "../../context/ProfileContext";
import { colors, commonStyles } from "../../styles/common";

// Selectable options for the form's dropdowns and buttons
const SPORTS = [
  "Basketball",
  "Soccer",
  "Volleyball",
  "Tennis",
  "Football",
  "Frisbee",
];

const VENUES = [
  "Spoelhof Fieldhouse",
  "Gainey Athletic Complex",
  "Van Noord Arena",
];

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

  const today = toDateString(new Date());

  // One piece of state per field, each pre-filled so the form is submittable as-is
  const [sport, setSport] = useState(SPORTS[0]);
  const [venue, setVenue] = useState(VENUES[0]);
  const [date, setDate] = useState(today);
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(MINUTES[0]);
  const [meridiem, setMeridiem] = useState("PM");
  const [minPlayers, setMinPlayers] = useState(10);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("Intermediate");

  // Combine the separate date and time selections into the single ISO string
  // that Event.dateTime expects
  const handleSubmit = () => {
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

    createEvent({
      sport,
      venue,
      dateTime: dateTime.toISOString(),
      minPlayers,
      skillLevel,
      host: profile.displayName,
    });
  };

  return (
    <ScrollView
      style={commonStyles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={commonStyles.header}>Host a Game</Text>

      {/* Sport as a scrollable row of toggle buttons, venue as a dropdown */}
      <View style={[commonStyles.card, styles.card]}>
        <Text style={styles.label}>Sport</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.buttonContainer}
        >
          {SPORTS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setSport(option)}
              style={[
                styles.Button,
                sport === option && styles.ButtonSelected
              ]}
            >
              <Text
                style={[
                  styles.ButtonText,
                  sport === option && styles.ButtonTextSelected
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Venue</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={venue} onValueChange={setVenue}>
            {VENUES.map((option) => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
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
          <View style={[styles.pickerWrapper, styles.timePicker]}>
            <Picker selectedValue={hour} onValueChange={setHour}>
              {HOURS.map((option) => (
                <Picker.Item
                  key={option}
                  label={String(option)}
                  value={option}
                />
              ))}
            </Picker>
          </View>
          <View style={[styles.pickerWrapper, styles.timePicker]}>
            <Picker selectedValue={minute} onValueChange={setMinute}>
              {MINUTES.map((option) => (
                <Picker.Item key={option} label={option} value={option} />
              ))}
            </Picker>
          </View>
          <View style={[styles.pickerWrapper, styles.timePicker]}>
            <Picker selectedValue={meridiem} onValueChange={setMeridiem}>
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
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={minPlayers} onValueChange={setMinPlayers}>
            {PLAYER_COUNTS.map((option) => (
              <Picker.Item key={option} label={String(option)} value={option} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Skill Level</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.buttonContainer}
        >
          {SKILL_LEVELS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setSkillLevel(option)}
              style={[
                styles.Button,
                skillLevel === option && styles.ButtonSelected
              ]}
            >
              <Text
                style={[
                  styles.ButtonText,
                  skillLevel === option && styles.ButtonTextSelected
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Submits the form; the host is auto-joined by createEvent */}
      <Pressable
        style={[commonStyles.button, styles.submitButton]}
        onPress={handleSubmit}
      >
        <Text style={commonStyles.buttonText}>Create Game</Text>
      </Pressable>
    </ScrollView>
  );
}

// Layout only; colors and card/button styling come from commonStyles
const styles = StyleSheet.create({
  content: { paddingBottom: 40, gap: 16 },
  card: { marginHorizontal: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    overflow: "hidden",
  },
  timeRow: { flexDirection: "row", gap: 8 },
  timePicker: { flex: 1 },
  submitButton: { marginHorizontal: 16 },

  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  scrollViewContainer: {
    width: '100%'
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
    backgroundColor:colors.primary,
    borderColor: colors.primary,
  },
  ButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3D3D3A',
  },
  ButtonTextSelected: {
    color: '#FFFFFF',
  },
});
