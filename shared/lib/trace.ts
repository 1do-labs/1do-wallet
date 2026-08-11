import { createModuleLogger, createProjectLogger } from '@metamask/utils';
import type {
  TraceCallback as ControllerTraceCallback,
  TraceRequest as ControllerTraceRequest,
  TraceContext as ControllerTraceContext,
} from '@metamask/controller-utils';

export enum TraceName {
  AccountList = 'Account List',
  AccountOverviewAssetListTab = 'Account Overview Asset List Tab',
  AccountOverviewNftsTab = 'Account Overview Nfts Tab',
  AccountOverviewActivityTab = 'Account Overview Activity Tab',
  AccountOverviewRuntimeTab = 'Account Overview Runtime Tab',
  AssetDetails = 'Asset Details',
  BackgroundConnect = 'Background Connect',
  BridgeBalancesUpdated = 'Bridge Balances Updated',
  BridgeViewLoaded = 'Bridge View Loaded',
  ConnectPage = 'Connect Page',
  CreateAccount = 'Create Account',
  DeveloperTest = 'Developer Test',
  DisconnectAllModal = 'Disconnect All Modal',
  FirstRender = 'First Render',
  ImportNfts = 'Import Nfts',
  ImportTokens = 'Import Tokens',
  LazyLoadComponent = 'Lazy Load Component',
  LoadScripts = 'Load Scripts',
  Middleware = 'Middleware',
  NestedTest1 = 'Nested Test 1',
  NestedTest2 = 'Nested Test 2',
  NetworkList = 'Network List',
  NotificationDisplay = 'Notification Display',
  PPOMValidation = 'PPOM Validation',
  ReceiveModal = 'Receive Modal',
  SendCompleted = 'Send Completed',
  SetupStore = 'Setup Store',
  Signature = 'Signature',
  SwapQuotesFetched = 'Swap Quotes Fetched',
  SwapViewLoaded = 'Swap View Loaded',
  Transaction = 'Transaction',
  UIStartup = 'UI Startup',
  RevealSeed = 'Reveal Seed',
  ImportSrp = 'Import Srp',
  AddAccount = 'Add Account',
  LoadCollectibles = 'Load Collectibles',
  GetAssetHistoricalPrices = 'Get Asset Historical Prices',
  OnFinishedTransaction = 'On Finished Transaction',
  AccountSyncFull = 'Account Sync Full',
  AccountSyncSaveIndividual = 'Account Sync Save Individual',
  ContactSyncFull = 'Contact Sync Full',
  ContactSyncDeleteRemote = 'Contact Sync Delete Remote',
  ContactSyncUpdateRemote = 'Contact Sync Update Remote',
  ContactSyncSaveBatch = 'Contact Sync Save Batch',
  OnboardingNewSrpCreateWallet = 'Onboarding - New SRP Create Wallet',
  OnboardingExistingSrpImport = 'Onboarding - Existing SRP Import',
  OnboardingJourneyOverall = 'Onboarding - Overall Journey',
  OnboardingPasswordSetupAttempt = 'Onboarding - Password Setup Attempt',
  OnboardingPasswordLoginAttempt = 'Onboarding - Password Login Attempt',
  OnboardingResetPassword = 'Onboarding - Reset Password',
  OnboardingCreateKeyAndBackupSrp = 'Onboarding - Create Key and Backup SRP',
  OnboardingAddSrp = 'Onboarding - Add SRP',
  OnboardingFetchSrps = 'Onboarding - Fetch SRPs',
  OnboardingResetPasswordError = 'Onboarding - Reset Password Error',
  OnboardingCreateKeyAndBackupSrpError = 'Onboarding - Create Key and Backup SRP Error',
  OnboardingAddSrpError = 'Onboarding - Add SRP Error',
  OnboardingFetchSrpsError = 'Onboarding - Fetch SRPs Error',
  ShowAccountList = 'Show Account List',
  ShowAccountAddressList = 'Show Account Address List',
  ShowAccountPrivateKeyList = 'Show Account Private Key List',
  CreateMultichainAccount = 'Create Multichain Account',
  DiscoverAccounts = 'Discover Accounts',
  EvmDiscoverAccounts = 'EVM Discover Accounts',
  BackgroundRpc = 'Background RPC',
  MessengerCall = 'Messenger Call',
}

export enum TraceOperation {
  AccountList = 'account.list',
  OnboardingUserJourney = 'onboarding.user_journey',
  OnboardingSecurityOp = 'onboarding.security_operation',
  OnboardingError = 'onboarding.error',
  AccountCreate = 'account.create',
  AccountUi = 'account.ui',
  AccountDiscover = 'account.discover',
}

const log = createModuleLogger(createProjectLogger('local-trace'), 'trace');
const tracesByKey = new Map<string, PendingTrace>();
const durationsByName: Record<string, number> = {};
if (process.env.IN_TEST && globalThis.stateHooks) {
  globalThis.stateHooks.getCustomTraces = () => durationsByName;
}

type LocalSpan = {
  end: (timestamp?: number) => void;
  setAttribute: (key: string, value: unknown) => void;
  spanContext: () => { traceId: string; spanId: string };
};
type PendingTrace = {
  end: (timestamp?: number) => void;
  request: TraceRequest;
  startTime: number;
  span?: LocalSpan;
};
export type TraceContext = unknown;
export type SerializedTraceContext = {
  _name?: string;
  _id?: string;
  _traceId?: string;
  _spanId?: string;
};
export type TraceCallback<ResultType> = (context?: TraceContext) => ResultType;
export type TraceRequest = {
  data?: Record<string, number | string | boolean>;
  id?: string;
  name: TraceName;
  parentContext?: TraceContext;
  startTime?: number;
  tags?: Record<string, number | string | boolean>;
  op?: string;
};
export type EndTraceRequest = {
  id?: string;
  name: TraceName;
  timestamp?: number;
  data?: Record<string, number | string | boolean>;
};

function key(request: TraceRequest | EndTraceRequest): string {
  return `${request.name}:${request.id ?? 'default'}`;
}
function now(): number {
  return typeof performance === 'undefined'
    ? Date.now()
    : performance.timeOrigin + performance.now();
}
function makeSpan(): LocalSpan {
  const traceId = Math.random().toString(16).slice(2).padEnd(16, '0');
  const spanId = Math.random().toString(16).slice(2).padEnd(8, '0');
  return {
    end: () => undefined,
    setAttribute: () => undefined,
    spanContext: () => ({ traceId, spanId }),
  };
}
function finish(
  request: TraceRequest,
  start: number,
  end: number,
  error?: unknown,
): void {
  durationsByName[request.name] = end - start;
  log('Finished trace', request.name, end - start, { request, error });
}

export function trace<Result>(
  request: TraceRequest,
  fn: TraceCallback<Result>,
): Result;
export function trace(request: TraceRequest): TraceContext;
export function trace<Result>(
  request: TraceRequest,
  fn?: TraceCallback<Result>,
): Result | TraceContext {
  const span = makeSpan();
  const start = request.startTime ?? now();
  if (!fn) {
    tracesByKey.set(key(request), {
      end: (timestamp) => span.end(timestamp),
      request,
      startTime: start,
      span,
    });
    return span;
  }
  try {
    const result = fn(span);
    if (result instanceof Promise) {
      return result.finally(() => finish(request, start, now())) as Result;
    }
    finish(request, start, now());
    return result;
  } catch (error) {
    finish(request, start, now(), error);
    throw error;
  }
}

export const traceAsControllerCallback: ControllerTraceCallback = <Result>(
  request: ControllerTraceRequest,
  fn?: (context?: ControllerTraceContext) => Result,
) =>
  Promise.resolve(
    fn
      ? trace({ ...request, name: request.name as TraceName }, fn)
      : trace({ ...request, name: request.name as TraceName }),
  ) as Promise<Result>;

export function endTrace(request: EndTraceRequest): void {
  const pending = tracesByKey.get(key(request));
  if (!pending) {
    return;
  }
  for (const [attribute, value] of Object.entries(request.data ?? {})) {
    pending.span?.setAttribute(attribute, value);
  }
  pending.end(request.timestamp);
  tracesByKey.delete(key(request));
  finish(pending.request, pending.startTime, request.timestamp ?? now());
}

export function getSerializedTraceContext():
  | SerializedTraceContext
  | undefined {
  return undefined;
}
export function serializeTraceContext(
  _span: LocalSpan | null | undefined,
  request: { name: string; id?: string },
): SerializedTraceContext {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  return { _name: request.name, _id: request.id };
}
export function getPerformanceTimestamp(): number {
  return now();
}
