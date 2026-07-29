import { Text, View } from "react-native";

import { PillButton, useTheme } from "@/ui";

import type {
  SupportModule,
  SupportSubmission,
} from "../SupportModule";

export function SubmissionHistory({
  submissions,
  support,
}: {
  submissions: readonly SupportSubmission[];
  support: SupportModule;
}) {
  const { colors, spacing, typography } = useTheme();
  if (submissions.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={typography.caption}>RECENT REQUESTS</Text>
      {submissions.map((submission) => (
        <View key={submission.id} style={{ gap: spacing.xs }}>
          <Text style={typography.cardTitle}>
            {submission.kind === "feature"
              ? submission.title
              : submission.message}
          </Text>
          {submission.kind === "feature" ? (
            <Text style={typography.body}>{submission.message}</Text>
          ) : null}
          <Text
            style={[
              typography.caption,
              {
                color:
                  submission.status === "submitted"
                    ? colors.success
                    : submission.status === "failed"
                      ? colors.danger
                      : colors.textSecondary,
              },
            ]}
          >
            {submission.status === "submitted"
              ? "Sent"
              : submission.status === "failed"
                ? "Not sent"
                : "Sending…"}
          </Text>
          {submission.status === "failed" ? (
            <>
              <Text style={typography.body}>{submission.error.message}</Text>
              <PillButton
                label={`Try again: ${submission.kind === "feature" ? submission.title : submission.message}`}
                onPress={() => void support.retrySubmission(submission.id)}
                variant="secondary"
              />
            </>
          ) : null}
        </View>
      ))}
    </View>
  );
}
