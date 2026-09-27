import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Event } from "../context/EventContext";
import { colors, commonStyles } from "../styles/common";
import { formatEventDateTime } from "../utils/formatEventTime";

type GameCardProps = {
  game: Event;
  onPress?: () => void;
};

export default function GameCard({ game, onPress }: GameCardProps) {
  { /* Return a card that displays the game details and navigates to the event when pressed */ }
  return (
    <Link href={`/event/${game.id}`} asChild>
      <Pressable style={commonStyles.card} onPress={onPress}>
        <View style={styles.cardHeader}>
          <Text style={commonStyles.sportText}>{game.sport}</Text>
          <Text style={commonStyles.skillBadge}>{game.skillLevel}</Text>
        </View>

        <Text style={[commonStyles.detailText, styles.detailText]}>📍 {game.venue}</Text>
        <Text style={[commonStyles.detailText, styles.detailText]}>🕒 {formatEventDateTime(game.dateTime)}</Text>

        <View style={styles.footer}>
          <Text style={commonStyles.headcountText}>
            {game.joinedCount}/{game.minPlayers} joined
          </Text>
          <Text style={styles.joinPrompt}>View Details →</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailText: { marginBottom: 6 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  joinPrompt: { fontSize: 14, color: colors.textMuted },
});
