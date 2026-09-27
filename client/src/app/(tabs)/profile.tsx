import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEvents } from "../../context/EventContext";
import {
  SKILL_LEVELS,
  SkillLevel,
  useProfile,
} from "../../context/ProfileContext";
import GameCard from "../../components/GameCard";
import { colors, commonStyles } from "../../styles/common";

export default function ProfileScreen() {
  const { profile, updateProfile } = useProfile();
  const { events } = useEvents();

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.displayName);
  const [draftSkill, setDraftSkill] = useState<SkillLevel>(profile.skillLevel);

  const myGames = events.filter((e) => e.isJoinedByMe);
  const initials = profile.displayName.trim().charAt(0).toUpperCase() || "?";

  const startEditing = () => {
    setDraftName(profile.displayName);
    setDraftSkill(profile.skillLevel);
    setIsEditing(true);
  };

  const saveProfile = () => {
    const name = draftName.trim();
    if (!name) return;
    updateProfile({ displayName: name, skillLevel: draftSkill });
    setIsEditing(false);
  };

  return (
    <ScrollView style={commonStyles.container} contentContainerStyle={styles.content}>
      <Text style={commonStyles.header}>Profile</Text>

      { /* Identity card: avatar, name, email, skill tier */ }
      <View style={[commonStyles.card, styles.card]}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name}>{profile.displayName}</Text>
            <Text style={styles.email}>{profile.email}</Text>
          </View>
        </View>

        {isEditing ? (
          <View style={styles.form}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Your name"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Skill Level</Text>
            <View style={styles.skillRow}>
              {SKILL_LEVELS.map((level) => (
                <Pressable
                  key={level}
                  style={[
                    styles.skillOption,
                    draftSkill === level && styles.skillOptionSelected,
                  ]}
                  onPress={() => setDraftSkill(level)}
                >
                  <Text
                    style={[
                      styles.skillOptionText,
                      draftSkill === level && styles.skillOptionTextSelected,
                    ]}
                  >
                    {level}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                style={[commonStyles.button, styles.button, styles.secondaryButton]}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[commonStyles.button, styles.button, !draftName.trim() && styles.disabled]}
                onPress={saveProfile}
                disabled={!draftName.trim()}
              >
                <Text style={commonStyles.buttonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.skillInfoRow}>
              <Text style={styles.label}>Skill Level</Text>
              <Text style={commonStyles.skillBadge}>{profile.skillLevel}</Text>
            </View>
            <Pressable
              style={[commonStyles.button, styles.button, styles.secondaryButton]}
              onPress={startEditing}
            >
              <Text style={styles.secondaryButtonText}>Edit Profile</Text>
            </Pressable>
          </>
        )}
      </View>

      { /* Games the current user has joined */ }
      <View>
        <Text style={[commonStyles.sectionTitle, styles.sectionTitle]}>My Games</Text>
        {myGames.length === 0 ? (
          <View style={[commonStyles.card, styles.card]}>
            <Text style={styles.emptyText}>
              You haven't joined any games yet.
            </Text>
            <Link href="/(tabs)" asChild>
              <Pressable>
                <Text style={styles.linkText}>Find a game →</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View style={styles.gameList}>
            {myGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, gap: 16 },
  card: { marginHorizontal: 16, gap: 12 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "white", fontSize: 28, fontWeight: "bold" },
  identityText: { flex: 1 },
  name: { fontSize: 20, fontWeight: "bold", color: colors.textPrimary },
  email: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  skillInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  form: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  skillRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  skillOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: "center",
  },
  skillOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  skillOptionText: { fontSize: 13, color: colors.textSecondary },
  skillOptionTextSelected: { color: "white", fontWeight: "600" },
  buttonRow: { flexDirection: "row", gap: 8 },
  button: { flex: 1 },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: { color: colors.primary, fontSize: 16, fontWeight: "bold" },
  disabled: { opacity: 0.5 },
  sectionTitle: { marginHorizontal: 16 },
  gameList: { paddingHorizontal: 16, gap: 12 },
  emptyText: { fontSize: 14, color: colors.textMuted },
  linkText: { fontSize: 14, fontWeight: "600", color: colors.primary },
});
