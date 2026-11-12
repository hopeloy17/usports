import { StyleSheet, Text } from "react-native";
import { EventStatus, statusColors } from "../styles/common";

const statusLabels: Record<EventStatus, string> = {
  open: "Open",
  full: "Full",
  cancelled: "Cancelled",
};

type StatusBadgeProps = {
  status: EventStatus;
};

// A small colored pill showing whether a game is open, full, or cancelled
export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Text testID="status-badge" style={[styles.badge, { backgroundColor: statusColors[status] }]}>
      {statusLabels[status]}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
});
