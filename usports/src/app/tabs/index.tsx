import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';

// Temporary mock data to get the UI rendering
const mockEvents = [
  {
    id: '1',
    sport: 'Basketball',
    venue: 'Spoelhof Fieldhouse',
    time: 'Tonight @ 7:00 PM',
    joinedCount: 6,
    minPlayers: 10,
    skillLevel: 'Intermediate',
  },
  {
    id: '2',
    sport: 'Soccer',
    venue: 'Gainey Athletic Complex',
    time: 'Tomorrow @ 5:30 PM',
    joinedCount: 12,
    minPlayers: 14,
    skillLevel: 'All Levels',
  },
  {
    id: '3',
    sport: 'Tennis',
    venue: 'Huizenga Tennis Courts',
    time: 'Thursday @ 4:00 PM',
    joinedCount: 1,
    minPlayers: 2,
    skillLevel: 'Advanced',
  }
];

export default function EventFeedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Upcoming Games</Text>
      
      <FlatList
        data={mockEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Link href={`/event/${item.id}`} asChild>
            <Pressable style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sportText}>{item.sport}</Text>
                <Text style={styles.skillBadge}>{item.skillLevel}</Text>
              </View>
              
              <Text style={styles.detailText}>📍 {item.venue}</Text>
              <Text style={styles.detailText}>🕒 {item.time}</Text>
              
              <View style={styles.footer}>
                <Text style={styles.headcountText}>
                  {item.joinedCount}/{item.minPlayers} joined
                </Text>
                <Text style={styles.joinPrompt}>View Details →</Text>
              </View>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sportText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  skillBadge: {
    fontSize: 12,
    backgroundColor: '#E9ECEF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    color: '#495057',
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
  },
  headcountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0056b3', // A nice Calvin-esque blue
  },
  joinPrompt: {
    fontSize: 14,
    color: '#6C757D',
  },
});