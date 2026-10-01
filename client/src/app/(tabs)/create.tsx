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

const to24Hour = (hour: number, meridiem: string) => {
  if (meridiem === "AM") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
};

export default function CreateScreen() {
  const { createEvent } = useEvents();
  const { profile } = useProfile();

  const today = toDateString(new Date());

  const [sport, setSport] = useState(SPORTS[0]);
  const [venue, setVenue] = useState(VENUES[0]);
  const [date, setDate] = useState(today);
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(MINUTES[0]);
  const [meridiem, setMeridiem] = useState("PM");
  const [minPlayers, setMinPlayers] = useState(10);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("Intermediate");

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

      <View style={[commonStyles.card, styles.card]}>
        <Text style={styles.label}>Sport</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={sport} onValueChange={setSport}>
            {SPORTS.map((option) => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Venue</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={venue} onValueChange={setVenue}>
            {VENUES.map((option) => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={[commonStyles.card, styles.card]}>
        <Text style={styles.label}>Date</Text>
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
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={skillLevel} onValueChange={setSkillLevel}>
            {SKILL_LEVELS.map((option) => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
        </View>
      </View>

      <Pressable
        style={[commonStyles.button, styles.submitButton]}
        onPress={handleSubmit}
      >
        <Text style={commonStyles.buttonText}>Create Game</Text>
      </Pressable>
    </ScrollView>
  );
}

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
});
