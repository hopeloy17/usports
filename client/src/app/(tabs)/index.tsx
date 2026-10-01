import { FlatList, StyleSheet, Text, View } from "react-native";
import { useEvents } from "../../context/EventContext";
import GameCard from "../../components/GameCard";
import { commonStyles } from "../../styles/common";

export default function EventFeedScreen() {
  const { events } = useEvents(); // Hooking into shared state!

  return (
    <View style={commonStyles.container}>
      <Text style={commonStyles.header}>Upcoming Games</Text>

      { /* Display the list of events in a scrollable list */ }
      <FlatList data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <GameCard game={item} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 16, gap: 16 },
});
