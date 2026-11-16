import { useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signIn, signUp } from "../api/auth";
import { useProfile } from "../context/ProfileContext";
import { colors } from "../styles/common";

// The app opens on this screen (see app/index.tsx). A student either:
// - signs in with a verified calvin.edu email and goes to the games feed, or
// - creates an account, and is told to confirm it from their inbox before signing in.
// The server does all the checking; this screen shows its messages word for word.
//
// Layout ("Game Day" design, Figma file "ussports"): a maroon hero with court lines, the
// USports mark and slogan on top; the form sits on a white bottom sheet so its contrast
// never depends on what's behind it.

// The two things this screen can do
type Mode = "signIn" | "signUp";

// Which text field has focus (drives the maroon focus ring), or null for none
type Field = "email" | "password" | null;

// Wording that changes with the mode, kept side by side so the two modes are easy to compare
const MODE_TEXT = {
  signIn: {
    title: "Sign in to USports",
    subtitle: "Use your Calvin email to find pickup games.",
    submit: "Sign in",
    submitting: "Signing in...",
    togglePrompt: "New to USports?",
    toggleLink: "Create an account",
  },
  signUp: {
    title: "Create your account",
    subtitle: "Use your Calvin email. Any sport, any skill level.",
    submit: "Create account",
    submitting: "Creating account...",
    togglePrompt: "Already have an account?",
    toggleLink: "Sign in",
  },
} as const;

// Shown under the "check your inbox" message after a successful sign-up
const AFTER_SIGN_UP_HINT = "Once you've clicked the link in that email, sign in below.";

// The server's password rule (supabase/config.toml: minimum_password_length = 6).
// Shown up front in create-account mode so nobody learns it from an error.
const PASSWORD_RULE = "Use at least 6 characters.";

export default function SignInScreen() {
  // Which form is showing, and what the student has typed
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Password starts hidden; the Show/Hide button flips it
  const [showPassword, setShowPassword] = useState(false);

  // Which field has focus, so it can get the focus ring
  const [focusedField, setFocusedField] = useState<Field>(null);

  // At most one message at a time: an error (something to fix) or a notice (good news)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // True while waiting for the server, so the button can't send the same request twice
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lets the email field's "next" key move the cursor into the password field
  // (ComponentRef gives the instance type, which has .focus(); plain TextInput is the component type)
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  // Tells the rest of the app who signed in, so it shows their profile and games
  const { setSignedInUser } = useProfile();

  // How much of each screen edge the phone itself covers (status bar, notch, Dynamic Island).
  // Asked from the phone instead of guessed, since it differs on every device (0 on the web)
  const insets = useSafeAreaInsets();

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
        const signedIn = await signIn(email, password);
        // Remember this student (on the web, across reloads) and switch the app to them first,
        // so the feed never opens showing someone else
        setSignedInUser(signedIn);
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
      style={styles.screen}
      contentContainerStyle={styles.content}
      // Let taps reach the buttons while the keyboard is open
      keyboardShouldPersistTaps="handled"
      // iOS: scroll the focused field and the button above the keyboard
      automaticallyAdjustKeyboardInsets
    >
      {/* No header bar above this screen: set in app/_layout.tsx, so it applies from the first frame */}
      {/* White status-bar icons over the dark hero */}
      <StatusBar style="light" />

      {/* ---------- Hero: brand + slogan (decoration only; no form fields here) ---------- */}
      {/* Starts just below the status bar / notch on every phone: that strip + the same gap */}
      <View testID="auth-hero" style={[styles.hero, { paddingTop: insets.top + HERO_TOP_GAP }]}>
        <CourtLines />

        {/* Logo + slogan share the form's centered column, so they line up on wide screens */}
        <View testID="auth-hero-column" style={[styles.column, styles.heroColumn]}>
          {/* The logo: one screen-reader stop named "USports"
              (read as-is, the all-caps "USPORTS" can be spelled out letter by letter) */}
          <View
            style={styles.brandRow}
            accessible // groups the tile + wordmark into one item
            accessibilityRole="image" // it's a logo, not text to read
            accessibilityLabel="USports" // what screen readers say instead
          >
            <View style={styles.mark}>
              <BallGlyph />
            </View>
            <Text style={styles.wordmark}>USPORTS</Text>
          </View>

          <Text style={styles.slogan}>
            Find a game.{"\n"}
            <Text style={styles.sloganAccent}>Grab your spot.</Text>
          </Text>
        </View>
      </View>

      {/* ---------- Sheet: the form, always on solid white ---------- */}
      <View style={styles.sheet}>
        {/* Everything on the sheet sits in one centered column, capped for wide screens */}
        <View testID="auth-form-column" style={[styles.column, styles.sheetColumn]}>
          <View style={styles.header}>
            {/* The one heading: says what this screen is for */}
            <Text style={styles.title} accessibilityRole="header">
              {text.title}
            </Text>
            <Text style={styles.subtitle}>{text.subtitle}</Text>
          </View>

          <View style={styles.form}>
            {/* Email: email keyboard, no auto-capitalizing or autocorrecting the address */}
            <View style={styles.field}>
              <Text style={styles.label}>Calvin email</Text>
              <TextInput
                testID="auth-email"
                accessibilityLabel="Calvin email"
                style={[styles.input, focusedField === "email" && styles.inputFocused]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@calvin.edu"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                // "username" pairs the email with the password so autofill offers the saved login
                autoComplete="username"
                textContentType="username"
                // "next" moves on to the password instead of submitting; keep the keyboard up
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Password: hidden unless the student taps Show; autofill hint depends on the mode */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputRow, focusedField === "password" && styles.inputFocused]}>
                <TextInput
                  ref={passwordRef}
                  testID="auth-password"
                  accessibilityLabel="Password"
                  style={styles.inputInRow}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === "signUp" ? "Create a password" : "Your password"}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                  textContentType={mode === "signUp" ? "newPassword" : "password"}
                  returnKeyType="go"
                  // Pressing "go" on the keyboard submits, like pressing the button
                  onSubmitEditing={handleSubmit}
                  // Screen readers hear the rule when they reach the field (only when creating a password)
                  accessibilityHint={mode === "signUp" ? PASSWORD_RULE : undefined}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
                {/* A real button whose label says what it will do next */}
                <Pressable
                  testID="auth-show-password"
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  style={styles.showToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.linkText}>{showPassword ? "Hide" : "Show"}</Text>
                </Pressable>
              </View>

              {/* The password rule, visible before typing; only when creating an account */}
              {mode === "signUp" && <Text style={styles.helperText}>{PASSWORD_RULE}</Text>}
            </View>

            {/* Form-level messages sit just above the button. Words + icon, never color alone,
                and announced to screen readers (NFR-5) */}
            {errorMessage && (
              <View style={[styles.messageBox, styles.errorBox]}>
                <MessageIcon glyph="!" color={colors.errorText} />
                <Text
                  testID="auth-error"
                  accessibilityRole="alert"
                  style={[styles.messageText, { color: colors.errorText }]}
                >
                  {errorMessage}
                </Text>
              </View>
            )}

            {notice && (
              <View style={[styles.messageBox, styles.noticeBox]}>
                <MessageIcon glyph="✓" color={colors.successText} />
                <Text
                  testID="auth-notice"
                  accessibilityRole="alert"
                  style={[styles.messageText, { color: colors.successText }]}
                >
                  {notice}
                  {"\n"}
                  {AFTER_SIGN_UP_HINT}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            {/* Keeps its size while busy; spinner + words show progress */}
            <Pressable
              testID="auth-submit"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                isSubmitting && styles.buttonBusy,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <ActivityIndicator color="white" />}
              <Text style={styles.buttonText}>{isSubmitting ? text.submitting : text.submit}</Text>
            </Pressable>

            {/* Mode switch: quiet prompt + maroon link, with a 44pt-tall tap area */}
            <Pressable
              testID="auth-toggle-mode"
              accessibilityRole="button"
              style={[styles.toggle, isSubmitting && styles.toggleBusy]}
              onPress={toggleMode}
              disabled={isSubmitting}
            >
              <Text style={styles.togglePrompt}>
                {text.togglePrompt} <Text style={styles.linkText}>{text.toggleLink}</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Small drawing helpers (plain Views, so no SVG library is needed)
// ---------------------------------------------------------------------------

// Faint basketball-court lines behind the hero; hidden from screen readers and touches
function CourtLines() {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.courtCenterCircle} />
      <View style={styles.courtArc} />
      <View style={styles.courtKey} />
    </View>
  );
}

// A basketball in Calvin maroon on the gold tile: the outline, a vertical and a horizontal
// seam, and two curved side seams. Each side seam is a circle that sits mostly outside the
// ball; the ball clips it (overflow: hidden), so only its inner curve shows, like ")" and "("
function BallGlyph() {
  return (
    <View style={styles.ball}>
      <View style={styles.ballSeamVertical} />
      <View style={styles.ballSeamHorizontal} />
      <View style={[styles.ballSideSeam, styles.ballSideSeamLeft]} />
      <View style={[styles.ballSideSeam, styles.ballSideSeamRight]} />
    </View>
  );
}

// Round badge in front of a message ("!" for errors, "✓" for notices); decoration only,
// since the message text already says everything
function MessageIcon({ glyph, color }: { glyph: string; color: string }) {
  return (
    <View
      style={[styles.messageIcon, { borderColor: color }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.messageIconText, { color }]}>{glyph}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles. Spacing follows a 4/8 scale (4, 8, 12, 16, 24); inputs and buttons share radius 12.
// ---------------------------------------------------------------------------
const CONTROL_RADIUS = 12;
const COURT_LINE = "rgba(243, 205, 0, 0.16)"; // Calvin gold at low opacity
// Widest the form gets: wider inputs are harder to scan, and phones never reach it
const FORM_MAX_WIDTH = 480;
// Space between the bottom of the status bar / notch and the logo; matches the hero's 24pt sides
const HERO_TOP_GAP = 24;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.heroBackground },
  content: { flexGrow: 1 },

  // One centered column for the hero content and the form: full width on phones,
  // stops at FORM_MAX_WIDTH on tablets and laptops (the maroon and white still fill the window)
  column: { width: "100%", maxWidth: FORM_MAX_WIDTH, alignSelf: "center" },

  // ----- Hero -----
  hero: {
    backgroundColor: colors.calvinMaroon,
    // paddingTop is set in the JSX: the phone's status-bar height + HERO_TOP_GAP
    paddingHorizontal: 24,
    paddingBottom: 48, // room for the sheet to overlap
    overflow: "hidden",
  },
  // Space between the logo row and the slogan (inside the hero's column)
  heroColumn: { gap: 16 },
  courtCenterCircle: {
    position: "absolute",
    top: -62,
    alignSelf: "center",
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 3,
    borderColor: COURT_LINE,
  },
  courtArc: {
    position: "absolute",
    bottom: -250,
    alignSelf: "center",
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 3,
    borderColor: COURT_LINE,
  },
  courtKey: {
    position: "absolute",
    bottom: -40,
    alignSelf: "center",
    width: 124,
    height: 120,
    borderWidth: 3,
    borderColor: COURT_LINE,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  mark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.calvinGold,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.25)",
  },
  ball: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: colors.calvinMaroon,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden", // clips the side seams to the ball's round edge
  },
  ballSeamVertical: { position: "absolute", width: 2.5, height: "100%", backgroundColor: colors.calvinMaroon },
  ballSeamHorizontal: { position: "absolute", height: 2.5, width: "100%", backgroundColor: colors.calvinMaroon },
  // Side seams: a ring mostly outside the ball, so only its inner curve shows.
  // No top/bottom offset, so the ball's justifyContent: "center" centers it vertically
  ballSideSeam: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: colors.calvinMaroon,
  },
  ballSideSeamLeft: { left: -15 }, // pokes in from the left edge: ")"
  ballSideSeamRight: { right: -15 }, // pokes in from the right edge: "("
  wordmark: { color: "white", fontSize: 26, fontWeight: "900", letterSpacing: 2 },
  slogan: { color: "white", fontSize: 40, lineHeight: 44, fontWeight: "900", letterSpacing: -0.5 },
  sloganAccent: { color: colors.calvinGold },

  // ----- Sheet -----
  sheet: {
    flexGrow: 1,
    marginTop: -24, // slides up over the hero
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  // Space between the heading, the form, and the buttons (inside the sheet's column)
  sheetColumn: { gap: 24 },
  header: { gap: 4 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "bold", color: colors.textPrimary },
  subtitle: { fontSize: 16, lineHeight: 22, color: colors.textSecondary },

  form: { gap: 16 },
  // Label sits closer to its own input (8) than to the field above (16)
  field: { gap: 8 },
  label: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.inputBorderStrong,
    borderRadius: CONTROL_RADIUS,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 16, // 16+ so iOS doesn't zoom in
    color: colors.textPrimary,
    // Web: drop the browser's black focus outline; inputFocused draws our own maroon border instead.
    // Chrome's default is `outline-style: auto`, which ignores width, so set the style too
    outlineStyle: "solid",
    outlineWidth: 0,
  },
  // Password field + Show button share one bordered row
  inputRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.inputBorderStrong,
    borderRadius: CONTROL_RADIUS,
    backgroundColor: colors.surface,
    paddingLeft: 16,
    paddingRight: 4,
  },
  // No outline on web: the surrounding inputRow shows focus (see inputFocused).
  // "solid" + width 0 draws nothing; width 0 alone is ignored by Chrome's `outline-style: auto`
  inputInRow: {
    flex: 1,
    minHeight: 48,
    fontSize: 16,
    color: colors.textPrimary,
    outlineStyle: "solid",
    outlineWidth: 0,
  },
  // Focus: thicker maroon border plus a soft maroon ring (a clear change from unfocused)
  inputFocused: {
    borderWidth: 2,
    borderColor: colors.calvinMaroon,
    // boxShadow: "0px 0px 0px 4px rgba(140, 33, 49, 0.18)",
  },
  showToggle: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: "center", alignItems: "center" },
  helperText: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  linkText: { color: colors.calvinMaroon, fontSize: 15, fontWeight: "600" },

  // Message boxes: tinted background, 1px border in the same hue, icon + words
  messageBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: CONTROL_RADIUS,
  },
  errorBox: { backgroundColor: colors.errorBackground, borderColor: colors.errorBorder },
  noticeBox: { backgroundColor: colors.successBackground, borderColor: colors.successBorder },
  messageText: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: "600" },
  messageIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
  },
  messageIconText: { fontSize: 11, fontWeight: "900", lineHeight: 13 },

  // ----- Actions -----
  actions: { gap: 8 },
  button: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: CONTROL_RADIUS,
    backgroundColor: colors.calvinMaroon,
    boxShadow: "0px 8px 20px rgba(140, 33, 49, 0.35)",
  },
  buttonPressed: { opacity: 0.85 },
  // Busy: same size, dimmed, inert (the Pressable is disabled)
  buttonBusy: { opacity: 0.6, boxShadow: "none" },
  buttonText: { color: "white", fontSize: 17, fontWeight: "600" },
  toggle: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  toggleBusy: { opacity: 0.5 },
  togglePrompt: { fontSize: 16, color: colors.textSecondary },
});
