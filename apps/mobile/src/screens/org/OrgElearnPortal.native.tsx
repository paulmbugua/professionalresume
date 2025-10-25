/* apps/mobile/src/screens/org/OrgElearnPortal.native.tsx */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import tw from '../../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import {
  getMyOrgOrBootstrap,
  getOrgUsage,
  updateOrgBranding,
  createOrgAssignment,
  getOrgAnalytics,
  upgradeOrgTier,
  sendOrgReportTest,
  sendOrgReportRow,
  initOrgSubscription,
  confirmOrgSubscription,
} from '@mytutorapp/shared/api';
import { getOrgLearnersProgress } from '@mytutorapp/shared/api/orgApi';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/types';
import type { OrgTier } from '@mytutorapp/shared/types';
import type { OrgResp as Org, OrgAnalyticsRow, OrgLearnerProgressRow } from '@mytutorapp/shared/api/orgApi';
import { useThemePref } from '../../theme/ThemeContext';

type TabKey = 'branding' | 'assign' | 'analytics';
type Period = 'month' | 'term' | 'year';
type BillingCycle = 'monthly' | 'annual';
type PayMethod = 'PayPal' | 'M-Pesa';

const ORG_TIERS: Record<OrgTier, { seats: number; features: string[] }> = {
  starter: {
    seats: 50,
    features: ['Branding', 'Assignments', 'Monthly analytics'],
  },
  pro: {
    seats: 500,
    features: ['Custom pass marks & timers', 'Monthly/Termly/Yearly analytics', 'Email reports'],
  },
  enterprise: {
    seats: 5000,
    features: ['SSO / domain restrict', 'CSV export', 'Webhooks', 'Priority support'],
  },
};

const Pill = ({ children }: { children: React.ReactNode }) => (
  <View style={tw`px-2 py-0.5 rounded-full bg-[#e7edf4] dark:bg-white/10`}>
    <Text style={tw`text-[11px] text-[#0d141c] dark:text-white/90`}>{children}</Text>
  </View>
);

/** Safely derive a PayPal approval URL from different backend shapes */
function resolvePayPalApprovalUrl(init: unknown): string | undefined {
  const anyInit = init as Record<string, any> | undefined;

  const direct =
    anyInit?.approvalUrl ||
    anyInit?.approveUrl ||
    anyInit?.approval_url ||
    anyInit?.redirectUrl ||
    anyInit?.url ||
    anyInit?.approve_link;
  if (typeof direct === 'string') return direct;

  const links = Array.isArray(anyInit?.links) ? anyInit?.links : undefined;
  const approve = links?.find?.((l: any) => l?.rel === 'approve' && typeof l?.href === 'string')?.href;
  if (approve) return approve;

  if (typeof anyInit?.href === 'string') return anyInit?.href;

  return undefined;
}

function useFeatureGates(tier: OrgTier) {
  const has = useCallback((needle: string) => {
    const list = ORG_TIERS[tier]?.features || [];
    return list.some((f) => f.toLowerCase().includes(needle.toLowerCase()));
  }, [tier]);
  return {
    canBranding: true,
    canAssignments: true,
    canMonthly: true,
    canCustomPassTimers: has('Custom pass marks & timers'),
    canMultiPeriodAnalytics: has('Monthly/Termly/Yearly'),
    canEmailReports: has('Email reports'),
    canSSO: has('SSO'),
    canCSV: has('CSV'),
    canWebhooks: has('Webhooks'),
    hasPrioritySupport: has('Priority support'),
  };
}

/** Plan purchase modal (native, light/dark aware) */
const PlanPurchaseModal: React.FC<{
  open: boolean;
  onClose: () => void;
  tier: 'pro' | 'enterprise';
  orgName?: string | null;
  orgId: string;
  backendUrl: string;
  token: string;
  onActivated?: () => Promise<void> | void;
}> = ({ open, onClose, tier, orgName, orgId, backendUrl, token, onActivated }) => {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [method, setMethod] = useState<PayMethod>('M-Pesa'); // default to KES
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const { resolvedScheme } = useThemePref();

  const mpesaPaymentIdRef = useRef<string | null>(null);

  const ORG_PRICING_CENTS = {
    USD: {
      pro:        { monthly:  99_00,  yearly:  990_00 },
      enterprise: { monthly: 399_00,  yearly: 3990_00 },
    },
    KES: {
      pro:        { monthly: 1350000, yearly: 13500000 },
      enterprise: { monthly: 5500000, yearly: 55000000 },
    },
  } as const;

  const billKey: 'monthly' | 'yearly' = cycle === 'annual' ? 'yearly' : 'monthly';
  const currency: 'USD' | 'KES' = method === 'M-Pesa' ? 'KES' : 'USD';
  const priceCents = ORG_PRICING_CENTS[currency][tier][billKey];

  const priceLabel = useMemo(() => {
    const suffix = billKey === 'monthly' ? '/ mo' : '/ yr';
    if (currency === 'USD') return `$ ${(priceCents / 100).toFixed(2)} ${suffix}`;
    return `KSh ${Math.round(priceCents / 100).toLocaleString('en-KE')} ${suffix}`;
  }, [currency, priceCents, billKey]);

  const amountLabel = `${tier.toUpperCase()} • ${cycle === 'monthly' ? 'Monthly' : 'Annual'} • ${priceLabel}`;

  const closeAndActivate = useCallback(async () => {
    try { await onActivated?.(); } catch {}
    onClose();
  }, [onActivated, onClose]);

  const handleMpesa = useCallback(async (opts: { withReference?: boolean }) => {
    const apiCycle: 'monthly' | 'yearly' = cycle === 'annual' ? 'yearly' : 'monthly';
    try {
      if (!phone) { Alert.alert('Phone required', 'Enter your Safaricom phone number.'); return; }
      if (!/^2547\d{8}$/.test(String(phone))) {
        Alert.alert('Invalid phone', 'Phone must be like 2547XXXXXXXX'); return;
      }
      setBusy(true);

      // 1) init if needed
      if (!mpesaPaymentIdRef.current) {
        const init = await initOrgSubscription(backendUrl, token, orgId, {
          tier, cycle: apiCycle, method: 'MPESA', phone,
        });
        mpesaPaymentIdRef.current = (init as any)?.paymentId ?? (init as any)?.id ?? null;
        Alert.alert(
          'STK Push sent',
          'Approve the request on your phone, then tap "Complete Payment". If it lags, paste the M-Pesa receipt and tap "Update Reference / Complete".'
        );
        return;
      }

      // 2) confirm
      if (opts.withReference && reference) {
        await confirmOrgSubscription(backendUrl, token, mpesaPaymentIdRef.current!, reference);
        mpesaPaymentIdRef.current = null;
        Alert.alert('Activated', 'Payment confirmed. Subscription activated ✅');
        await closeAndActivate();
        return;
      }

      // try capture without reference
      try {
        await confirmOrgSubscription(backendUrl, token, mpesaPaymentIdRef.current!);
        mpesaPaymentIdRef.current = null;
        Alert.alert('Activated', 'Payment confirmed. Subscription activated ✅');
        await closeAndActivate();
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || '';
        if (/reference missing/i.test(msg)) {
          await new Promise(r => setTimeout(r, 5000));
          try {
            await confirmOrgSubscription(backendUrl, token, mpesaPaymentIdRef.current!);
            mpesaPaymentIdRef.current = null;
            Alert.alert('Activated', 'Payment confirmed. Subscription activated ✅');
            await closeAndActivate();
          } catch (err2: any) {
            const msg2 = err2?.response?.data?.message || err2?.message || '';
            if (/reference missing/i.test(msg2)) {
              Alert.alert(
                'Still pending',
                'We’re still waiting for M-Pesa to confirm. If you have the receipt on your phone, paste it in the reference field and tap "Update Reference / Complete".'
              );
              return;
            }
            Alert.alert('Payment error', msg2 || 'Payment confirmation failed.');
          }
        } else {
          Alert.alert('Payment error', msg || 'Payment confirmation failed.');
        }
      }
    } catch (e: any) {
      Alert.alert('Payment failed', e?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [backendUrl, token, orgId, cycle, phone, reference, tier, closeAndActivate]);

  const handlePayPal = useCallback(async () => {
    try {
      setBusy(true);
      const apiCycle: 'monthly' | 'yearly' = cycle === 'annual' ? 'yearly' : 'monthly';
      const init = await initOrgSubscription(backendUrl, token, orgId, {
        tier, cycle: apiCycle, method: 'PAYPAL',
      });

      const approvalUrl = resolvePayPalApprovalUrl(init);
      if (approvalUrl) {
        Linking.openURL(approvalUrl);
        Alert.alert('Complete in browser', 'After approval, return to the app.');
      } else {
        Alert.alert('Unavailable', 'PayPal approval URL not provided by backend.');
      }
    } catch (e: any) {
      Alert.alert('PayPal error', e?.message || 'Failed to initialize PayPal.');
    } finally {
      setBusy(false);
    }
  }, [backendUrl, token, orgId, tier, cycle]);

  if (!open) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={tw`flex-1 bg-black/50 justify-center items-center p-3`}>
        <View style={tw`w-full max-w-xl rounded-2xl bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 p-4`}>
          {/* Header */}
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View style={tw`flex-1 pr-2`}>
              <Text style={tw`text-[#49739c] dark:text-white/60 text-xs`} numberOfLines={1}>
                Upgrade for {orgName || 'your organization'}
              </Text>
              <Text style={tw`text-[#0d141c] dark:text-white text-base font-semibold`}>
                {tier === 'pro' ? 'Upgrade to PRO' : 'Upgrade to ENTERPRISE'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={tw`px-3 py-1 rounded-lg bg-[#e7edf4] dark:bg-white/10`}>
              <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Billing + Method */}
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center`}>
              <Text style={tw`text-[#49739c] dark:text-white/70 text-xs mr-2`}>Billing:</Text>
              <View style={tw`flex-row rounded-lg overflow-hidden border border-[#cedbe8] dark:border-white/10`}>
                <TouchableOpacity
                  onPress={() => setCycle('monthly')}
                  style={tw`px-3 py-1.5 ${cycle === 'monthly' ? 'bg-[#e7edf4] dark:bg-white/10' : ''}`}
                >
                  <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>Monthly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCycle('annual')}
                  style={tw`px-3 py-1.5 ${cycle === 'annual' ? 'bg-[#e7edf4] dark:bg-white/10' : ''}`}
                >
                  <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>Annual</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={tw`flex-row items-center`}>
              <Text style={tw`text-[#49739c] dark:text-white/70 text-xs mr-2`}>Pay with:</Text>
              <View style={tw`flex-row rounded-lg overflow-hidden border border-[#cedbe8] dark:border-white/10`}>
                <TouchableOpacity
                  onPress={() => setMethod('PayPal')}
                  style={tw`px-3 py-1.5 ${method === 'PayPal' ? 'bg-[#e7edf4] dark:bg-white/10' : ''}`}
                >
                  <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>PayPal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMethod('M-Pesa')}
                  style={tw`px-3 py-1.5 ${method === 'M-Pesa' ? 'bg-[#e7edf4] dark:bg-white/10' : ''}`}
                >
                  <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>M-Pesa</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={tw`text-[#49739c] dark:text-white/60 text-[11px] mt-2`}>
            Note: M-Pesa charges in <Text style={tw`font-semibold`}>KES</Text>. PayPal charges in <Text style={tw`font-semibold`}>USD</Text>.
          </Text>

          {/* Body */}
          <View style={tw`mt-4`}>
            {/* Summary */}
            <View style={tw`rounded-xl border border-[#cedbe8] dark:border-white/10 bg-[#f8fbff] dark:bg-white/5 p-3 mb-3`}>
              <View style={tw`flex-row justify-between`}>
                <Text style={tw`text-[#0d141c] dark:text-white font-semibold`}>{tier.toUpperCase()} plan</Text>
                <View style={tw`items-end`}>
                  <Text style={tw`text-[#0d141c] dark:text-white text-lg font-semibold`}>{priceLabel}</Text>
                  <Text style={tw`text-[#49739c] dark:text-white/70 text-[11px]`}>
                    {billKey === 'monthly' ? 'per month' : 'per year'} • {currency}
                  </Text>
                </View>
              </View>
              <Text style={tw`text-[#49739c] dark:text-white/70 text-[11px] mt-2`}>
                Selected: <Text style={tw`font-semibold text-[#0d141c] dark:text-white`}>{amountLabel}</Text>
              </Text>
            </View>

            {method === 'M-Pesa' ? (
              <View style={tw`rounded-xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-white/5 p-3`}>
                <Text style={tw`text-[#0d141c] dark:text-white font-semibold mb-2`}>M-Pesa (KES)</Text>

                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs mb-1`}>Safaricom Phone Number</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="2547XXXXXXXX"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white text-sm`}
                />

                <View style={tw`flex-row mt-3`}>
                  <TouchableOpacity
                    onPress={() => handleMpesa({})}
                    disabled={busy}
                    style={tw`mr-2 px-3 py-2 rounded bg-indigo-600 ${busy ? 'opacity-60' : ''}`}
                  >
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-white text-sm`}>Initiate STK Push</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMpesa({})}
                    disabled={busy}
                    style={tw`px-3 py-2 rounded bg-emerald-600 ${busy ? 'opacity-60' : ''}`}
                  >
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-white text-sm`}>Complete Payment</Text>}
                  </TouchableOpacity>
                </View>

                {/* Reference helper */}
                <View style={tw`mt-3`}>
                  <Text style={tw`text-[#49739c] dark:text-white/80 text-xs mb-1`}>M-Pesa Reference (if STK failed)</Text>
                  <TextInput
                    value={reference}
                    onChangeText={setReference}
                    placeholder="Receipt / reference number"
                    placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                    style={tw`bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white text-sm`}
                  />
                  <TouchableOpacity
                    onPress={() => handleMpesa({ withReference: true })}
                    disabled={busy}
                    style={tw`mt-2 px-3 py-2 rounded bg-orange-600 ${busy ? 'opacity-60' : ''}`}
                  >
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-white text-sm`}>Update Reference / Complete</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={tw`rounded-xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-white/5 p-3`}>
                <Text style={tw`text-[#0d141c] dark:text-white font-semibold mb-1`}>PayPal (USD)</Text>
                <Text style={tw`text-[#49739c] dark:text-white/70 text-xs mb-2`}>
                  Pay securely for <Text style={tw`font-semibold text-[#0d141c] dark:text-white`}>{amountLabel}</Text>. This opens the PayPal approval page.
                </Text>
                <TouchableOpacity
                  onPress={handlePayPal}
                  disabled={busy}
                  style={tw`px-3 py-2 rounded bg-indigo-600 ${busy ? 'opacity-60' : ''}`}
                >
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-white text-sm`}>Continue with PayPal</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const OrgElearnPortalNative: React.FC = () => {
  const { backendUrl, token, orgToken } = useShopContext() as any;
  const authToken: string | undefined = orgToken || token; // parity with web: prefer orgToken if present
  const [tab, setTab] = useState<TabKey>('branding');
  const route = useRoute<RouteProp<MainStackParamList,'OrgElearnPortal'>>();
  const [org, setOrg] = useState<Org | null>(null);
  const tier: OrgTier = (org?.tier as OrgTier) || 'starter';
  const tierMeta = ORG_TIERS[tier];
  const seatsMax = tierMeta.seats;

  const [seatsUsed, setSeatsUsed] = useState<number>(0);
  const [showProModal, setShowProModal] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const { resolvedScheme } = useThemePref(); // re-render on theme change

  // Branding state
  const [form, setForm] = useState<any>({
    name: '',
    logo_url: '',
    signature_url: '',
    certificate_title: 'Certificate of Completion',
    default_pass_mark: 70,
    quiz_time_limit_s: 900,
    allow_retry: false,
    email_domain: '',
    webhook_url: '',
    webhook_enabled: true,
  });

  // Assignments
  const [courseId, setCourseId] = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [passMark, setPassMark] = useState<number | ''>('');
  const [timer, setTimer] = useState<number | ''>('');
  const [dueAt, setDueAt] = useState<string>('');
  const [inviteLink, setInviteLink] = useState<string>('');

  // Analytics
  const [period, setPeriod] = useState<Period>('month');
  const [analytics, setAnalytics] = useState<OrgAnalyticsRow[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [showCongrats, setShowCongrats] = useState(false);

  // NEW: Learner progress state (parity with web)
  const [lpRows, setLpRows] = useState<OrgLearnerProgressRow[]>([]);
  const [lpCursor, setLpCursor] = useState<string | null>(null);
  const [lpLoading, setLpLoading] = useState(false);

  const {
    canBranding,
    canAssignments,
    canMonthly,
    canCustomPassTimers,
    canMultiPeriodAnalytics,
    canEmailReports,
    canSSO,
    canCSV,
    canWebhooks,
    hasPrioritySupport,
  } = useFeatureGates(tier);

  /** Load org */
  useEffect(() => {
    (async () => {
      if (!authToken) return;
      try {
        const real = await getMyOrgOrBootstrap(backendUrl, authToken);
        setOrg(real);
        setForm((f: any) => ({ ...f, ...real }));
      } catch (err) {
        console.warn('[OrgPortalNative] org load failed', err);
      }
    })();
  }, [backendUrl, authToken]);

  useEffect(() => {
    const initialTab = route.params?.tab as TabKey | undefined;
    if (initialTab) setTab(initialTab);
    const cid = route.params?.courseId;
    if (cid) setCourseId(cid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Usage seats */
  useEffect(() => {
    (async () => {
      if (!authToken || !org?.id) return;
      try {
        const { seats_used } = await getOrgUsage(backendUrl, authToken, org.id);
        setSeatsUsed(Number(seats_used ?? 0));
      } catch {
        setSeatsUsed(Number(org?.seats_used ?? 0));
      }
    })();
  }, [org?.id, org?.seats_used, backendUrl, authToken]);

  /** Save branding */
  const saveBranding = async () => {
    if (!org?.id || !authToken) {
      Alert.alert(
        'Missing organization',
        'Please create your Institution account first (For Institutions → Login/Sign up).'
      );
      return;
    }

    // Domains validation
    const domStr = String(form.email_domain || '').trim();
    if (domStr) {
      const domains = domStr
        .split(',')
        .map((d: string) => d.trim().toLowerCase())
        .filter(Boolean);
      const bad = domains.filter((d: string) => {
        if (d.includes('://')) return true;
        if (d.includes('@')) return true;
        const cleaned = d.startsWith('*.') ? d.slice(2) : d;
        return !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(cleaned);
      });
      if (bad.length) {
        Alert.alert('Invalid domain(s)', bad.join(', '));
        return;
      }
    }
    if (form.webhook_enabled) {
      const u = String(form.webhook_url || '').trim();
      if (!/^https:\/\/.+/i.test(u)) {
        Alert.alert('Invalid webhook URL', 'Webhook URL must be a valid HTTPS URL when enabled.');
        return;
      }
    }

    try {
      const updated = await updateOrgBranding(backendUrl, authToken, org.id, form);
      setOrg((prev) => ({ ...(prev ?? {}), ...(updated ?? {}) } as Org));
      setForm((f: any) => ({ ...f, ...(updated ?? {}) }));
      setShowCongrats(true);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        Alert.alert('Not available', 'Branding not available on your current plan.');
        return;
      }
      Alert.alert('Save failed', 'Please try again.');
    }
  };

  /** Assignment create */
  const createAssignment = async () => {
    if (!org?.id || !authToken || !courseId) return;
    try {
      const payload = {
        courseId,
        title_override: titleOverride || null,
        pass_mark: canCustomPassTimers ? (passMark || null) : null,
        timer_s: canCustomPassTimers ? (timer || null) : null,
        due_at: dueAt || null,
      };
      const a = await createOrgAssignment(backendUrl, authToken, org.id, payload);
      const link = `${backendUrl.replace(/\/$/, '')}/org/join/${a.invite_code}`;
      setInviteLink(link);
      Alert.alert('Assignment created', 'Invite link generated.');
    } catch {
      Alert.alert('Failed', 'Failed to create assignment.');
    }
  };

  /** Analytics */
  const loadAnalytics = useCallback(async () => {
    if (!org?.id || !authToken) return;
    setLoadingAnalytics(true);
    try {
      const p: Period = canMultiPeriodAnalytics ? period : 'month';
      const resp = await getOrgAnalytics(backendUrl, authToken, org.id, p);
      setAnalytics(resp?.data || []);
    } catch {
      setAnalytics([]);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [org?.id, backendUrl, authToken, period, canMultiPeriodAnalytics]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  /** CSV export via Share */
  const exportCSV = useCallback(async () => {
    try {
      const rows: (string | number)[][] = [['Bucket', 'Attempts', 'Passes', 'Avg Score']];
      analytics.forEach((r) => {
        const bucketISO = new Date(r.bucket).toISOString();
        const attempts = Number(r.attempts ?? 0);
        const passes = Number(r.passes ?? 0);
        const avg = `${Math.round(r.avg_score ?? 0)}%`;
        rows.push([bucketISO, attempts, passes, avg]);
      });
      const csv = rows
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      await Share.share({ message: csv });
    } catch {
      Alert.alert('Export failed', 'Could not export CSV.');
    }
  }, [analytics]);

  /** Report row email */
  const sendReportRow = async (bucketISO: string, p: Period) => {
    if (!org?.id || !authToken) return;
    try {
      const ok = await sendOrgReportRow(backendUrl, authToken, org.id, bucketISO, p);
      if (ok?.ok) Alert.alert('Queued', 'Report queued.');
      else Alert.alert('Failed', 'Failed to queue report.');
    } catch {
      Alert.alert('Failed', 'Failed to queue report.');
    }
  };

  /** Learner progress (overall) — parity with web */
  const loadLearnerProgress = useCallback(
    async (reset: boolean) => {
      if (!org?.id || !authToken) return;
      setLpLoading(true);
      try {
        const resp = await getOrgLearnersProgress(
          backendUrl,
          authToken,
          org.id,
          { limit: 25, cursor: reset ? undefined : lpCursor || undefined }
        );
        setLpRows(prev => (reset ? resp.data : [...prev, ...resp.data]));
        setLpCursor(resp.next_cursor ?? null);
      } finally {
        setLpLoading(false);
      }
    },
    [backendUrl, authToken, org?.id, lpCursor]
  );

  // Auto-load learner progress when Analytics tab opens
  useEffect(() => {
    if (tab === 'analytics') loadLearnerProgress(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, org?.id, authToken]);

  /** Minor computed */
  const seatPct = Math.min(100, Math.round(((seatsUsed || 0) / seatsMax) * 100));
  const nearLimit = seatPct >= 90;

  const copyLink = async () => {
    try {
      await Share.share({ message: inviteLink });
    } catch {}
  };

  return (
    <View style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016] px-3 pt-5 pb-8`}>
      <ScrollView contentContainerStyle={tw`pb-24`}>
        {/* Header */}
        <View style={tw`mb-4`}>
          <Text style={tw`text-[#0d141c] dark:text-white text-2xl font-bold`}>Institution E-Learning</Text>
          <Text style={tw`text-[#49739c] dark:text-white/70 text-xs`}>Branding • Assignments • Analytics</Text>
        </View>

        {/* Tabs */}
        <View style={tw`flex-row mb-3`}>
          {(['branding', 'assign', 'analytics'] as TabKey[]).map((t) => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={tw`mr-2 px-3 py-1.5 rounded-xl ${active ? 'bg-indigo-600' : 'bg-[#e7edf4] dark:bg-white/10'}`}
              >
                <Text style={tw`${active ? 'text-white' : 'text-[#0d141c] dark:text-white'} text-sm capitalize`}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Plan bar */}
        <View style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-3 mb-10`}>
          <View style={tw`flex-row flex-wrap items-center justify-between`}>
            <View style={tw`flex-row flex-wrap items-center`}>
              <Pill>Plan: <Text style={tw`font-semibold`}>{tier.toUpperCase()}</Text></Pill>
              <View style={tw`w-2`} />
              <Pill>Seats: {seatsUsed}/{seatsMax}</Pill>
              {hasPrioritySupport ? (<><View style={tw`w-2`} /><Pill>Priority support</Pill></>) : null}
            </View>

            <View style={tw`flex-row items-center mt-2`}>
              <View style={tw`w-32 h-2 rounded bg-[#e7edf4] dark:bg-white/10 overflow-hidden mr-2`}>
                <View
                  style={[
                    tw`${nearLimit ? 'bg-red-500' : 'bg-emerald-500'}`,
                    { height: '100%', width: `${seatPct}%` },
                  ]}
                />
              </View>
              {nearLimit && <Text style={tw`text-red-600 dark:text-red-300 text-xs`}>Near seat limit</Text>}
            </View>
          </View>

          <View style={tw`flex-row flex-wrap mt-2`}>
            {(['starter', 'pro', 'enterprise'] as OrgTier[])
              .filter((t) => t !== tier)
              .map((next) => (
                <TouchableOpacity
                  key={next}
                  onPress={() => {
                    if (next === 'pro') setShowProModal(true);
                    else if (next === 'enterprise') setShowEnterpriseModal(true);
                    else if (org?.id && authToken) {
                      upgradeOrgTier(backendUrl, authToken, org.id, next)
                        .then((j) => {
                          setOrg((prev: Org | null) => ({ ...((prev ?? {}) as Org), ...j }));
                          Alert.alert('Plan updated', `Changed plan to ${next.toUpperCase()}.`);
                        })
                        .catch(() => Alert.alert('Failed', 'Plan change failed. Please try again.'));
                    }
                  }}
                  style={tw`mr-2 mt-2 px-2 py-1 rounded-lg bg-indigo-600`}
                >
                  <Text style={tw`text-white text-xs`}>Upgrade → {next.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
          </View>

          <View style={tw`flex-row flex-wrap mt-2`}>
            {ORG_TIERS[tier].features.map((f) => (
              <View key={f} style={tw`mr-1 mt-1 px-2 py-0.5 rounded-full bg-[#e7edf4] dark:bg-white/10`}>
                <Text style={tw`text-[#0d141c] dark:text-white/90 text-[11px]`}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* BRANDING / ASSIGN panes */}
        {(tab === 'branding' || tab === 'assign') && (
          <View>
            {/* Branding pane */}
            {tab === 'branding' && (
              <View style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4 mb-6`}>
                <Text style={tw`text-[#0d141c] dark:text-white text-lg font-semibold mb-3`}>Branding</Text>

                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Organization name</Text>
                <TextInput
                  value={form.name}
                  onChangeText={(v) => setForm((f: any) => ({ ...f, name: v }))}
                  placeholder="My School / Org"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                />

                <View style={tw`h-3`} />
                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Logo URL</Text>
                <TextInput
                  value={form.logo_url}
                  onChangeText={(v) => setForm((f: any) => ({ ...f, logo_url: v }))}
                  placeholder="https://…/logo.png"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                />

                <View style={tw`h-3`} />
                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Signature URL</Text>
                <TextInput
                  value={form.signature_url}
                  onChangeText={(v) => setForm((f: any) => ({ ...f, signature_url: v }))}
                  placeholder="https://…/signature.png"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                />

                <View style={tw`h-3`} />
                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Certificate title</Text>
                <TextInput
                  value={form.certificate_title}
                  onChangeText={(v) => setForm((f: any) => ({ ...f, certificate_title: v }))}
                  placeholder="Certificate of Completion"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                />

                <View style={tw`h-3`} />
                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Default pass mark (%)</Text>
                <TextInput
                  keyboardType="numeric"
                  value={String(form.default_pass_mark ?? '')}
                  onChangeText={(v) => setForm((f: any) => ({ ...f, default_pass_mark: Number(v) || 0 }))}
                  placeholder="70"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                />

                <View style={tw`h-3`} />
                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Quiz time limit (seconds)</Text>
                <TextInput
                  keyboardType="numeric"
                  value={String(form.quiz_time_limit_s ?? '')}
                  onChangeText={(v) => setForm((f: any) => ({ ...f, quiz_time_limit_s: Number(v) || 0 }))}
                  placeholder="900"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                />

                <View style={tw`h-3`} />
                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Allowed email domains (comma separated)</Text>
                <TextInput
                  value={form.email_domain ?? ''}
                  onChangeText={(v) => setForm((f: any) => ({ ...f, email_domain: v }))}
                  placeholder="example.edu,school.ac.ke"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                />

                <View style={tw`h-3`} />
                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Webhook URL (HTTPS)</Text>
                <TextInput
                  value={form.webhook_url ?? ''}
                  onChangeText={(v) => setForm((f: any) => ({ ...f, webhook_url: v }))}
                  placeholder="https://example.com/webhooks/elearn"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                />

                <View style={tw`flex-row mt-4`}>
                  <TouchableOpacity onPress={saveBranding} style={tw`px-4 py-2 rounded-xl bg-emerald-600`}>
                    <Text style={tw`text-white font-semibold`}>Save branding</Text>
                  </TouchableOpacity>
                  {canEmailReports && (
                    <TouchableOpacity
                      onPress={async () => {
                        if (!org?.id || !authToken) return;
                        try {
                          const resp = await sendOrgReportTest(backendUrl, authToken, org.id, org?.owner_email || undefined);
                          Alert.alert(resp?.ok ? 'Sent' : 'Failed', resp?.ok ? 'Test report sent to admin email.' : 'Failed to send report.');
                        } catch {
                          Alert.alert('Error', 'Failed to send report.');
                        }
                      }}
                      style={tw`ml-2 px-4 py-2 rounded-xl bg-indigo-600`}
                    >
                      <Text style={tw`text-white font-semibold`}>Send test report</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Assign pane */}
            {tab === 'assign' && (
              <View style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}>
                <Text style={tw`text-[#0d141c] dark:text-white text-lg font-semibold mb-3`}>Assignments</Text>
                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Course ID</Text>
                <TextInput
                  value={courseId}
                  onChangeText={setCourseId}
                  placeholder="COURSE_ID"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                />

                <View style={tw`h-3`} />
                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Title override (optional)</Text>
                <TextInput
                  value={titleOverride}
                  onChangeText={setTitleOverride}
                  placeholder="Custom title"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                />

                {canCustomPassTimers && (
                  <>
                    <View style={tw`h-3`} />
                    <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Pass mark (%)</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={String(passMark ?? '')}
                      onChangeText={(v) => setPassMark(v === '' ? '' : Number(v) || 0)}
                      placeholder="e.g. 70"
                      placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                    />
                    <View style={tw`h-3`} />
                    <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Timer (seconds)</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={String(timer ?? '')}
                      onChangeText={(v) => setTimer(v === '' ? '' : Number(v) || 0)}
                      placeholder="e.g. 1800"
                      placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                    />
                  </>
                )}

                <View style={tw`h-3`} />
                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs`}>Due at (ISO 8601 or empty)</Text>
                <TextInput
                  value={dueAt}
                  onChangeText={setDueAt}
                  placeholder="2025-09-30T17:00:00Z"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white`}
                />

                <View style={tw`flex-row mt-4`}>
                  <TouchableOpacity onPress={createAssignment} style={tw`px-4 py-2 rounded-xl bg-emerald-600`}>
                    <Text style={tw`text-white font-semibold`}>Create assignment</Text>
                  </TouchableOpacity>
                </View>

                {!!inviteLink && (
                  <View style={tw`mt-4`}>
                    <Text style={tw`text-[#49739c] dark:text-white/80 text-xs mb-1`}>Invite link</Text>
                    <Text selectable style={tw`text-[#0d141c] dark:text-white text-xs`}>{inviteLink}</Text>
                    <TouchableOpacity onPress={copyLink} style={tw`mt-2 px-3 py-2 rounded bg-indigo-600 self-start`}>
                      <Text style={tw`text-white text-xs`}>Share / Copy</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Analytics */}
        {tab === 'analytics' && (
          <View style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <Text style={tw`text-[#0d141c] dark:text-white text-lg font-semibold`}>Analytics</Text>
              <View style={tw`flex-row`}>
                <TouchableOpacity
                  onPress={() => setPeriod('month')}
                  style={tw`px-3 py-1.5 rounded-lg mr-2 ${period === 'month' ? 'bg-indigo-600' : 'bg-[#e7edf4] dark:bg-white/10'}`}
                >
                  <Text style={tw`${period === 'month' ? 'text-white' : 'text-[#0d141c] dark:text-white'} text-xs`}>Monthly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={!canMultiPeriodAnalytics}
                  onPress={() => setPeriod('term')}
                  style={tw`px-3 py-1.5 rounded-lg mr-2 ${period === 'term' ? 'bg-indigo-600' : 'bg-[#e7edf4] dark:bg-white/10'} ${!canMultiPeriodAnalytics ? 'opacity-50' : ''}`}
                >
                  <Text style={tw`${period === 'term' ? 'text-white' : 'text-[#0d141c] dark:text-white'} text-xs`}>Termly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={!canMultiPeriodAnalytics}
                  onPress={() => setPeriod('year')}
                  style={tw`px-3 py-1.5 rounded-lg ${period === 'year' ? 'bg-indigo-600' : 'bg-[#e7edf4] dark:bg-white/10'} ${!canMultiPeriodAnalytics ? 'opacity-50' : ''}`}
                >
                  <Text style={tw`${period === 'year' ? 'text-white' : 'text-[#0d141c] dark:text-white'} text-xs`}>Yearly</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={tw`flex-row mb-3`}>
              <TouchableOpacity onPress={loadAnalytics} style={tw`px-3 py-2 rounded-lg bg-indigo-600 mr-2`}>
                <Text style={tw`text-white text-xs`}>Refresh</Text>
              </TouchableOpacity>
              {canCSV && (
                <TouchableOpacity onPress={exportCSV} style={tw`px-3 py-2 rounded-lg bg-[#e7edf4] dark:bg-white/10`}>
                  <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>Export CSV</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingAnalytics ? (
              <View style={tw`py-6 items-center`}><ActivityIndicator color={resolvedScheme === 'dark' ? '#ffffff' : '#0d141c'} /></View>
            ) : analytics.length === 0 ? (
              <Text style={tw`text-[#49739c] dark:text-white/80 text-sm`}>No analytics yet.</Text>
            ) : (
              <View>
                {analytics.map((row, idx) => (
                  <View key={`${row.bucket}-${idx}`} style={tw`mb-2 p-3 rounded-lg bg-[#f8fbff] dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10`}>
                    <Text style={tw`text-[#0d141c] dark:text-white font-semibold`}>{new Date(row.bucket).toLocaleString()}</Text>
                    <Text style={tw`text-[#49739c] dark:text-white/80 text-xs mt-1`}>Attempts: {row.attempts} • Passes: {row.passes} • Avg: {Math.round(row.avg_score ?? 0)}%</Text>

                    {canEmailReports && (
                      <TouchableOpacity
                        onPress={() => sendReportRow(new Date(row.bucket).toISOString(), period)}
                        style={tw`mt-2 px-3 py-1.5 rounded bg-[#e7edf4] dark:bg-white/10 self-start`}
                      >
                        <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>Send report for this period</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Learner Progress (overall) */}
            <View style={tw`mt-4`}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <Text style={tw`text-[#0d141c] dark:text-white text-base font-semibold`}>Learner Progress (overall)</Text>
                <View style={tw`flex-row items-center`}>
                  {lpLoading ? <Text style={tw`text-[#49739c] dark:text-white/70 text-xs mr-2`}>Loading…</Text> : null}
                  <TouchableOpacity
                    onPress={() => loadLearnerProgress(true)}
                    style={tw`px-3 py-1.5 rounded bg-[#e7edf4] dark:bg-white/10`}
                  >
                    <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(!lpRows.length && !lpLoading) ? (
                <Text style={tw`text-[#49739c] dark:text-white/70 text-sm`}>No learner data yet.</Text>
              ) : (
                <View>
                  {lpRows.map((r) => (
                    <View key={String(r.user_id)} style={tw`mb-2 p-3 rounded-lg bg-[#f8fbff] dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10`}>
                      <Text style={tw`text-[#0d141c] dark:text-white font-semibold`}>
                        {r.name || r.email || `User #${r.user_id}`}
                      </Text>
                      {r.email ? (
                        <Text style={tw`text-[#49739c] dark:text-white/60 text-[11px]`}>{r.email}</Text>
                      ) : null}
                      <Text style={tw`text-[#49739c] dark:text-white/80 text-xs mt-1`}>
                        Attempts: {r.attempts} • Passes: {r.passes} • Avg: {r.avg_score != null ? Math.round(r.avg_score) : 0}%
                      </Text>
                      <Text style={tw`text-[#49739c] dark:text-white/80 text-xs mt-1`}>
                        Completed: {r.completed_assignments} • Progress: {r.progress_pct}%
                      </Text>
                      <Text style={tw`text-[#49739c] dark:text-white/60 text-[11px] mt-1`}>
                        Last Submit: {r.last_submit_at ? new Date(r.last_submit_at).toLocaleString() : '—'}
                      </Text>
                    </View>
                  ))}
                  {lpCursor && (
                    <TouchableOpacity
                      onPress={() => loadLearnerProgress(false)}
                      disabled={lpLoading}
                      style={tw`mt-1 px-3 py-1.5 rounded bg-indigo-600 self-start ${lpLoading ? 'opacity-60' : ''}`}
                    >
                      <Text style={tw`text-white text-xs`}>Load more</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Congrats modal */}
      <Modal visible={showCongrats} transparent animationType="fade" onRequestClose={() => setShowCongrats(false)}>
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
          <View style={tw`w-full max-w-md rounded-2xl bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 p-5`}>
            <View style={tw`flex-row items-start`}>
              <View style={tw`h-10 w-10 rounded-full bg-emerald-500/15 items-center justify-center mr-3`}>
                <Text style={tw`text-xl`}>🎉</Text>
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-[#0d141c] dark:text-white text-lg font-semibold`}>Brand saved!</Text>
                <Text style={tw`text-[#49739c] dark:text-white/80 text-sm mt-1`}>
                  Your institution profile is ready. Want to set up an assignment now?
                </Text>
              </View>
            </View>

            <View style={tw`mt-4 flex-row flex-wrap`}>
              <TouchableOpacity
                onPress={() => { setShowCongrats(false); setTab('assign'); }}
                style={tw`mr-2 mb-2 px-4 py-2 rounded-xl bg-emerald-600`}
              >
                <Text style={tw`text-white font-semibold`}>Go to Assignments</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowCongrats(false)}
                style={tw`mb-2 px-4 py-2 rounded-xl bg-[#e7edf4] dark:bg-white/10`}
              >
                <Text style={tw`text-[#0d141c] dark:text-white`}>Not now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Plan Modals */}
      {authToken && org?.id ? (
        <>
          <PlanPurchaseModal
            open={showProModal}
            onClose={() => setShowProModal(false)}
            tier="pro"
            orgName={org?.name}
            orgId={org.id}
            backendUrl={backendUrl}
            token={authToken}
            onActivated={async () => {
              const updated = await getMyOrgOrBootstrap(backendUrl, authToken);
              setOrg(updated);
            }}
          />
          <PlanPurchaseModal
            open={showEnterpriseModal}
            onClose={() => setShowEnterpriseModal(false)}
            tier="enterprise"
            orgName={org?.name}
            orgId={org.id}
            backendUrl={backendUrl}
            token={authToken}
            onActivated={async () => {
              const updated = await getMyOrgOrBootstrap(backendUrl, authToken);
              setOrg(updated);
            }}
          />
        </>
      ) : null}
    </View>
  );
};

export default OrgElearnPortalNative;
