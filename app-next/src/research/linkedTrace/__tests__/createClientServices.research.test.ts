import { createClientServices, LAB_RESEARCH_USER_ID } from '../createClientServices.research';
import { entitlementStore } from '../../../state/entitlementStore';

// Executable lab-identity proof: the research graph must not even load the
// production identity SDKs, let alone initialize, authenticate, or identify
// against them. These factories record evaluation instead of failing so the
// assertions can name the exact violation.
let mockSupabaseEvaluated = false;
let mockAdaptyEvaluated = false;
jest.mock('@supabase/supabase-js', () => {
  mockSupabaseEvaluated = true;
  return {};
});
jest.mock('react-native-adapty', () => {
  mockAdaptyEvaluated = true;
  return {};
});

const options = {
  version: '1',
  build: '1',
  beforeDelete: jest.fn(async () => undefined),
  afterDelete: jest.fn(async () => undefined),
  reportError: jest.fn(),
};

test('the lab identity graph is local and never touches production Supabase or Adapty', async () => {
  entitlementStore.getState().patch({ entitlement: { status: 'none', renewsAt: null } });
  const services = await createClientServices(options);

  expect(services.auth.identity()).toMatchObject({
    kind: 'canonical',
    userId: LAB_RESEARCH_USER_ID,
    isAnonymous: true,
    ready: true,
  });
  expect(await services.boot()).toMatchObject({ userId: LAB_RESEARCH_USER_ID });
  expect(await services.waitForIdentityReady()).toMatchObject({ kind: 'canonical', ready: true });
  expect(services.analytics).toBeDefined();
  expect(services.experiments).toBeDefined();
  expect(services.reviewPreset).toBeDefined();
  expect(services.notifications).toBeDefined();
  expect(services.dataExport).toBeDefined();

  // The local research entitlement is what the guided screen and the
  // enforcement policy read; no production subscription wrote it.
  expect(services.subscription.entitlement()).toMatchObject({ status: 'active' });
  expect(entitlementStore.getState().data.entitlement.status).toBe('active');
  await expect(services.subscription.identify(LAB_RESEARCH_USER_ID)).resolves.toBeUndefined();
  await expect(services.subscription.reset()).resolves.toBeUndefined();
  expect(entitlementStore.getState().data.entitlement.status).toBe('active');

  // Production account surfaces are explicitly unavailable in the lab.
  await expect(services.auth.signInWithApple()).rejects.toThrow(/isolated research build/);
  await expect(services.auth.signInWithGoogle()).rejects.toThrow(/isolated research build/);
  await expect(services.auth.deleteAccount()).rejects.toThrow(/isolated research build/);
  await expect(services.subscription.purchase('any')).rejects.toThrow(/isolated research build/);

  expect(mockSupabaseEvaluated).toBe(false);
  expect(mockAdaptyEvaluated).toBe(false);
  await services.dispose();
});
