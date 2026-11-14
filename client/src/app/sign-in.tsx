import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, router } from "expo-router";
import { signIn, signUp } from "../api/auth";
import { colors, commonStyles } from "../styles/common";

// The app opens on this screen (see app/index.tsx). A student either:
// - signs in with a verified calvin.edu email and goes to the games feed, or
// - creates an account, and is told to confirm it from their inbox before signing in.
// The server does all the checking; this screen shows its messages word for word.

// The two things this screen can do
type Mode = "signIn" | "signUp";

// Wording that changes with the mode, kept side by side so the two modes are easy to compare
const MODE_TEXT = {
  signIn: {
    subtitle: "Sign in with your Calvin email",
    submit: "Sign in",
    submitting: "Signing in...",
    toggle: "New to USports? Create an account",
  },
  signUp: {
    subtitle: "Create an account with your Calvin email",
    submit: "Create account",
    submitting: "Creating account...",
    toggle: "Already have an account? Sign in",
  },
} as const;

// Shown under the "check your inbox" message after a successful sign-up
const AFTER_SIGN_UP_HINT = "Once you've clicked the link in that email, sign in below.";

export default function SignInScreen() {
  // Which form is showing, and what the student has typed
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // At most one message at a time: an error (something to fix) or a notice (good news)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // True while waiting for the server, so the button can't send the same request twice
  const [isSubmitting, setIsSubmitting] = useState(false);

  const text = MODE_TEXT[mode];

  // Sends the form to the server and shows the outcome
  const handleSubmit = async () => {
    if (isSubmitting) return;

    // A new attempt replaces whatever the last one said
    setErrorMessage(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      if (mode === "signIn") {
        await signIn(email, password);
        // replace (not push) so the back button can't return to this screen
        router.replace("/(tabs)");
      } else {
        const message = await signUp(email, password);
        // The account can't be used until the email is confirmed, so don't go to the feed:
        // switch to sign-in, keep the email ready, and clear the password field
        setNotice(message);
        setMode("signIn");
        setPassword("");
      }
    } catch (err) {
      // The API functions throw the server's own message (e.g. "Please verify your email...")
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switches between "Sign in" and "Create account"; old messages no longer apply
  const toggleMode = () => {
    setMode(mode === "signIn" ? "signUp" : "signIn");
    setErrorMessage(null);
    setNotice(null);
  };

  return (
    <ScrollView
      style={commonStyles.container}
      contentContainerStyle={styles.content}
      // Let taps reach the buttons while the keyboard is open
      keyboardShouldPersistTaps="handled"
    >
      {/* Full-screen form: no navigation header above it */}
      <Stack.Screen options={{ headerShown: false }} />

      <Text style={styles.title} accessibilityRole="header">
        USports
      </Text>
      <Text style={styles.subtitle}>{text.subtitle}</Text>

      <View style={[commonStyles.card, styles.card]}>
        {/* Email: email keyboard, no auto-capitalizing or autocorrecting the address */}
        <Text style={styles.label}>Calvin email</Text>
        <TextInput
          testID="auth-email"
          accessibilityLabel="Calvin email"
          style={styles.textInput}
          value={email}
          onChangeText={setEmail}
          placeholder="you@calvin.edu"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />

        {/* Password: hidden as typed; the password manager hint depends on the mode */}
        <Text style={styles.label}>Password</Text>
        <TextInput
          testID="auth-password"
          accessibilityLabel="Password"
          style={styles.textInput}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={mode === "signUp" ? "new-password" : "current-password"}
          returnKeyType="go"
          // Pressing "go" on the keyboard submits, like pressing the button
          onSubmitEditing={handleSubmit}
        />

        {/* Messages are words, not just colors, and are announced to screen readers (NFR-5) */}
        {errorMessage && (
          <View style={[styles.messageBox, styles.errorBox]}>
            <Text testID="auth-error" accessibilityRole="alert" style={styles.errorText}>
              {errorMessage}
            </Text>
          </View>
        )}

        {notice && (
          <View style={[styles.messageBox, styles.noticeBox]}>
            <Text testID="auth-notice" accessibilityRole="alert" style={styles.noticeText}>
              {notice}
              {"\n"}
              {AFTER_SIGN_UP_HINT}
            </Text>
          </View>
        )}

        <Pressable
          testID="auth-submit"
          accessibilityRole="button"
          style={[commonStyles.button, isSubmitting && styles.disabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={commonStyles.buttonText}>
            {isSubmitting ? text.submitting : text.submit}
          </Text>
        </Pressable>
      </View>

      <Pressable
        testID="auth-toggle-mode"
        accessibilityRole="button"
        style={styles.toggle}
        onPress={toggleMode}
        disabled={isSubmitting}
      >
        <Text style={styles.toggleText}>{text.toggle}</Text>
      </Pressable>
    </ScrollView>
  );
}

// Layout only; colors and card/button styling come from commonStyles
const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  card: { gap: 10 },
  label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  textInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },

  // Error (red) and notice (green) boxes; same shape, different colors
  messageBox: { padding: 12, borderWidth: 1, borderRadius: 8 },
  errorBox: { backgroundColor: "#FEE2E2", borderColor: "#EF4444" },
  errorText: { color: "#B91C1C", fontSize: 14, fontWeight: "600" },
  noticeBox: { backgroundColor: "#DCFCE7", borderColor: "#22C55E" },
  noticeText: { color: "#166534", fontSize: 14, fontWeight: "600" },

  disabled: { opacity: 0.6 },
  toggle: { alignItems: "center", padding: 12 },
  toggleText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
});
