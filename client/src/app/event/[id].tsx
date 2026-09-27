import { Stack, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEvents } from "../../context/EventContext";
import { formatEventDateTime } from "../../utils/formatEventTime";
import { colors, commonStyles } from "../../styles/common";

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, toggleJoin } = useEvents();

  // Find the exact event from our master list
  const event = events.find((e) => e.id === id);

  // If the event is not found, display an error message
  if (!event) return <Text style={{ padding: 40 }}>Event not found.</Text>;

  return (
    <ScrollView style={commonStyles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: `${event.sport} Game` }} />

      { /* Display the event details in a card-like format */ }
      <View style={[commonStyles.card, styles.headerCard]}>
        <Text style={styles.title}>{event.name}</Text>
        <Text style={styles.subtitle}>📍 {event.venue}</Text>
        <Text style={styles.subtitle}>🕒 {formatEventDateTime(event.dateTime)}</Text>
        <Text style={[commonStyles.skillBadge, styles.skillBadge]}>{event.skillLevel}</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Game Status</Text>
        <Text style={styles.statusText}>
          {event.joinedCount}/{event.minPlayers} players joined
        </Text>
        {event.joinedCount < event.minPlayers && (
          <Text style={styles.warningText}>
            Needs {event.minPlayers - event.joinedCount} more players to happen.
          </Text>
        )}
      </View>

      <Pressable
        style={[
          commonStyles.button,
          styles.joinButton,
          event.isJoinedByMe && styles.leaveButton,
        ]}
        onPress={() => toggleJoin(event.id)}
      >
        <Text
          style={[
            commonStyles.buttonText,
            styles.joinButtonText,
            event.isJoinedByMe && styles.leaveButtonText,
          ]}
        >
          {event.isJoinedByMe ? "Leave Game" : "Join Game"}
        </Text>
      </Pressable>

      <View style={styles.rosterSection}>
        <Text style={commonStyles.sectionTitle}>Roster</Text>
        {event.roster.map((player, index) => (
          <View key={index} style={styles.rosterItem}>
            <Text style={styles.rosterName}>
              {player} {player === event.host ? "(Host)" : ""}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  headerCard: { padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 12 },
  skillBadge: { alignSelf: "flex-start", fontSize: 14, paddingHorizontal: 10 },
  statusCard: {
    backgroundColor: "#E6F2FF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CCE5FF",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#004085",
    marginBottom: 4,
  },
  statusText: { fontSize: 18, fontWeight: "bold", color: colors.primary },
  warningText: { fontSize: 14, color: "#856404", marginTop: 8 },
  joinButton: { padding: 16 },
  leaveButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  joinButtonText: { fontSize: 18 },
  leaveButtonText: { color: colors.danger },
  rosterSection: { marginTop: 10 },
  rosterItem: {
    padding: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rosterName: { fontSize: 16, color: colors.textSecondary },
});
