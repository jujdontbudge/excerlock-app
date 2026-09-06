import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PillowCard, PillButton, StaticVectorImage, colors, layout, radius, space, type } from '@/design-system';
import { signInCopy, signupCopy } from '@/content/auth';
import { assetRegistry } from '@/content';
import { FeatureScaffold, PrototypeNotice } from '@/features/shared';

export type SignupScreenProps = {
  initialPhase?: SignupFixturePhase;
  mode?: 'postPurchase' | 'recovery';
  onBack?: () => void;
  onComplete: () => void;
  onOpenLegal: (document: 'terms' | 'privacy') => void;
};

export type SignupFixturePhase = 'choice' | 'email' | 'processing' | 'success' | 'failure';

export function SignupScreen({ initialPhase = 'choice', mode = 'postPurchase', onBack, onComplete, onOpenLegal }: SignupScreenProps) {
  const [phase, setPhase] = useState<SignupFixturePhase>(initialPhase);
  const [holdProcessingFixture, setHoldProcessingFixture] = useState(initialPhase === 'processing');
  const [email, setEmail] = useState('');
  const recovery = mode === 'recovery';
  const copy = recovery ? signInCopy : signupCopy;
  const failure = recovery ? signInCopy.failure : signupCopy.failure;

  const beginProcessing = () => {
    setHoldProcessingFixture(false);
    setPhase('processing');
  };

  useEffect(() => {
    if (phase !== 'processing' || holdProcessingFixture) return;
    const timer = setTimeout(() => setPhase('success'), 500);
    return () => clearTimeout(timer);
  }, [holdProcessingFixture, phase]);

  return (
    <FeatureScaffold
      accessibilityLabel={copy.title}
      onBack={recovery || phase === 'email' ? (phase === 'email' ? () => setPhase('choice') : onBack) : undefined}
      scroll={false}
    >
      <View style={styles.screen}>
        <StaticVectorImage
          source={assetRegistry.heroes['lock-unified']}
          style={styles.hero}
        />

        {phase === 'success' ? (
          <View style={styles.copyBlock}>
            <Text style={styles.title}>{recovery ? signInCopy.success.title : signupCopy.success.title}</Text>
            <Text style={styles.body}>{recovery ? signInCopy.success.body : signupCopy.success.body}</Text>
            <PillButton
              fullWidth
              label={recovery ? signInCopy.success.action : signupCopy.success.primary}
              onPress={onComplete}
              variant="screen"
            />
          </View>
        ) : phase === 'failure' ? (
          <View style={styles.copyBlock}>
            <Text style={styles.title}>{failure.title}</Text>
            {'cause' in failure ? <Text style={styles.body}>{failure.cause}</Text> : null}
            <Text style={styles.body}>{failure.recovery}</Text>
            <PillButton fullWidth label={failure.actions[0]} onPress={beginProcessing} variant="screen" />
            <PillButton
              fullWidth
              label={failure.actions[1]}
              onPress={() => onBack ? onBack() : setPhase('choice')}
              variant="text"
            />
          </View>
        ) : phase === 'email' ? (
          <View style={styles.copyBlock}>
            <Text style={styles.title}>{signupCopy.email.title}</Text>
            <Text style={styles.body}>{signupCopy.email.body}</Text>
            <PillowCard variant="light">
              <Text style={styles.fieldLabel}>{signupCopy.email.fieldLabel}</Text>
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="off"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder={signupCopy.email.placeholder}
                placeholderTextColor={colors.text.placeholder}
                style={styles.input}
                value={email}
              />
            </PillowCard>
            <PillButton
              disabled={!email.includes('@') || !email.includes('.')}
              fullWidth
              label={signupCopy.email.primary}
              onPress={beginProcessing}
              variant="screen"
            />
            <PillButton label="Use guided demo email" onPress={() => setEmail(signupCopy.email.guidedValue)} variant="text" />
          </View>
        ) : (
          <View style={styles.copyBlock}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.body}>{copy.body}</Text>
            <PrototypeNotice>{copy.statusLabel}</PrototypeNotice>
            <PillButton
              fullWidth
              label={copy.primary}
              loading={phase === 'processing'}
              onPress={beginProcessing}
              variant="screen"
            />
            {phase !== 'processing' ? (
              <>
                <Text style={styles.dividerText}>or</Text>
                <PillButton fullWidth label={copy.secondary} onPress={() => setPhase('email')} variant="secondary" />
              </>
            ) : holdProcessingFixture ? (
              <PillButton
                fullWidth
                label="Back to choice"
                onPress={() => {
                  setHoldProcessingFixture(false);
                  setPhase('choice');
                }}
                variant="text"
              />
            ) : null}
          </View>
        )}

        <View style={styles.legal}>
          <Text style={styles.disclosure}>{recovery ? signInCopy.disclosure : signupCopy.footer}</Text>
          <View style={styles.legalActions}>
            <PillButton label="Terms" onPress={() => onOpenLegal('terms')} variant="text" />
            <PillButton label="Privacy" onPress={() => onOpenLegal('privacy')} variant="text" />
          </View>
        </View>
      </View>
    </FeatureScaffold>
  );
}

const styles = StyleSheet.create({
  body: { ...type.body, color: colors.text.secondary, textAlign: 'center' },
  copyBlock: { gap: space[4], width: '100%' },
  disclosure: { ...type.caption, color: colors.text.tertiary, textAlign: 'center' },
  dividerText: { ...type.caption, color: colors.text.tertiary, textAlign: 'center' },
  eyebrow: { ...type.micro, color: colors.brand.signatureAmber, textAlign: 'center', textTransform: 'uppercase' },
  fieldLabel: { ...type.label, color: colors.text.ink },
  hero: { height: 132, width: 150 },
  input: { ...type.body, backgroundColor: colors.surface.field, borderRadius: radius.control, color: colors.text.primary, marginTop: space[2], minHeight: layout.controlHeight, paddingHorizontal: space[4] },
  legal: { gap: space[1], marginTop: 'auto' },
  legalActions: { flexDirection: 'row', justifyContent: 'center' },
  screen: { alignItems: 'center', flex: 1, gap: space[4], justifyContent: 'center', paddingBottom: space[4] },
  title: { ...type.screenLarge, color: colors.text.primary, textAlign: 'center' },
});
