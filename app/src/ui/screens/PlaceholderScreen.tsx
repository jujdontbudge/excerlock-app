import { StyleSheet, Text } from "react-native";

import { Card, Screen } from "../components";
import { useTheme } from "../theme";

type PlaceholderScreenProps = {
  title: string;
  /** One line saying what will live here once the surface is built. */
  summary?: string;
};

/**
 * A themed scaffold for a tab whose real content is still owed. It exists so the
 * shell is navigable end to end, and so the surface already sits on the brand
 * gradient when its content lands.
 */
export function PlaceholderScreen({ title, summary }: PlaceholderScreenProps) {
  const { spacing, typography } = useTheme();

  return (
    <Screen testID="placeholder-screen" style={[styles.content, { padding: spacing.gutter }]}>
      <Text accessibilityRole="header" style={typography.screenTitle}>
        {title}
      </Text>
      {summary === undefined ? null : (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={typography.body}>{summary}</Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
});
