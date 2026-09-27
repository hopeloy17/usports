import { StyleSheet } from "react-native";

// Shared color palette used across screens
export const colors = {
  primary: "#0056b3",
  background: "#F8F9FA",
  surface: "white",
  border: "#E9ECEF",
  inputBorder: "#CED4DA",
  textPrimary: "#212529",
  textSecondary: "#495057",
  textMuted: "#6C757D",
  danger: "#DC3545",
};

// Styles used on more than one screen/component.
// Compose with local styles for tweaks, e.g. style={[commonStyles.card, styles.myCard]}
// Note: children of <Link asChild> need StyleSheet.flatten([...]) instead of an array.
export const commonStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    boxShadow: "0px 2px 3.84px rgba(0, 0, 0, 0.25)",
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 10,
  },
  sportText: { fontSize: 18, fontWeight: "bold", color: colors.textPrimary },
  skillBadge: {
    fontSize: 12,
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    color: colors.textSecondary,
  },
  detailText: { fontSize: 14, color: colors.textSecondary },
  headcountText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  button: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
