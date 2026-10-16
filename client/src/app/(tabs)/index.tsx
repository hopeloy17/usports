import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import GameCard from "../../components/GameCard";
import { useEvents } from "../../context/EventContext";
import { useEventFilters } from "../../context/EventFiltersContext";
import { SKILL_LEVELS, SkillLevel } from "../../context/ProfileContext";
import { colors, commonStyles } from "../../styles/common";
import { filterEvents, toLocalDateString } from "../../utils/filterEvents";

type FilterOption = { label: string; value: string };

// Builds a chip for today and each of the next six days
function getUpcomingDateOptions(): FilterOption[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);

    let label = date.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
    if (offset === 0) label = "Today";
    if (offset === 1) label = "Tomorrow";

    return { label, value: toLocalDateString(date.toISOString()) };
  });
}

// Uses each name as both the chip label and the filter value
function toFilterOptions(names: readonly string[]): FilterOption[] {
  return names.map((name) => ({ label: name, value: name }));
}

type FilterChipProps = {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
};

function FilterChip({ label, accessibilityLabel, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

type FilterRowProps = {
  category: string;
  options: FilterOption[];
  selectedValue?: string;
  onSelect: (value?: string) => void;
};

// A sideways-scrolling row of chips: tap to select, tap again to clear
function FilterRow({ category, options, selectedValue, onSelect }: FilterRowProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {options.map((option) => (
        <FilterChip
          key={option.value}
          label={option.label}
          accessibilityLabel={`Filter by ${category}: ${option.label}`}
          selected={selectedValue === option.value}
          onPress={() => onSelect(selectedValue === option.value ? undefined : option.value)}
        />
      ))}
    </ScrollView>
  );
}

export default function EventFeedScreen() {
  const { events } = useEvents(); // Hooking into shared state!
  const { filters, setFilters } = useEventFilters();
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Only offer sports that currently have games
  const sportOptions = useMemo(
    () => toFilterOptions([...new Set(events.map((event) => event.sport))].sort()),
    [events],
  );
  const dateOptions = useMemo(getUpcomingDateOptions, []);
  const filteredEvents = filterEvents(events, filters);
  const activeFilterCount = [filters.sport, filters.skillLevel, filters.date].filter(Boolean).length;
  const filtersButtonText = activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters";

  return (
    <View style={commonStyles.container}>
      {/* Header measures its height so the dialog can sit right below it */}
      <View onLayout={(layoutEvent) => setHeaderHeight(layoutEvent.nativeEvent.layout.height)}>
        <Text style={commonStyles.header}>Upcoming Games</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          onPress={() => setIsFilterDialogOpen(true)}
          style={styles.filtersButton}
        >
          <Text style={styles.filtersButtonText}>{filtersButtonText}</Text>
          <Text style={styles.filtersButtonText}>{isFilterDialogOpen ? " ▴" : " ▾"}</Text>
        </Pressable>
      </View>

      {/* Filter dialog: floats over the list, closes on any tap outside it */}
      <Modal
        visible={isFilterDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterDialogOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close filters"
          onPress={() => setIsFilterDialogOpen(false)}
          style={styles.backdrop}
        />
        <View style={[styles.dialog, { top: headerHeight }]}>
          <Text style={styles.dialogLabel}>Sport</Text>
          <FilterRow
            category="sport"
            options={sportOptions}
            selectedValue={filters.sport}
            onSelect={(sport) => setFilters((current) => ({ ...current, sport }))}
          />
          <Text style={styles.dialogLabel}>Skill</Text>
          <FilterRow
            category="skill"
            options={toFilterOptions(SKILL_LEVELS)}
            selectedValue={filters.skillLevel}
            onSelect={(value) =>
              setFilters((current) => ({ ...current, skillLevel: value as SkillLevel | undefined }))
            }
          />
          <Text style={styles.dialogLabel}>Date</Text>
          <FilterRow
            category="date"
            options={dateOptions}
            selectedValue={filters.date}
            onSelect={(date) => setFilters((current) => ({ ...current, date }))}
          />
        </View>
      </Modal>

      {/* Display the list of events in a scrollable list */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <GameCard game={item} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {activeFilterCount > 0 ? "No games match your filters." : "No games yet. Check back soon or host one!"}
          </Text>
        }
      />
    </View>
  );
}


const styles = StyleSheet.create({
  filtersButton: { position: "absolute", right: 20, bottom: 22, flexDirection: "row" },
  filtersButtonText: { fontSize: 16, fontWeight: "600", color: colors.primary },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0, 0, 0, 0.25)" },
  dialog: {
    position: "absolute",
    left: 16,
    right: 16,
    paddingVertical: 12,
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceTranslucent,
  },
  dialogLabel: { paddingHorizontal: 12, fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  chipRow: { paddingHorizontal: 12, gap: 8 },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: "500", color: colors.textSecondary },
  chipTextSelected: { color: "white" },
  listContent: { padding: 16, gap: 16 },
  emptyText: { textAlign: "center", marginTop: 32, fontSize: 16, color: "#666" },
});
