import { Stack, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEvents } from "../../context/EventContext";

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, toggleJoin } = useEvents();

  // Find the exact event from our master list
  const event = events.find((e) => e.id === id);

  if (!event) {
    return <Text style={{ padding: 40 }}>Event not found.</Text>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: `${event.sport} Game` }} />

      <View style={styles.headerCard}>
        <Text style={styles.title}>
          {event.sport} at {event.venue}
        </Text>
        <Text style={styles.subtitle}>🕒 {event.time}</Text>
        <Text style={styles.skillBadge}>{event.skillLevel}</Text>
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
        style={[styles.joinButton, event.isJoinedByMe && styles.leaveButton]}
        onPress={() => toggleJoin(event.id)}
      >
        <Text
          style={[
            styles.joinButtonText,
            event.isJoinedByMe && styles.leaveButtonText,
          ]}
        >
          {event.isJoinedByMe ? "Leave Game" : "Join Game"}
        </Text>
      </Pressable>

      <View style={styles.rosterSection}>
        <Text style={styles.rosterTitle}>Roster</Text>
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

// Keep the same styles from the previous [id].tsx...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  headerCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: "#495057", marginBottom: 12 },
  skillBadge: {
    alignSelf: "flex-start",
    fontSize: 14,
    backgroundColor: "#E9ECEF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    color: "#495057",
  },
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
  statusText: { fontSize: 18, fontWeight: "bold", color: "#0056b3" },
  warningText: { fontSize: 14, color: "#856404", marginTop: 8 },
  joinButton: {
    backgroundColor: "#0056b3",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  leaveButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#DC3545",
  },
  joinButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  leaveButtonText: { color: "#DC3545" },
  rosterSection: { marginTop: 10 },
  rosterTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#212529",
  },
  rosterItem: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  rosterName: { fontSize: 16, color: "#495057" },
});
