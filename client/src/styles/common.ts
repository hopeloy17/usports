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
  glassTint: "rgba(0, 86, 179, 0.18)",        // <- here
  surfaceTranslucent: "rgba(255, 255, 255, 0.6)",

  // Calvin brand (official values from the 2026 Calvin brand standards PDF).
  // Used by the sign-in screen; switching the whole app's primary color is a team decision.
  calvinMaroon: "#8C2131",     // Classic Maroon: primary actions, links, focus rings
  calvinGold: "#F3CD00",       // Classic Gold: accents only (fails contrast as text on white)
  heroBackground: "#2A0B12",   // Deep maroon behind the sign-in hero
  // Input borders need 3:1 contrast with white (WCAG 1.4.11); inputBorder (#CED4DA) is only ~1.5:1
  inputBorderStrong: "#868E96",

  // Message boxes: tinted background, border in the same hue, dark text (all >= 4.5:1)
  errorBackground: "#FEE2E2",
  errorBorder: "#EF4444",
  errorText: "#B91C1C",
  successBackground: "#DCFCE7",
  successBorder: "#22C55E",
  successText: "#166534",

  // Alerts and information modals
  success: "#35DC46",
  danger: "#DC3545",
  caution: "#DC7535",
  information: "#3835DC"
};

// The three states a game can be in; the server decides which one applies
export type EventStatus = "open" | "full" | "cancelled";

// Badge background for each status: open = green, full = blue, cancelled = red
export const statusColors: Record<EventStatus, string> = {
  open: colors.success,
  full: colors.information,
  cancelled: colors.danger,
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
