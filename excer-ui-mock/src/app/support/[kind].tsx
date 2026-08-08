import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { diagnosticsCopy, supportComposerFixtures } from '@/content';
import {
  DiagnosticsProgressScreen,
  DiagnosticsScreen,
  SimulatedShareSheet,
  SettingsDetailScreen,
  SupportArticleScreen,
  SupportComposerScreen,
  SupportHubScreen,
  type SupportComposerMode,
} from '@/features/settings';

const composerModes: SupportComposerMode[] = ['contact', 'bug', 'idea'];

export default function SupportRoute() {
  const { kind = 'help', article } = useLocalSearchParams<{ kind?: string; article?: string }>();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState<'idle' | 'loading' | 'complete'>('idle');
  const [diagnosticPhase, setDiagnosticPhase] = useState<'idle' | 'preparing' | 'success' | 'none'>('idle');
  const [diagnosticShareVisible, setDiagnosticShareVisible] = useState(false);
  const [diagnosticShareDestination, setDiagnosticShareDestination] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'loading') return;
    const timer = setTimeout(() => setPhase('complete'), 600);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (diagnosticPhase !== 'preparing') return;
    const timer = setTimeout(() => setDiagnosticPhase('success'), 600);
    return () => clearTimeout(timer);
  }, [diagnosticPhase]);

  if (kind === 'help') {
    return (
      <SupportHubScreen
        onBack={() => router.back()}
        onOpenArticle={(articleId) => router.push(`/support/article?article=${articleId}` as Href)}
        onOpenContact={() => router.push('/support/contact')}
      />
    );
  }

  if (kind === 'article') {
    const relatedRoute = article === 'permissions' || article === 'gym'
      ? '/settings/permissions'
      : article === 'subscription'
        ? '/settings/subscription'
        : '/(tabs)/home';
    return (
      <SupportArticleScreen
        articleId={article ?? 'apps-locked'}
        onBack={() => router.back()}
        onOpenRelated={() => router.push(relatedRoute as Href)}
      />
    );
  }

  if (kind === 'diagnostics') {
    if (diagnosticPhase === 'preparing') {
      return <DiagnosticsProgressScreen onCancel={() => setDiagnosticPhase('idle')} />;
    }
    if (diagnosticPhase === 'success' || diagnosticPhase === 'none') {
      const noData = diagnosticPhase === 'none';
      return (
        <>
          <SettingsDetailScreen
            body={noData ? 'No sample diagnostics matched this fixture. Check permission health, then try again.' : diagnosticsCopy.success.body}
            onBack={() => router.back()}
            onRowPress={(rowId) => {
              if (rowId === 'instructions') router.push('/settings/permissions');
              if (rowId === 'retry') setDiagnosticPhase('idle');
              if (rowId === 'share') {
                setDiagnosticShareDestination(null);
                setDiagnosticShareVisible(true);
              }
              if (rowId === 'done') router.back();
            }}
            onToggle={() => undefined}
            prototypeDisclosure="No bundle or file was created or shared."
            sections={[{ id: 'result', rows: noData
              ? [{ id: 'instructions', title: 'Instructions', subtitle: 'Open local permission health' }, { id: 'retry', title: 'Try again', subtitle: 'Return to the status-only preview' }]
              : [
                { id: 'share', title: diagnosticsCopy.success.primary, subtitle: 'Open the local share simulation' },
                { id: 'done', title: diagnosticsCopy.success.secondary, subtitle: 'Return without sharing' },
              ] }]}
            title={noData ? 'No data found' : diagnosticsCopy.success.title}
          />
          <SimulatedShareSheet
            disclosure="No share extension opened, and no diagnostic file was created."
            onDone={() => {
              setDiagnosticShareVisible(false);
              setDiagnosticShareDestination(null);
            }}
            onRequestClose={() => {
              setDiagnosticShareVisible(false);
              setDiagnosticShareDestination(null);
            }}
            onSelectDestination={setDiagnosticShareDestination}
            previewSubtitle="Status labels only · local text preview"
            previewTitle="ExcerLock-Diagnostics.txt"
            selectedDestination={diagnosticShareDestination}
            visible={diagnosticShareVisible}
          />
        </>
      );
    }
    return (
      <DiagnosticsScreen
        onBack={() => router.back()}
        onNoDataPreview={() => setDiagnosticPhase('none')}
        onPreparePreview={() => setDiagnosticPhase('preparing')}
        onRowPress={(section) => setMessage(`Inspected ${section} locally.`)}
      />
    );
  }

  const mode = composerModes.includes(kind as SupportComposerMode) ? kind as SupportComposerMode : 'contact';
  if (phase === 'complete') {
    return (
      <SettingsDetailScreen
        body={supportComposerFixtures.result.body}
        onBack={() => router.replace('/support/help')}
        onRowPress={() => router.replace('/support/help')}
        onToggle={() => undefined}
        prototypeDisclosure="Nothing was sent."
        sections={[{ id: 'result', rows: [{ id: 'done', title: supportComposerFixtures.result.action }] }]}
        title={supportComposerFixtures.result.title}
      />
    );
  }
  return (
    <SupportComposerScreen
      message={message}
      mode={mode}
      loading={phase === 'loading'}
      onAddAttachmentPreview={() => Alert.alert(
        'Sample photo picker',
        'No photo library opens. Add the labeled local screenshot fixture?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add sample', onPress: () => setMessage((value) => `${value}${value ? '\n' : ''}[Sample screenshot preview attached]`) },
        ],
      )}
      onBack={() => {
        if (!message.trim()) {
          router.back();
          return;
        }
        Alert.alert('Discard this draft?', 'Your local support message has not been sent.', [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]);
      }}
      onMessageChange={setMessage}
      onSendPreview={() => setPhase('loading')}
    />
  );
}
