import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type PlaceholderScreenProps = {
  children?: ReactNode;
  title: string;
};

export function PlaceholderScreen({ children, title }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
});
