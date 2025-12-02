// apps/mobile/src/screens/org/OrgElearnPortal.native.tsx
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
  Switch,
  Platform,
} from 'react-native';
import tw from '../../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import { uploadAsset } from '@mytutorapp/shared/api';
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
  getOrgLearnersProgress,
  getOrgAssignmentsForLearner,
  submitOrgLegacyAssignment,
  createOrgLegacyAssignment,
  type OrgResp as Org,
  type OrgAnalyticsRow,
  type OrgLearnerProgressRow,
  type OrgAssignmentRow,
} from '@mytutorapp/shared/api/orgApi';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { MainStackParamList } from '../../navigation/types';
import type { OrgTier } from '@mytutorapp/shared/types';
import { useThemePref } from '../../theme/ThemeContext';
import { useOrg } from '@mytutorapp/shared/hooks/useOrg';
import * as DocumentPicker from 'expo-document-picker';

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
  const has = useCallback(
    (needle: string) => {
      const list = ORG_TIERS[tier]?.features || [];
      return list.some((f) => f.toLowerCase().includes(needle.toLowerCase()));
    },
    [tier]
  );
  return {
    canBranding: true,
    canAssignments: true,
    canMonthly: true,
    canCustomPassTimers: has('custom pass marks'),
    canMultiPeriodAnalytics: has('monthly/termly/yearly'),
    canEmailReports: has('email reports'),
    canSSO: has('sso'),
    canCSV: has('csv'),
    canWebhooks: has('webhooks'),
    hasPrioritySupport: has('priority support'),
  };
}

/* ──────────────────────────────
   PlanPurchaseModal (unchanged)
────────────────────────────── */
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
  const [method, setMethod] = useState<PayMethod>('M-Pesa');
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const { resolvedScheme } = useThemePref();

  const mpesaPaymentIdRef = useRef<string | null>(null);

  const ORG_PRICING_CENTS = {
    USD: {
      pro: { monthly: 99_00, yearly: 990_00 },
      enterprise: { monthly: 399_00, yearly: 3990_00 },
    },
    KES: {
      pro: { monthly: 1350000, yearly: 13500000 },
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
    try {
      await onActivated?.();
    } catch {}
    onClose();
  }, [onActivated, onClose]);

  const handleMpesa = useCallback(
    async (opts: { withReference?: boolean }) => {
      const apiCycle: 'monthly' | 'yearly' = cycle === 'annual' ? 'yearly' : 'monthly';
      try {
        if (!phone) {
          Alert.alert('Phone required', 'Enter your Safaricom phone number.');
          return;
        }
        if (!/^2547\d{8}$/.test(String(phone))) {
          Alert.alert('Invalid phone', 'Phone must be like 2547XXXXXXXX');
          return;
        }
        setBusy(true);

        if (!mpesaPaymentIdRef.current) {
          const init = await initOrgSubscription(backendUrl, token, orgId, {
            tier,
            cycle: apiCycle,
            method: 'MPESA',
            phone,
          });
          mpesaPaymentIdRef.current = (init as any)?.paymentId ?? (init as any)?.id ?? null;
          Alert.alert(
            'STK Push sent',
            'Approve the request on your phone, then tap "Complete Payment". If it lags, paste the M-Pesa receipt and tap "Update Reference / Complete".'
          );
          return;
        }

        if (opts.withReference && reference) {
          await confirmOrgSubscription(backendUrl, token, mpesaPaymentIdRef.current!, reference);
          mpesaPaymentIdRef.current = null;
          Alert.alert('Activated', 'Payment confirmed. Subscription activated ✅');
          await closeAndActivate();
          return;
        }

        try {
          await confirmOrgSubscription(backendUrl, token, mpesaPaymentIdRef.current!);
          mpesaPaymentIdRef.current = null;
          Alert.alert('Activated', 'Payment confirmed. Subscription activated ✅');
          await closeAndActivate();
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || '';
          if (/reference missing/i.test(msg)) {
            await new Promise((r) => setTimeout(r, 5000));
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
    },
    [backendUrl, token, orgId, cycle, phone, reference, tier, closeAndActivate]
  );

  const handlePayPal = useCallback(async () => {
    try {
      setBusy(true);
      const apiCycle: 'monthly' | 'yearly' = cycle === 'annual' ? 'yearly' : 'monthly';
      const init = await initOrgSubscription(backendUrl, token, orgId, {
        tier,
        cycle: apiCycle,
        method: 'PAYPAL',
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
        <View
          style={tw`w-full max-w-xl rounded-2xl bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 p-4`}
        >
          {/* header */}
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View style={tw`flex-1 pr-2`}>
              <Text style={tw`text-[#49739c] dark:text-white/60 text-xs`} numberOfLines={1}>
                Upgrade for {orgName || 'your organization'}
              </Text>
              <Text style={tw`text-[#0d141c] dark:text-white text-base font-semibold`}>
                {tier === 'pro' ? 'Upgrade to PRO' : 'Upgrade to ENTERPRISE'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={tw`px-3 py-1 rounded-lg bg-[#e7edf4] dark:bg:white/10`}
            >
              <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* billing + method */}
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center`}>
              <Text style={tw`text-[#49739c] dark:text-white/70 text-xs mr-2`}>Billing:</Text>
              <View style={tw`flex-row rounded-lg overflow-hidden border border-[#cedbe8] dark:border-white/10`}>
                <TouchableOpacity
                  onPress={() => setCycle('monthly')}
                  style={tw`px-3 py-1.5 ${cycle === 'monthly' ? 'bg-[#e7edf4] dark:bg:white/10' : ''}`}
                >
                  <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>Monthly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCycle('annual')}
                  style={tw`px-3 py-1.5 ${cycle === 'annual' ? 'bg-[#e7edf4] dark:bg:white/10' : ''}`}
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
                  style={tw`px-3 py-1.5 ${method === 'PayPal' ? 'bg-[#e7edf4] dark:bg:white/10' : ''}`}
                >
                  <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>PayPal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMethod('M-Pesa')}
                  style={tw`px-3 py-1.5 ${method === 'M-Pesa' ? 'bg-[#e7edf4] dark:bg:white/10' : ''}`}
                >
                  <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>M-Pesa</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={tw`text-[#49739c] dark:text-white/60 text-[11px] mt-2`}>
            Note: M-Pesa charges in <Text style={tw`font-semibold`}>KES</Text>. PayPal charges in{' '}
            <Text style={tw`font-semibold`}>USD</Text>.
          </Text>

          {/* body */}
          <View style={tw`mt-4`}>
            <View
              style={tw`rounded-xl border border-[#cedbe8] dark:border-white/10 bg-[#f8fbff] dark:bg:white/5 p-3 mb-3`}
            >
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
                Selected:{' '}
                <Text style={tw`font-semibold text-[#0d141c] dark:text-white`}>{amountLabel}</Text>
              </Text>
            </View>

            {method === 'M-Pesa' ? (
              <View
                style={tw`rounded-xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg:white/5 p-3`}
              >
                <Text style={tw`text-[#0d141c] dark:text-white font-semibold mb-2`}>M-Pesa (KES)</Text>

                <Text style={tw`text-[#49739c] dark:text-white/80 text-xs mb-1`}>Safaricom Phone Number</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="2547XXXXXXXX"
                  placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  style={tw`bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white text-sm`}
                />

                <View style={tw`flex-row mt-3`}>
                  <TouchableOpacity
                    onPress={() => handleMpesa({})}
                    disabled={busy}
                    style={tw`mr-2 px-3 py-2 rounded bg-indigo-600 ${busy ? 'opacity-60' : ''}`}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={tw`text-white text-sm`}>Initiate STK Push</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMpesa({})}
                    disabled={busy}
                    style={tw`px-3 py-2 rounded bg-emerald-600 ${busy ? 'opacity-60' : ''}`}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={tw`text-white text-sm`}>Complete Payment</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={tw`mt-3`}>
                  <Text style={tw`text-[#49739c] dark:text-white/80 text-xs mb-1`}>
                    M-Pesa Reference (if STK failed)
                  </Text>
                  <TextInput
                    value={reference}
                    onChangeText={setReference}
                    placeholder="Receipt / reference number"
                    placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                    style={tw`bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text-white text-sm`}
                  />
                  <TouchableOpacity
                    onPress={() => handleMpesa({ withReference: true })}
                    disabled={busy}
                    style={tw`mt-2 px-3 py-2 rounded bg-orange-600 ${busy ? 'opacity-60' : ''}`}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={tw`text-white text-sm`}>Update Reference / Complete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View
                style={tw`rounded-xl border border-[#cedbe8] dark:border:white/10 bg-white dark:bg:white/5 p-3`}
              >
                <Text style={tw`text-[#0d141c] dark:text-white font-semibold mb-1`}>PayPal (USD)</Text>
                <Text style={tw`text-[#49739c] dark:text-white/70 text-xs mb-2`}>
                  Pay securely for{' '}
                  <Text style={tw`font-semibold text-[#0d141c] dark:text-white`}>{amountLabel}</Text>. This opens the
                  PayPal approval page.
                </Text>
                <TouchableOpacity
                  onPress={handlePayPal}
                  disabled={busy}
                  style={tw`px-3 py-2 rounded bg-indigo-600 ${busy ? 'opacity-60' : ''}`}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={tw`text-white text-sm`}>Continue with PayPal</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ──────────────────────────────
   Main screen
────────────────────────────── */
const OrgElearnPortalNative: React.FC = () => {
  const { backendUrl, token, orgToken } = useShopContext() as any;
  const authToken: string | undefined = orgToken || token;
  const { role } = (useOrg?.() ?? {}) as { org?: Org | null; role?: string | null };
  const isInstructor = role === 'instructor';

  const route = useRoute<RouteProp<MainStackParamList, 'OrgElearnPortal'>>();
  const navigation = useNavigation<any>();
  const paramsAny = (route.params || {}) as any;
  const viewParam = paramsAny.view;
  const isLearnerView = viewParam === 'learner';
  const learnerStudentId = paramsAny.studentId ?? paramsAny.student_id ?? '';
  const learnerClassFromRoute = paramsAny.class ?? paramsAny.class_label ?? '';
  const learnerSubjectFromRoute =
    paramsAny.subject ?? paramsAny.subjectKey ?? paramsAny.subject_key ?? '';

  const [tab, setTab] = useState<TabKey>(isLearnerView || isInstructor ? 'assign' : 'branding');
  const [org, setOrg] = useState<Org | null>(null);
  const tier: OrgTier = (org?.tier as OrgTier) || 'starter';
  const tierMeta = ORG_TIERS[tier];
  const seatsMax = tierMeta.seats;

  const [seatsUsed, setSeatsUsed] = useState<number>(0);
  const [showProModal, setShowProModal] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const { resolvedScheme } = useThemePref();

  const canBrandingRole = !isInstructor && !isLearnerView;
  const canUpgradePlan = !isInstructor && !isLearnerView;

  // branding form
  const [form, setForm] = useState<any>({
    name: '',
    logo_url: '',
    signature_url: '',
    instructor_signature_url: '',
    certificate_title: 'Certificate of Completion',
    default_pass_mark: 70,
    quiz_time_limit_s: 900,
    allow_retry: false,
    email_domain: '',
    webhook_url: '',
    webhook_enabled: true,
    address_line1: '',
    address_line2: '',
    phone_number: '',
    contact_email: '',
    website_url: '',
  });

  // collapsible state
  const [showLogoSection, setShowLogoSection] = useState(true);
  const [showSsoSection, setShowSsoSection] = useState(true);
  const [showInstructorsSection, setShowInstructorsSection] = useState(false);

  // upload busy
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingInstructorSignature, setUploadingInstructorSignature] = useState(false);

  // assign
  const [courseId, setCourseId] = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [passMark, setPassMark] = useState<number | ''>('');
  const [timer, setTimer] = useState<number | ''>('');
  const [dueAt, setDueAt] = useState<string>('');
  const [inviteLink, setInviteLink] = useState<string>('');

    // assignment scope (class / subject) for classic + AI hints
  const [assignClassLabel, setAssignClassLabel] = useState('');
  const [assignSubjectKey, setAssignSubjectKey] = useState('');

  
  // deadline pickers
  const [legacyDueDate, setLegacyDueDate] = useState<Date | null>(null);
  const [legacyDuePickerOpen, setLegacyDuePickerOpen] = useState(false);

  const [aiDueDate, setAiDueDate] = useState<Date | null>(null);
  const [aiDuePickerOpen, setAiDuePickerOpen] = useState(false);


  // classic (legacy/file-based) assignment state
  const [legacyTitle, setLegacyTitle] = useState('');
  const [legacyInstructions, setLegacyInstructions] = useState('');
  const [legacyDueAt, setLegacyDueAt] = useState('');
  const [legacyAttachmentUrl, setLegacyAttachmentUrl] = useState<string | null>(null);
  const [legacyAttachmentLabel, setLegacyAttachmentLabel] = useState<string | null>(null);
  const [legacyUploadingAttachment, setLegacyUploadingAttachment] = useState(false);
  const [creatingLegacyAssignment, setCreatingLegacyAssignment] = useState(false);


  // analytics
  const [period, setPeriod] = useState<Period>('month');
  const [analytics, setAnalytics] = useState<OrgAnalyticsRow[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [showCongrats, setShowCongrats] = useState(false);

  // learner progress (overall) – owner/instructor only
  const [lpRows, setLpRows] = useState<OrgLearnerProgressRow[]>([]);
  const [lpCursor, setLpCursor] = useState<string | null>(null);
  const [lpLoading, setLpLoading] = useState(false);

  // learner assignment view (legacy / file-based)
  const [learnerAssignments, setLearnerAssignments] = useState<OrgAssignmentRow[]>([]);
  const [learnerAssignmentsLoading, setLearnerAssignmentsLoading] = useState(false);

  // submit legacy assignment (learner)
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitAssignment, setSubmitAssignment] = useState<OrgAssignmentRow | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [submitFileAsset, setSubmitFileAsset] = useState<any | null>(null);
  const [submitUploading, setSubmitUploading] = useState(false);

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

  /* load org */
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

  // hydrate from route params (tab + courseId)
  useEffect(() => {
    const p = (route.params || {}) as any;
    const explicitTab = p.tab as TabKey | undefined;
    if (explicitTab) setTab(explicitTab);
    const cid = p.courseId;
    if (cid) setCourseId(cid);
  }, [route.params]);

  // force away from branding tab for roles that can't brand
  useEffect(() => {
    if (!canBrandingRole && tab === 'branding') {
      setTab('assign');
    }
  }, [canBrandingRole, tab]);

  /* usage seats – non-learner only */
  useEffect(() => {
    if (isLearnerView) return;
    (async () => {
      if (!authToken || !org?.id) return;
      try {
        const { seats_used } = await getOrgUsage(backendUrl, authToken, org.id);
        setSeatsUsed(Number(seats_used ?? 0));
      } catch {
        setSeatsUsed(Number(org?.seats_used ?? 0));
      }
    })();
  }, [org?.id, org?.seats_used, backendUrl, authToken, isLearnerView]);

  /* upload helper (logo/signature/instructor signature) */
  const handleUpload = useCallback(
    async (target: 'logo_url' | 'signature_url' | 'instructor_signature_url') => {
      if (!authToken) {
        Alert.alert('Sign in required', 'Please sign in before uploading images.');
        return;
      }

      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/*'],
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return;
        }

        const asset = result.assets[0];
        if (!asset) {
          return;
        }

        const file: any = {
          uri: asset.uri,
          name: asset.name || `brand-${target}-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        };

        const setBusy =
          target === 'logo_url'
            ? setUploadingLogo
            : target === 'signature_url'
            ? setUploadingSignature
            : setUploadingInstructorSignature;

        setBusy(true);

        const res: any = await uploadAsset(backendUrl, authToken, file, 'image');

        const url =
          typeof res === 'string'
            ? res
            : res?.url || res?.secure_url || res?.data?.url || '';

        if (!url) {
          throw new Error('Upload completed but no URL was returned by the server.');
        }

        setForm((f: any) => ({ ...f, [target]: url }));
        Alert.alert(
          'Uploaded',
          target === 'logo_url'
            ? 'Logo updated.'
            : target === 'signature_url'
            ? 'Signature updated.'
            : 'Instructor signature updated.'
        );
      } catch (e: any) {
        if (e?.message?.includes('canceled')) return;
        Alert.alert('Upload failed', e?.message || 'Please try again.');
      } finally {
        setUploadingLogo(false);
        setUploadingSignature(false);
        setUploadingInstructorSignature(false);
      }
    },
    [authToken, backendUrl]
  );

  /* save branding */
  const saveBranding = async () => {
    if (!org?.id || !authToken) {
      Alert.alert(
        'Missing organization',
        'Please create your Institution account first (For Institutions → Login/Sign up).'
      );
      return;
    }

    if (!canBrandingRole) {
      Alert.alert(
        'Not allowed',
        'Branding settings can only be changed by your institution owner or admin.'
      );
      return;
    }

    // domain validation
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

    if (form.webhook_enabled && (form.webhook_url || '').trim()) {
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

    /* instructor: pick attachment for classic assignment */
  const handlePickLegacyAttachment = useCallback(async () => {
    if (!authToken) {
      Alert.alert('Sign in required', 'Please sign in before attaching files.');
      return;
    }

    try {
      setLegacyUploadingAttachment(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'image/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setLegacyUploadingAttachment(false);
        return;
      }

      const asset = result.assets[0];
      if (!asset) {
        setLegacyUploadingAttachment(false);
        return;
      }

      const file: any = {
        uri: asset.uri,
        name: asset.name || `assignment-${Date.now()}`,
        type: asset.mimeType || 'application/octet-stream',
      };

      const res: any = await uploadAsset(backendUrl, authToken, file, 'doc');

      const url =
        typeof res === 'string'
          ? res
          : res?.url || res?.secure_url || res?.data?.url || null;

      if (!url) {
        throw new Error('Upload completed but no URL was returned.');
      }

      setLegacyAttachmentUrl(url);
      setLegacyAttachmentLabel(asset.name || asset.uri);
      Alert.alert('File attached', 'Learners will be able to download this file.');
    } catch (e: any) {
      if (e?.message?.includes('canceled')) return;
      Alert.alert('Upload failed', e?.message || 'Please try again.');
    } finally {
      setLegacyUploadingAttachment(false);
    }
  }, [authToken, backendUrl]);

  /* instructor: create classic (file-based) assignment */
  const createLegacyAssignment = useCallback(async () => {
    if (!org?.id || !authToken) {
      Alert.alert('Missing organization', 'Please sign in to your institution first.');
      return;
    }
    if (!legacyTitle.trim()) {
      Alert.alert('Title required', 'Give this assignment a title before sharing.');
      return;
    }

    try {
      setCreatingLegacyAssignment(true);

      const payload: any = {
        title: legacyTitle.trim(),
        instructions: legacyInstructions.trim() || null,
        due_at: legacyDueAt || null,
        class_label: assignClassLabel || null,
        subject_key: assignSubjectKey || null,
        attachment_url: legacyAttachmentUrl || null,
      };

      await createOrgLegacyAssignment(backendUrl, authToken, org.id, payload);

      Alert.alert(
        'Assignment shared',
        'Learners in the selected class/subject will see this assignment in their portal.'
      );

      // basic reset
      setLegacyTitle('');
      setLegacyInstructions('');
      setLegacyDueAt('');
      setLegacyAttachmentUrl(null);
      setLegacyAttachmentLabel(null);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to create assignment.';
      Alert.alert('Failed', msg);
    } finally {
      setCreatingLegacyAssignment(false);
    }
  }, [
    org?.id,
    authToken,
    backendUrl,
    legacyTitle,
    legacyInstructions,
    legacyDueAt,
    assignClassLabel,
    assignSubjectKey,
    legacyAttachmentUrl,
  ]);

  /* assignment create (AI course-based) – admin/instructor only */
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

  /* analytics – owner/instructor only */
  const loadAnalytics = useCallback(async () => {
    if (isLearnerView) return;
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
  }, [org?.id, backendUrl, authToken, period, canMultiPeriodAnalytics, isLearnerView]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  /* learner progress – owner/instructor only */
  const loadLearnerProgress = useCallback(
    async (reset: boolean) => {
      if (isLearnerView) return;
      if (!org?.id || !authToken) return;
      setLpLoading(true);
      try {
        const resp = await getOrgLearnersProgress(backendUrl, authToken, org.id, {
          limit: 25,
          cursor: reset ? undefined : lpCursor || undefined,
        });
        setLpRows((prev) => (reset ? resp.data : [...prev, ...resp.data]));
        setLpCursor(resp.next_cursor ?? null);
      } finally {
        setLpLoading(false);
      }
    },
    [backendUrl, authToken, org?.id, lpCursor, isLearnerView]
  );

  useEffect(() => {
    if (isLearnerView) return;
    if (tab === 'analytics') loadLearnerProgress(true);
  }, [tab, org?.id, authToken, isLearnerView, loadLearnerProgress]);

  /* learner: load legacy/file-based assignments visible to them */
  const loadLearnerAssignments = useCallback(async () => {
    if (!isLearnerView) return;
    if (!authToken || !org?.id) return;
    setLearnerAssignmentsLoading(true);
    try {
      const resp = await getOrgAssignmentsForLearner(backendUrl, authToken, org.id, {
        studentId: learnerStudentId || undefined,
        classLabel: learnerClassFromRoute || undefined,
        subjectKey: learnerSubjectFromRoute || undefined,
      });
      const rows = Array.isArray((resp as any)?.data) ? (resp as any).data : [];
      setLearnerAssignments(rows as OrgAssignmentRow[]);
    } catch (err) {
      console.warn('[OrgElearnPortalNative] load learner assignments failed', err);
      setLearnerAssignments([]);
    } finally {
      setLearnerAssignmentsLoading(false);
    }
  }, [
    isLearnerView,
    backendUrl,
    authToken,
    org?.id,
    learnerStudentId,
    learnerClassFromRoute,
    learnerSubjectFromRoute,
  ]);

  useEffect(() => {
    loadLearnerAssignments();
  }, [loadLearnerAssignments]);

  /* learner: pick file for submission */
  const handlePickSubmitFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      setSubmitFileAsset(result.assets[0]);
    } catch (e: any) {
      if (e?.message?.includes('canceled')) return;
      Alert.alert('File selection failed', e?.message || 'Please try again.');
    }
  }, []);

    const handleLegacyDeadlinePress = () => {
    if (!canAssignments) return;
    setLegacyDuePickerOpen(true);
  };

  const handleAiDeadlinePress = () => {
    if (!canAssignments) return;
    setAiDuePickerOpen(true);
  };

  const handleLegacyDueChange = (_event: any, selected?: Date) => {
    // Android always calls once when dismissed; iOS inline might call multiple times.
    setLegacyDuePickerOpen(false);
    if (selected) {
      setLegacyDueDate(selected);
      setLegacyDueAt(selected.toISOString());
    }
  };

  const handleAiDueChange = (_event: any, selected?: Date) => {
    setAiDuePickerOpen(false);
    if (selected) {
      setAiDueDate(selected);
      setDueAt(selected.toISOString());
    }
  };


  /* learner: submit legacy work */
  const handleSubmitLegacyWork = useCallback(async () => {
    if (!submitAssignment || !authToken || !org?.id) {
      setSubmitOpen(false);
      return;
    }

    if (!submitText.trim() && !submitFileAsset) {
      Alert.alert('Missing work', 'Type an answer or attach a file before submitting.');
      return;
    }

    setSubmitUploading(true);
    try {
      let attachmentUrl: string | null = null;

      if (submitFileAsset) {
        const file: any = {
          uri: submitFileAsset.uri,
          name: submitFileAsset.name || 'assignment-upload',
          type: submitFileAsset.mimeType || 'application/octet-stream',
        };

        const res: any = await uploadAsset(backendUrl, authToken, file, 'doc');
        attachmentUrl =
          typeof res === 'string'
            ? res
            : res?.url || res?.secure_url || res?.data?.url || null;
      }

      await submitOrgLegacyAssignment(backendUrl, authToken, org.id, submitAssignment.id, {
        answer_text: submitText.trim() || null,
        attachment_url: attachmentUrl,
      });

      Alert.alert('Submitted', 'Your work has been submitted ✅');
      setSubmitOpen(false);
      setSubmitAssignment(null);
      setSubmitText('');
      setSubmitFileAsset(null);

      await loadLearnerAssignments();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || 'Failed to submit work.';
      Alert.alert('Submit failed', msg);
    } finally {
      setSubmitUploading(false);
    }
  }, [
    submitAssignment,
    submitText,
    submitFileAsset,
    backendUrl,
    authToken,
    org?.id,
    loadLearnerAssignments,
  ]);

  /* computed */
  const seatPct = Math.min(100, Math.round(((seatsUsed || 0) / seatsMax) * 100));
  const nearLimit = seatPct >= 90;

  const copyLink = async () => {
    try {
      await Share.share({ message: inviteLink });
    } catch {}
  };

  const instructors: Array<{ user_id: number; name?: string; email?: string; role?: string }> =
    (org as any)?.instructors && Array.isArray((org as any).instructors)
      ? (org as any).instructors
      : [];

    // Instructor emails + grouping for BCC share
  const instructorEmails = useMemo(
    () =>
      instructors
        .map((u) => (u.email || '').trim())
        .filter(Boolean),
    [instructors]
  );

  const bccChunks = useMemo(() => {
    if (!inviteLink) return [] as string[][];
    if (!instructorEmails.length) return [];

    const chunks: string[][] = [];
    const mkMailto = (arr: string[]) => {
      const subject = encodeURIComponent('Course invite');
      const body = encodeURIComponent(inviteLink);
      const bcc = encodeURIComponent(arr.join(','));
      return `mailto:?subject=${subject}&bcc=${bcc}&body=${body}`;
    };

    let cur: string[] = [];
    for (const e of instructorEmails) {
      const test = mkMailto([...cur, e]);
      if (test.length > 1800 || cur.length >= 50) {
        if (cur.length) chunks.push(cur);
        cur = [e];
      } else {
        cur.push(e);
      }
    }
    if (cur.length) chunks.push(cur);
    return chunks;
  }, [instructorEmails, inviteLink]);

  const emailInstructorsGroup = async (emails: string[]) => {
    if (!inviteLink || !emails.length) return;
    const subject = encodeURIComponent('Course invite');
    const body = encodeURIComponent(inviteLink);
    const bcc = encodeURIComponent(emails.join(','));
    const url = `mailto:?subject=${subject}&bcc=${bcc}&body=${body}`;
    try {
      await Linking.openURL(url);
    } catch {
      // fallback: generic share
      await Share.share({ message: inviteLink });
    }
  };

  const shareViaWhatsApp = async () => {
    if (!inviteLink) return;
    const text = encodeURIComponent(
      `Please share this course invite with your learners:\n\n${inviteLink}`
    );
    const waUrl = `https://wa.me/?text=${text}`;
    try {
      await Linking.openURL(waUrl);
    } catch {
      await Share.share({ message: inviteLink });
    }
  };

  const visibleTabs: TabKey[] = canBrandingRole ? ['branding', 'assign', 'analytics'] : ['assign', 'analytics'];

  // learner: filter to legacy/file-based assignments only
  const legacyAssignments = useMemo(
    () =>
      learnerAssignments.filter((a: any) => {
        const kind = String(a.source_kind || '').toLowerCase();
        const isLegacyKind = kind === 'legacy';

        const attachmentUrl =
          a.attachment_url ||
          a.attachmentUrl ||
          a.download_url ||
          a.downloadUrl ||
          a.resource_url ||
          a.resourceUrl ||
          null;

        return isLegacyKind || (!!attachmentUrl && !a.course_id);
      }),
    [learnerAssignments]
  );

  const { submittedAssignments, pendingAssignments } = useMemo(() => {
    const submitted: OrgAssignmentRow[] = [];
    const pending: OrgAssignmentRow[] = [];

    legacyAssignments.forEach((a: any) => {
      const submissionCount =
        a.submission_count ?? a.submissions_count ?? a.answers_count ?? 0;
      const hasFlag = a.has_submission ?? a.hasSubmitted ?? false;
      const submissionTs =
        a.latest_submission_at ||
        a.submitted_at ||
        a.last_submitted_at ||
        a.my_submission_created_at ||
        null;

      const hasSubmitted =
        Boolean(hasFlag) ||
        Number(submissionCount) > 0 ||
        Boolean(submissionTs);

      if (hasSubmitted) submitted.push(a);
      else pending.push(a);
    });

    return { submittedAssignments: submitted, pendingAssignments: pending };
  }, [legacyAssignments]);

  const renderLearnerAssignmentRow = (a: OrgAssignmentRow, submitted: boolean) => {
    const key = String((a as any).id ?? (a as any).invite_code ?? Math.random());
    const dueLabel = (a as any).due_at
      ? new Date((a as any).due_at).toLocaleString()
      : 'No due date';
    const createdLabel = (a as any).created_at
      ? new Date((a as any).created_at).toLocaleString()
      : null;

    const attachmentUrl: string | null =
      (a as any).attachment_url ||
      (a as any).attachmentUrl ||
      (a as any).download_url ||
      (a as any).downloadUrl ||
      (a as any).resource_url ||
      (a as any).resourceUrl ||
      null;

    return (
      <View
        key={key}
        style={tw`mt-2 p-3 rounded-xl bg-[#f8fbff] dark:bg-[#111b28] border border-[#cedbe8] dark:border:white/10`}
      >
        <Text style={tw`text-[#0d141c] dark:text-white font-semibold`}>
          {a.title || 'Untitled assignment'}
        </Text>
        <Text style={tw`mt-1 text-[11px] text-[#49739c] dark:text-white/80`}>
          Due: {dueLabel}
        </Text>
        {createdLabel && (
          <Text style={tw`mt-1 text-[11px] text-[#9CA3AF] dark:text-white/60`}>
            Assigned: {createdLabel}
          </Text>
        )}

        {attachmentUrl && (
          <TouchableOpacity
            onPress={() => Linking.openURL(attachmentUrl)}
            style={tw`mt-2 px-3 py-1.5 rounded-lg bg-[#e7edf4] dark:bg:white/10 self-start`}
          >
            <Text style={tw`text-[#0d141c] dark:text-white text-xs`}>Open attachment</Text>
          </TouchableOpacity>
        )}

        <View style={tw`flex-row mt-3`}>
          <TouchableOpacity
            onPress={() => {
              setSubmitAssignment(a);
              setSubmitText('');
              setSubmitFileAsset(null);
              setSubmitOpen(true);
            }}
            style={tw`px-3 py-1.5 rounded-lg bg-indigo-600`}
          >
            <Text style={tw`text-white text-xs`}>
              {submitted ? 'Submit again' : 'Submit work'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016] px-3 pt-5 pb-8`}>
      <ScrollView contentContainerStyle={tw`pb-24`}>
        {isLearnerView ? (
          <>
            {/* LEARNER VIEW */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-[#0d141c] dark:text-white text-2xl font-bold`}>
                Assignments shared with you
              </Text>
              <Text style={tw`text-[#49739c] dark:text-white/70 text-xs mt-1`}>
                These file-based assignments were shared by your teachers. Download the attachment,
                follow the instructions, and submit your work.
              </Text>
              {!!learnerClassFromRoute && (
                <Text style={tw`text-[#49739c] dark:text-white/70 text-[11px] mt-1`}>
                  You&apos;re currently viewing work for{' '}
                  <Text style={tw`font-semibold`}>{learnerClassFromRoute}</Text>
                  {learnerSubjectFromRoute ? (
                    <>
                      {' '}
                      in <Text style={tw`font-semibold`}>{learnerSubjectFromRoute}</Text>
                    </>
                  ) : null}
                  .
                </Text>
              )}
            </View>

            <View
              style={tw`rounded-2xl border border-[#cedbe8] dark:border:white/10 bg-white dark:bg-[#0f1821] p-4`}
            >
              <View style={tw`flex-row justify-between items-center mb-2`}>
                <View style={tw`flex-1 pr-2`}>
                  <Text style={tw`text-[#0d141c] dark:text-white text-base font-semibold`}>
                    Your assignments
                  </Text>
                  <Text style={tw`text-[#6b7280] dark:text-white/70 text-[11px] mt-1`}>
                    You can only see assignments that your institution has shared with you. New work
                    appears here automatically when a teacher targets your class/subject.
                  </Text>
                </View>
                {learnerAssignmentsLoading && (
                  <Text style={tw`text-[11px] text-[#6b7280] dark:text-white/70`}>Loading…</Text>
                )}
              </View>

              {/* Submitted */}
              <View style={tw`mt-2`}>
                <Text style={tw`text-xs font-semibold text-[#0d141c] dark:text-white`}>
                  Submitted assignments
                </Text>
                {submittedAssignments.length === 0 && !learnerAssignmentsLoading ? (
                  <Text style={tw`mt-1 text-[11px] text-[#6b7280] dark:text-white/70`}>
                    You haven&apos;t submitted any legacy (file-based) assignments yet.
                  </Text>
                ) : (
                  submittedAssignments.map((a) => renderLearnerAssignmentRow(a, true))
                )}
              </View>

              {/* Pending */}
              <View style={tw`mt-4`}>
                <Text style={tw`text-xs font-semibold text-[#0d141c] dark:text-white`}>
                  Assignments to work on
                </Text>
                {pendingAssignments.length === 0 && !learnerAssignmentsLoading ? (
                  <Text style={tw`mt-1 text-[11px] text-[#6b7280] dark:text-white/70`}>
                    You don&apos;t have any pending legacy (file-based) assignments for this class or
                    subject yet.
                  </Text>
                ) : (
                  pendingAssignments.map((a) => renderLearnerAssignmentRow(a, false))
                )}
              </View>

              {!!learnerStudentId && (
                <Text style={tw`mt-4 text-[11px] text-[#6b7280] dark:text-white/70`}>
                  Learner ID in this portal:{' '}
                  <Text style={tw`font-mono`}>{learnerStudentId}</Text>. If this doesn&apos;t match
                  your login card, ask your teacher to confirm.
                </Text>
              )}
            </View>
          </>
        ) : (
          <>
            {/* OWNER / INSTRUCTOR VIEW */}
            {/* header */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-[#0d141c] dark:text-white text-2xl font-bold`}>
                Institution E-Learning
              </Text>
              <Text style={tw`text-[#49739c] dark:text-white/70 text-xs mt-1`}>
                {isInstructor ? 'Assignments • Analytics' : 'Branding • Assignments • Analytics'}
              </Text>
            </View>

            {/* tabs */}
            <View style={tw`flex-row mb-3`}>
              {visibleTabs.map((t) => {
                const active = tab === t;
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTab(t)}
                    style={tw`mr-2 px-3 py-1.5 rounded-xl ${
                      active ? 'bg-indigo-600' : 'bg-[#e7edf4] dark:bg:white/10'
                    }`}
                  >
                    <Text
                      style={tw`${active ? 'text-white' : 'text-[#0d141c] dark:text-white'} text-sm capitalize`}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* plan summary */}
            <View
              style={tw`rounded-2xl border border-[#cedbe8] dark:border:white/10 bg-white dark:bg-[#0f1821] p-3 mb-10`}
            >
              <View style={tw`flex-row flex-wrap items-center justify-between`}>
                <View style={tw`flex-row flex-wrap items-center`}>
                  <Pill>
                    Plan: <Text style={tw`font-semibold`}>{tier.toUpperCase()}</Text>
                  </Pill>
                  <View style={tw`w-2`} />
                  <Pill>
                    Seats: {seatsUsed}/{seatsMax}
                  </Pill>
                  {hasPrioritySupport && (
                    <>
                      <View style={tw`w-2`} />
                      <Pill>Priority support</Pill>
                    </>
                  )}
                  {isInstructor && (
                    <>
                      <View style={tw`w-2`} />
                      <Pill>Instructor view</Pill>
                    </>
                  )}
                </View>

                {!isInstructor && (
                  <View style={tw`flex-row items-center mt-2`}>
                    <View style={tw`w-32 h-2 rounded bg-[#e7edf4] dark:bg:white/10 overflow-hidden mr-2`}>
                      <View
                        style={[
                          tw`${nearLimit ? 'bg-red-500' : 'bg-emerald-500'}`,
                          { height: '100%', width: `${seatPct}%` },
                        ]}
                      />
                    </View>
                    {nearLimit && (
                      <Text style={tw`text-red-600 dark:text-red-300 text-xs`}>Near seat limit</Text>
                    )}
                  </View>
                )}
              </View>

              {!isInstructor && (
                <View style={tw`flex-row flex-wrap mt-2`}>
                  {(['starter', 'pro', 'enterprise'] as OrgTier[])
                    .filter((t) => t !== tier)
                    .map((next) => (
                      <TouchableOpacity
                        key={next}
                        onPress={() => {
                          if (!canUpgradePlan) return;
                          if (next === 'pro') setShowProModal(true);
                          else if (next === 'enterprise') setShowEnterpriseModal(true);
                          else if (org?.id && authToken) {
                            upgradeOrgTier(backendUrl, authToken, org.id, next)
                              .then((j) => {
                                setOrg((prev: Org | null) => ({ ...((prev ?? {}) as Org), ...j }));
                                Alert.alert('Plan updated', `Changed plan to ${next.toUpperCase()}.`);
                              })
                              .catch(() =>
                                Alert.alert('Failed', 'Plan change failed. Please try again.')
                              );
                          }
                        }}
                        style={tw`mr-2 mt-2 px-2 py-1 rounded-lg bg-indigo-600`}
                      >
                        <Text style={tw`text-white text-xs`}>Upgrade → {next.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              <View style={tw`flex-row flex-wrap mt-2`}>
                {ORG_TIERS[tier].features.map((f) => (
                  <View
                    key={f}
                    style={tw`mr-1 mt-1 px-2 py-0.5 rounded-full bg-[#e7edf4] dark:bg:white/10`}
                  >
                    <Text style={tw`text-[#0d141c] dark:text:white/90 text-[11px]`}>{f}</Text>
                  </View>
                ))}
              </View>

              {isInstructor && (
                <Text style={tw`mt-2 text-[11px] text-[#49739c] dark:text:white/70`}>
                  Your institution owner/admin manages branding and subscriptions. As an instructor you
                  can create assignments and view analytics here.
                </Text>
              )}
            </View>

            {/* BRANDING / ASSIGN tabs */}
            {(tab === 'branding' || tab === 'assign') && (
              <View>
                {/* BRANDING */}
                {tab === 'branding' && canBrandingRole && (
                  <View
                    style={tw`rounded-2xl border border-[#cedbe8] dark:border:white/10 bg-white dark:bg-[#0f1821] p-4 mb-6`}
                  >
                    <Text style={tw`text-[#0d141c] dark:text:white text-lg font-semibold mb-3`}>
                      Branding
                    </Text>

                    {/* org name */}
                    <Text style={tw`text-[#49739c] dark:text:white/80 text-xs`}>Organization name</Text>
                    <TextInput
                      value={form.name}
                      onChangeText={(v) => setForm((f: any) => ({ ...f, name: v }))}
                      placeholder="My School / Org"
                      placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white`}
                    />

                    {/* LOGO & SIGNATURE SECTION */}
                    <View
                      style={tw`mt-4 rounded-2xl border border-[#cedbe8] dark:border:white/10 bg-[#f8fbff] dark:bg:white/5`}
                    >
                      <TouchableOpacity
                        onPress={() => setShowLogoSection((v) => !v)}
                        style={tw`flex-row items-center justify-between px-3 py-2`}
                      >
                        <View>
                          <Text style={tw`text-[#0d141c] dark:text:white text-sm font-semibold`}>
                            Logo & Signatures
                          </Text>
                          <Text style={tw`text-[#49739c] dark:text:white/70 text-[11px]`}>
                            Upload logo and signatures for certificates and reports.
                          </Text>
                        </View>
                        <Text style={tw`text-[#49739c] dark:text:white/70 text-lg`}>
                          {showLogoSection ? '−' : '+'}
                        </Text>
                      </TouchableOpacity>

                      {showLogoSection && (
                        <View style={tw`px-3 pb-3`}>
                          {/* logo */}
                          <Text style={tw`mt-2 text-[#49739c] dark:text:white/80 text-xs`}>
                            Logo image
                          </Text>
                          <View style={tw`flex-row items-center mt-1`}>
                            <TouchableOpacity
                              onPress={() => handleUpload('logo_url')}
                              disabled={uploadingLogo}
                              style={tw`px-3 py-2 rounded-xl bg-indigo-600 mr-2 ${
                                uploadingLogo ? 'opacity-60' : ''
                              }`}
                            >
                              {uploadingLogo ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <Text style={tw`text-white text-xs`}>Upload logo</Text>
                              )}
                            </TouchableOpacity>
                            {form.logo_url ? (
                              <Text
                                numberOfLines={1}
                                style={tw`flex-1 text-[11px] text-[#49739c] dark:text:white/70`}
                              >
                                {form.logo_url}
                              </Text>
                            ) : (
                              <Text
                                style={tw`flex-1 text-[11px] text-[#9CA3AF] dark:text:white/50`}
                              >
                                No logo uploaded yet
                              </Text>
                            )}
                          </View>
                          <Text
                            style={tw`mt-2 text-[#49739c] dark:text:white/80 text-[11px]`}
                          >
                            Or paste logo URL
                          </Text>
                          <TextInput
                            value={form.logo_url}
                            onChangeText={(v) => setForm((f: any) => ({ ...f, logo_url: v }))}
                            placeholder="https://…/logo.png"
                            placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                            style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white text-xs`}
                          />

                          {/* principal / director signature */}
                          <View style={tw`h-3`} />
                          <Text style={tw`text-[#49739c] dark:text:white/80 text-xs`}>
                            Principal / Director signature image
                          </Text>
                          <View style={tw`flex-row items-center mt-1`}>
                            <TouchableOpacity
                              onPress={() => handleUpload('signature_url')}
                              disabled={uploadingSignature}
                              style={tw`px-3 py-2 rounded-xl bg-indigo-600 mr-2 ${
                                uploadingSignature ? 'opacity-60' : ''
                              }`}
                            >
                              {uploadingSignature ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <Text style={tw`text-white text-xs`}>Upload signature</Text>
                              )}
                            </TouchableOpacity>
                            {form.signature_url ? (
                              <Text
                                numberOfLines={1}
                                style={tw`flex-1 text-[11px] text-[#49739c] dark:text:white/70`}
                              >
                                {form.signature_url}
                              </Text>
                            ) : (
                              <Text
                                style={tw`flex-1 text-[11px] text-[#9CA3AF] dark:text:white/50`}
                              >
                                No signature uploaded yet
                              </Text>
                            )}
                          </View>
                          <Text
                            style={tw`mt-2 text-[#49739c] dark:text:white/80 text-[11px]`}
                          >
                            Or paste signature URL
                          </Text>
                          <TextInput
                            value={form.signature_url}
                            onChangeText={(v) =>
                              setForm((f: any) => ({ ...f, signature_url: v }))
                            }
                            placeholder="https://…/signature.png"
                            placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                            style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white text-xs`}
                          />

                          {/* instructor signature */}
                          <View style={tw`h-3`} />
                          <Text style={tw`text-[#49739c] dark:text:white/80 text-xs`}>
                            Instructor signature image (optional)
                          </Text>
                          <View style={tw`flex-row items-center mt-1`}>
                            <TouchableOpacity
                              onPress={() => handleUpload('instructor_signature_url')}
                              disabled={uploadingInstructorSignature}
                              style={tw`px-3 py-2 rounded-xl bg-indigo-600 mr-2 ${
                                uploadingInstructorSignature ? 'opacity-60' : ''
                              }`}
                            >
                              {uploadingInstructorSignature ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <Text style={tw`text-white text-xs`}>
                                  Upload instructor signature
                                </Text>
                              )}
                            </TouchableOpacity>
                            {form.instructor_signature_url ? (
                              <Text
                                numberOfLines={1}
                                style={tw`flex-1 text-[11px] text-[#49739c] dark:text:white/70`}
                              >
                                {form.instructor_signature_url}
                              </Text>
                            ) : (
                              <Text
                                style={tw`flex-1 text-[11px] text-[#9CA3AF] dark:text:white/50`}
                              >
                                No instructor signature uploaded yet
                              </Text>
                            )}
                          </View>
                          <Text
                            style={tw`mt-2 text-[#49739c] dark:text:white/80 text-[11px]`}
                          >
                            Or paste instructor signature URL
                          </Text>
                          <TextInput
                            value={form.instructor_signature_url}
                            onChangeText={(v) =>
                              setForm((f: any) => ({ ...f, instructor_signature_url: v }))
                            }
                            placeholder="https://…/instructor-signature.png"
                            placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                            style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white text-xs`}
                          />
                        </View>
                      )}
                    </View>

                    {/* SSO & ACCESS SECTION */}
                    <View
                      style={tw`mt-4 rounded-2xl border border-[#cedbe8] dark:border:white/10 bg-[#f8fbff] dark:bg:white/5`}
                    >
                      <TouchableOpacity
                        onPress={() => setShowSsoSection((v) => !v)}
                        style={tw`flex-row items-center justify-between px-3 py-2`}
                      >
                        <View>
                          <Text style={tw`text-[#0d141c] dark:text:white text-sm font-semibold`}>
                            SSO & Access
                          </Text>
                          <Text style={tw`text-[#49739c] dark:text:white/70 text-[11px]`}>
                            Restrict enrollments to your email domains and receive webhooks.
                          </Text>
                        </View>
                        <Text style={tw`text-[#49739c] dark:text:white/70 text-lg`}>
                          {showSsoSection ? '−' : '+'}
                        </Text>
                      </TouchableOpacity>

                      {showSsoSection && (
                        <View style={tw`px-3 pb-3`}>
                          {/* Domains */}
                          <Text style={tw`mt-2 text-[#49739c] dark:text:white/80 text-xs`}>
                            Allowed email domains (comma separated)
                          </Text>
                          <TextInput
                            editable={canSSO}
                            value={form.email_domain ?? ''}
                            onChangeText={(v) =>
                              setForm((f: any) => ({ ...f, email_domain: v }))
                            }
                            placeholder="example.edu, school.ac.ke"
                            placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                            style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white ${
                              !canSSO ? 'opacity-60' : ''
                            }`}
                          />
                          {!canSSO && (
                            <Text
                              style={tw`mt-1 text-[11px] text-[#ea580c] dark:text-amber-300/90`}
                            >
                              Domain restrict / SSO is available on PRO and ENTERPRISE plans.
                            </Text>
                          )}

                          {/* Webhook toggle + URL */}
                          <View style={tw`flex-row items-center mt-4 justify-between`}>
                            <View>
                              <Text
                                style={tw`text-[#49739c] dark:text:white/80 text-xs`}
                              >
                                Webhook for completions
                              </Text>
                              <Text
                                style={tw`text-[#6b7280] dark:text:white/60 text-[11px]`}
                              >
                                Receive events when learners complete quizzes or certificates.
                              </Text>
                            </View>
                            <Switch
                              value={!!form.webhook_enabled}
                              onValueChange={(v: boolean) => {
                                if (!canWebhooks) return;
                                setForm((f: any) => ({ ...f, webhook_enabled: v }));
                              }}
                              disabled={!canWebhooks}
                              trackColor={{
                                false: resolvedScheme === 'dark' ? '#4b5563' : '#d1d5db',
                                true: '#4ade80',
                              }}
                              thumbColor={resolvedScheme === 'dark' ? '#f9fafb' : '#111827'}
                            />
                          </View>

                          <Text
                            style={tw`mt-2 text-[#49739c] dark:text:white/80 text-xs`}
                          >
                            Webhook URL (HTTPS)
                          </Text>
                          <TextInput
                            editable={canWebhooks}
                            value={form.webhook_url ?? ''}
                            onChangeText={(v) =>
                              setForm((f: any) => ({ ...f, webhook_url: v }))
                            }
                            placeholder="https://example.com/webhooks/elearn"
                            placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                            style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white ${
                              !canWebhooks ? 'opacity-60' : ''
                            }`}
                          />
                          {!canWebhooks && (
                            <Text
                              style={tw`mt-1 text-[11px] text-[#ea580c] dark:text-amber-300/90`}
                            >
                              Webhooks are available on ENTERPRISE plans. You can still use CSV
                              export to integrate with your systems.
                            </Text>
                          )}
                        </View>
                      )}
                    </View>

                    {/* INSTRUCTORS & ADMINS SECTION */}
                    <View
                      style={tw`mt-4 rounded-2xl border border-[#cedbe8] dark:border:white/10 bg-[#f8fbff] dark:bg:white/5`}
                    >
                      <TouchableOpacity
                        onPress={() => setShowInstructorsSection((v) => !v)}
                        style={tw`flex-row items-center justify-between px-3 py-2`}
                      >
                        <View>
                          <Text style={tw`text-[#0d141c] dark:text:white text-sm font-semibold`}>
                            Instructors & admins
                          </Text>
                          <Text style={tw`text-[#49739c] dark:text:white/70 text-[11px]`}>
                            View who can assign courses and manage reports.
                          </Text>
                        </View>
                        <Text style={tw`text-[#49739c] dark:text:white/70 text-lg`}>
                          {showInstructorsSection ? '−' : '+'}
                        </Text>
                      </TouchableOpacity>

                      {showInstructorsSection && (
                        <View style={tw`px-3 pb-3`}>
                          {instructors.length === 0 ? (
                            <Text
                              style={tw`mt-2 text-[#49739c] dark:text:white/80 text-xs`}
                            >
                              No additional instructors configured yet. Use the web portal to invite
                              teachers and assign admin roles.
                            </Text>
                          ) : (
                            <>
                              {instructors.map((u) => (
                                <View
                                  key={u.user_id}
                                  style={tw`mt-2 p-2 rounded-xl bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10`}
                                >
                                  <Text
                                    style={tw`text-[#0d141c] dark:text:white text-sm font-semibold`}
                                  >
                                    {u.name || u.email || `User #${u.user_id}`}
                                  </Text>
                                  {u.email && (
                                    <Text
                                      style={tw`text-[#49739c] dark:text:white/60 text-[11px]`}
                                    >
                                      {u.email}
                                    </Text>
                                  )}
                                  <Text
                                    style={tw`mt-1 text-[#49739c] dark:text:white/80 text-xs`}
                                  >
                                    Role:{' '}
                                    {u.role ? u.role.toUpperCase() : 'INSTRUCTOR'}
                                  </Text>
                                </View>
                              ))}
                              <Text
                                style={tw`mt-3 text-[11px] text-[#6b7280] dark:text:white/60`}
                              >
                                To change roles or invite new staff, go to the web dashboard → Institution
                                → E-Learning → Staff.
                              </Text>
                            </>
                          )}
                        </View>
                      )}
                    </View>

                    {/* Certificate + quiz defaults */}
                    <View style={tw`h-3`} />
                    <Text style={tw`text-[#49739c] dark:text:white/80 text-xs`}>
                      Certificate title
                    </Text>
                    <TextInput
                      value={form.certificate_title}
                      onChangeText={(v) =>
                        setForm((f: any) => ({ ...f, certificate_title: v }))
                      }
                      placeholder="Certificate of Completion"
                      placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white`}
                    />

                    <View style={tw`h-3`} />
                    <Text style={tw`text-[#49739c] dark:text:white/80 text-xs`}>
                      Default pass mark (%)
                    </Text>
                    <TextInput
                      keyboardType="numeric"
                      value={String(form.default_pass_mark ?? '')}
                      onChangeText={(v) =>
                        setForm((f: any) => ({
                          ...f,
                          default_pass_mark: Number(v) || 0,
                        }))
                      }
                      placeholder="70"
                      placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white`}
                    />

                    <View style={tw`h-3`} />
                    <Text style={tw`text-[#49739c] dark:text:white/80 text-xs`}>
                      Quiz time limit (seconds)
                    </Text>
                    <TextInput
                      keyboardType="numeric"
                      value={String(form.quiz_time_limit_s ?? '')}
                      onChangeText={(v) =>
                        setForm((f: any) => ({
                          ...f,
                          quiz_time_limit_s: Number(v) || 0,
                        }))
                      }
                      placeholder="900"
                      placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white`}
                    />

                    {/* Contact details */}
                    <View style={tw`h-3`} />
                    <Text style={tw`text-[#49739c] dark:text:white/80 text-xs`}>
                      Address line 1
                    </Text>
                    <TextInput
                      value={form.address_line1 ?? ''}
                      onChangeText={(v) =>
                        setForm((f: any) => ({ ...f, address_line1: v }))
                      }
                      placeholder="P.O. Box 123, Town"
                      placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white`}
                    />

                    <View style={tw`h-3`} />
                    <Text style={tw`text-[#49739c] dark:text:white/80 text-xs`}>
                      Address line 2 (optional)
                    </Text>
                    <TextInput
                      value={form.address_line2 ?? ''}
                      onChangeText={(v) =>
                        setForm((f: any) => ({ ...f, address_line2: v }))
                      }
                      placeholder="Street, City"
                      placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white`}
                    />

                    <View style={tw`h-3`} />
                    <Text style={tw`text-[#49739c] dark:text:white/80 text-xs`}>
                      Phone number
                    </Text>
                    <TextInput
                      value={form.phone_number ?? ''}
                      onChangeText={(v) =>
                        setForm((f: any) => ({ ...f, phone_number: v }))
                      }
                      placeholder="+254 7xx xxx xxx"
                      placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white`}
                    />

                    <View style={tw`h-3`} />
                    <Text style={tw`text-[#49739c] dark:text:white/80 text-xs`}>
                      Contact email
                    </Text>
                    <TextInput
                      value={form.contact_email ?? ''}
                      onChangeText={(v) =>
                        setForm((f: any) => ({ ...f, contact_email: v }))
                      }
                      placeholder="info@school.ac.ke"
                      placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white`}
                    />

                    <View style={tw`h-3`} />
                    <Text style={tw`text-[#49739c] dark:text:white/80 text-xs`}>
                      Website URL
                    </Text>
                    <TextInput
                      value={form.website_url ?? ''}
                      onChangeText={(v) =>
                        setForm((f: any) => ({ ...f, website_url: v }))
                      }
                      placeholder="https://school.ac.ke"
                      placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      style={tw`mt-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded px-3 py-2 text-[#0d141c] dark:text:white`}
                    />

                    {/* actions */}
                    <View style={tw`flex-row mt-4`}>
                      <TouchableOpacity
                        onPress={saveBranding}
                        style={tw`px-4 py-2 rounded-xl bg-emerald-600`}
                      >
                        <Text style={tw`text-white font-semibold`}>Save branding</Text>
                      </TouchableOpacity>
                      {canEmailReports && (
                        <TouchableOpacity
                          onPress={async () => {
                            if (!org?.id || !authToken) return;
                            try {
                              const resp = await sendOrgReportTest(
                                backendUrl,
                                authToken,
                                org.id,
                                (org as any)?.owner_email || undefined
                              );
                              Alert.alert(
                                (resp as any)?.ok ? 'Sent' : 'Failed',
                                (resp as any)?.ok
                                  ? 'Test report sent to admin email.'
                                  : 'Failed to send report.'
                              );
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

                               {/* ASSIGN tab */}
                {tab === 'assign' && (
                  <View
                    style={tw`rounded-2xl border border-[#cedbe8] dark:border:white/10 bg-white dark:bg-[#0f1821] p-4`}
                  >
                    <Text style={tw`text-[#0d141c] dark:text:white text-lg font-semibold mb-3`}>
                      Assignments
                    </Text>

                    {!canAssignments && (
                      <Text style={tw`text-xs text-[#ea580c] dark:text-amber-300 mb-3`}>
                        Assignments are not available on your current plan. Upgrade your institution
                        plan on the web dashboard to enable this section.
                      </Text>
                    )}

                    {/* Scope hint */}
                    {(assignClassLabel || assignSubjectKey) && (
                      <View
                        style={tw`mb-3 rounded-xl bg-[#f8fbff] dark:bg:white/5 border border-[#cedbe8] dark:border:white/10 px-3 py-2`}
                      >
                        <Text style={tw`text-[11px] text-[#49739c] dark:text:white/70`}>
                          This work is scoped to{' '}
                          {assignClassLabel ? (
                            <Text style={tw`font-semibold`}>{assignClassLabel}</Text>
                          ) : null}
                          {assignClassLabel && assignSubjectKey ? ' · ' : ''}
                          {assignSubjectKey ? (
                            <Text style={tw`font-semibold`}>{assignSubjectKey}</Text>
                          ) : null}
                          . Learners in this class / subject will see it in their portal.
                        </Text>
                      </View>
                    )}

                    {/* CLASSIC ASSIGNMENT CARD */}
                    <View
                      style={tw`rounded-2xl bg-[#f8fbff] dark:bg-[#111b28] border border-[#cedbe8] dark:border:white/10 p-3 mb-4`}
                    >
                      <Text
                        style={tw`text-[11px] uppercase tracking-wide text-[#6b7280] dark:text:white/60`}
                      >
                        Classic assignment
                      </Text>
                      <Text style={tw`mt-1 text-sm font-semibold text-[#0d141c] dark:text:white`}>
                        Attach a worksheet or project brief
                      </Text>
                      <Text style={tw`mt-1 text-[11px] text-[#49739c] dark:text:white/70`}>
                        Perfect for essays, worksheets, experiments and offline tasks. Learners
                        download your file, complete the work, then submit their own file or typed
                        answer.
                      </Text>

                      {/* Class + Subject */}
                      <View style={tw`mt-3`}>
                        <Text style={tw`text-[11px] text-[#49739c] dark:text:white/70`}>
                          Class / Grade
                        </Text>
                        <TextInput
                          style={tw`mt-1 px-3 py-2 rounded bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 text-[#0d141c] dark:text:white text-xs`}
                          placeholder="e.g. Grade 7 Blue"
                          placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                          value={assignClassLabel}
                          onChangeText={setAssignClassLabel}
                          editable={canAssignments}
                        />

                        <View style={tw`h-3`} />
                        <Text style={tw`text-[11px] text-[#49739c] dark:text:white/70`}>
                          Subject
                        </Text>
                        <TextInput
                          style={tw`mt-1 px-3 py-2 rounded bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 text-[#0d141c] dark:text:white text-xs`}
                          placeholder="e.g. Mathematics, English, Physics"
                          placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                          value={assignSubjectKey}
                          onChangeText={setAssignSubjectKey}
                          editable={canAssignments}
                        />
                      </View>

                      {/* Title + deadline */}
                      <View style={tw`mt-3`}>
                        <Text style={tw`text-[11px] text-[#49739c] dark:text:white/70`}>
                          Assignment title
                        </Text>
                        <TextInput
                          style={tw`mt-1 px-3 py-2 rounded bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 text-[#0d141c] dark:text:white text-xs`}
                          placeholder="Term 2 Algebra worksheet"
                          placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                          value={legacyTitle}
                          onChangeText={setLegacyTitle}
                          editable={canAssignments}
                        />

                                                  <View style={tw`h-3`} />
                          <Text style={tw`text-[11px] text-[#49739c] dark:text-white/70`}>
                            Deadline (optional)
                          </Text>
                          <View style={tw`mt-1 flex-row items-center`}>
                            <TouchableOpacity
                              onPress={handleLegacyDeadlinePress}
                              disabled={!canAssignments}
                              style={tw`px-3 py-2 rounded bg-[#e7edf4] dark:bg-white/10 ${
                                !canAssignments ? 'opacity-60' : ''
                              }`}
                            >
                              <Text style={tw`text-xs text-[#0d141c] dark:text-white`}>
                                {legacyDueAt ? 'Change deadline' : 'Pick date & time'}
                              </Text>
                            </TouchableOpacity>

                            <Text
                              style={tw`ml-2 flex-1 text-[11px] ${
                                legacyDueAt
                                  ? 'text-[#49739c] dark:text-white/70'
                                  : 'text-[#9CA3AF] dark:text-white/50'
                              }`}
                              numberOfLines={2}
                            >
                              {legacyDueAt
                                ? `${new Date(legacyDueAt).toLocaleString()} (${legacyDueAt})`
                                : 'No deadline set'}
                            </Text>
                          </View>
                          <Text style={tw`mt-1 text-[11px] text-[#6b7280] dark:text-white/60`}>
                            Learners will still see the assignment after the deadline, but you can
                            treat late submissions differently.
                          </Text>

                      </View>

                      {/* Instructions */}
                      <View style={tw`mt-3`}>
                        <Text style={tw`text-[11px] text-[#49739c] dark:text:white/70`}>
                          Instructions
                        </Text>
                        <TextInput
                          multiline
                          textAlignVertical="top"
                          style={tw`mt-1 px-3 py-2 rounded bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 text-[#0d141c] dark:text:white text-xs h-24`}
                          placeholder="Explain what learners should do, how to name their files, and how you will grade them…"
                          placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                          value={legacyInstructions}
                          onChangeText={setLegacyInstructions}
                          editable={canAssignments}
                        />
                      </View>

                      {/* Attachment */}
                      <View style={tw`mt-3`}>
                        <Text style={tw`text-[11px] text-[#49739c] dark:text:white/70`}>
                          Attach assignment file (PDF, DOC, slides…)
                        </Text>
                        <View style={tw`mt-1 flex-row items-center`}>
                          <TouchableOpacity
                            onPress={handlePickLegacyAttachment}
                            disabled={!canAssignments || legacyUploadingAttachment}
                            style={tw`px-3 py-2 rounded bg-[#e7edf4] dark:bg:white/10`}
                          >
                            {legacyUploadingAttachment ? (
                              <ActivityIndicator
                                color={resolvedScheme === 'dark' ? '#ffffff' : '#0d141c'}
                              />
                            ) : (
                              <Text style={tw`text-xs text-[#0d141c] dark:text:white`}>
                                {legacyAttachmentLabel ? 'Change attachment' : 'Pick attachment'}
                              </Text>
                            )}
                          </TouchableOpacity>

                          <Text
                            style={tw`ml-2 flex-1 text-[11px] ${
                              legacyAttachmentLabel
                                ? 'text-[#49739c] dark:text:white/70'
                                : 'text-[#9CA3AF] dark:text-white/50'
                            }`}
                            numberOfLines={1}
                          >
                            {legacyAttachmentLabel || 'No file selected'}
                          </Text>
                        </View>
                      </View>

                      <View style={tw`mt-3 flex-row justify-end`}>
                        <TouchableOpacity
                          onPress={createLegacyAssignment}
                          disabled={!canAssignments || creatingLegacyAssignment}
                          style={tw`px-4 py-2 rounded-2xl bg-emerald-600 ${
                            !canAssignments || creatingLegacyAssignment ? 'opacity-60' : ''
                          }`}
                        >
                          {creatingLegacyAssignment ? (
                            <Text style={tw`text-white text-sm`}>Sharing…</Text>
                          ) : (
                            <Text style={tw`text-white text-sm font-semibold`}>
                              Share with class
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* AI / ROBOT TUTOR ASSIGNMENT CARD */}
                    <View
                      style={tw`rounded-2xl bg-[#f8fbff] dark:bg:white/5 border border-[#cedbe8] dark:border:white/10 p-3`}
                    >
                      <Text
                        style={tw`text-[11px] uppercase tracking-wide text-[#6b7280] dark:text:white/60`}
                      >
                        Teach with AI
                      </Text>
                      <Text style={tw`mt-1 text-sm font-semibold text-[#0d141c] dark:text:white`}>
                        Link a Robot Tutor course as an assignment
                      </Text>
                      <Text style={tw`mt-1 text-[11px] text-[#49739c] dark:text:white/70`}>
                        Choose one of your AI-generated courses, set optional pass marks and timers,
                        then share the invite link with specific groups.
                      </Text>
                      <View style={tw`mt-2 flex-row`}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('RobotTutor')} // adjust name if your route differs
                      style={tw`px-3 py-1.5 rounded-xl bg-[#e7edf4] dark:bg:white/10`}
                    >
                      <Text style={tw`text-[11px] text-[#0d141c] dark:text:white`}>
                        Open “Teach with AI”
                      </Text>
                    </TouchableOpacity>
                  </View>


                      <View style={tw`mt-3`}>
                        <Text style={tw`text-[11px] text-[#49739c] dark:text:white/70`}>
                          Course ID
                        </Text>
                        <TextInput
                          value={courseId}
                          onChangeText={setCourseId}
                          placeholder="course uuid"
                          placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                          style={tw`mt-1 px-3 py-2 rounded bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 text-[#0d141c] dark:text:white text-xs`}
                          editable={canAssignments}
                        />

                        <View style={tw`h-3`} />
                        <Text style={tw`text-[11px] text-[#49739c] dark:text:white/70`}>
                          Title override (optional)
                        </Text>
                        <TextInput
                          value={titleOverride}
                          onChangeText={setTitleOverride}
                          placeholder="Intro to Cybersecurity — Cohort A"
                          placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                          style={tw`mt-1 px-3 py-2 rounded bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 text-[#0d141c] dark:text:white text-xs`}
                          editable={canAssignments}
                        />

                        {canCustomPassTimers && (
                          <>
                            <View style={tw`h-3`} />
                            <Text style={tw`text-[11px] text-[#49739c] dark:text:white/70`}>
                              Pass mark (%)
                            </Text>
                            <TextInput
                              keyboardType="numeric"
                              value={String(passMark ?? '')}
                              onChangeText={(v) =>
                                setPassMark(v === '' ? '' : Number(v) || 0)
                              }
                              placeholder="e.g. 70"
                              placeholderTextColor={
                                resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'
                              }
                              style={tw`mt-1 px-3 py-2 rounded bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 text-[#0d141c] dark:text:white text-xs`}
                              editable={canAssignments}
                            />

                            <View style={tw`h-3`} />
                            <Text style={tw`text-[11px] text-[#49739c] dark:text:white/70`}>
                              Timer (seconds)
                            </Text>
                            <TextInput
                              keyboardType="numeric"
                              value={String(timer ?? '')}
                              onChangeText={(v) =>
                                setTimer(v === '' ? '' : Number(v) || 0)
                              }
                              placeholder="e.g. 1800"
                              placeholderTextColor={
                                resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'
                              }
                              style={tw`mt-1 px-3 py-2 rounded bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 text-[#0d141c] dark:text:white text-xs`}
                              editable={canAssignments}
                            />
                          </>
                        )}

                        <View style={tw`h-3`} />
                        <Text style={tw`text-[11px] text-[#49739c] dark:text-white/70`}>
                          Due at (optional)
                        </Text>
                        <View style={tw`mt-1 flex-row items-center`}>
                          <TouchableOpacity
                            onPress={handleAiDeadlinePress}
                            disabled={!canAssignments}
                            style={tw`px-3 py-2 rounded bg-[#e7edf4] dark:bg:white/10 ${
                              !canAssignments ? 'opacity-60' : ''
                            }`}
                          >
                            <Text style={tw`text-xs text-[#0d141c] dark:text:white`}>
                              {dueAt ? 'Change deadline' : 'Pick date & time'}
                            </Text>
                          </TouchableOpacity>

                          <Text
                            style={tw`ml-2 flex-1 text-[11px] ${
                              dueAt ? 'text-[#49739c] dark:text:white/70' : 'text-[#9CA3AF] dark:text:white/50'
                            }`}
                            numberOfLines={2}
                          >
                            {dueAt
                              ? `${new Date(dueAt).toLocaleString()} (${dueAt})`
                              : 'No deadline set'}
                          </Text>
                        </View>

                      </View>

                      <View style={tw`flex-row mt-4`}>
                        <TouchableOpacity
                          onPress={createAssignment}
                          disabled={!canAssignments}
                          style={tw`px-4 py-2 rounded-xl bg-emerald-600 ${
                            !canAssignments ? 'opacity-60' : ''
                          }`}
                        >
                          <Text style={tw`text-white font-semibold text-sm`}>
                            Create AI assignment
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {!!inviteLink && (
                        <View style={tw`mt-4`}>
                          <Text
                            style={tw`text-[11px] text-[#49739c] dark:text:white/80 mb-1`}
                          >
                            Invite link
                          </Text>
                          <Text
                            selectable
                            style={tw`text-xs text-[#0d141c] dark:text:white`}
                          >
                            {inviteLink}
                          </Text>

                          {/* Share to instructors (email / WhatsApp) */}
                          {instructorEmails.length > 0 && (
                            <View style={tw`mt-2 flex-row flex-wrap`}>
                              {bccChunks.map((grp, idx) => (
                                <TouchableOpacity
                                  key={`${idx}`}
                                  onPress={() => emailInstructorsGroup(grp)}
                                  style={tw`mr-2 mb-2 px-3 py-2 rounded bg-[#e7edf4] dark:bg:white/10`}
                                >
                                  <Text style={tw`text-xs text-[#0d141c] dark:text:white`}>
                                    {bccChunks.length === 1
                                      ? 'Email instructors'
                                      : `Email instructors (grp ${idx + 1})`}
                                  </Text>
                                </TouchableOpacity>
                              ))}

                              <TouchableOpacity
                                onPress={shareViaWhatsApp}
                                style={tw`mr-2 mb-2 px-3 py-2 rounded bg-[#e7edf4] dark:bg:white/10`}
                              >
                                <Text style={tw`text-xs text-[#0d141c] dark:text:white`}>
                                  WhatsApp instructors
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          <TouchableOpacity
                            onPress={copyLink}
                            style={tw`mt-2 px-3 py-2 rounded bg-indigo-600 self-start`}
                          >
                            <Text style={tw`text-white text-xs`}>Copy invite link</Text>
                          </TouchableOpacity>

                          {!!(form.email_domain || org?.email_domain) && (
                            <Text style={tw`mt-2 text-[11px] text-[#ea580c] dark:text-amber-300`}>
                              This invite is restricted to{' '}
                              <Text style={tw`font-semibold`}>
                                {(form.email_domain || org?.email_domain || '').trim()}
                              </Text>
                              .
                            </Text>
                          )}
                        </View>
                      )}

                      <Text style={tw`mt-2 text-[11px] text-[#49739c] dark:text:white/70`}>
                        Use the AI invite link for timed quizzes and auto-marking. For open-ended
                        projects or long-form work, use the classic assignment card above so learners
                        can upload their files directly.
                      </Text>
                    </View>
                  </View>
                )}

              </View>
            )}

            {/* ANALYTICS – owner/instructor only */}
            {tab === 'analytics' && (
              <View
                style={tw`rounded-2xl border border-[#cedbe8] dark:border:white/10 bg-white dark:bg-[#0f1821] p-4`}
              >
                <View style={tw`flex-row justify-between items-center mb-3`}>
                  <Text style={tw`text-[#0d141c] dark:text:white text-lg font-semibold`}>
                    Analytics
                  </Text>
                  <View style={tw`flex-row`}>
                    <TouchableOpacity
                      onPress={() => setPeriod('month')}
                      style={tw`px-3 py-1.5 rounded-lg mr-2 ${
                        period === 'month'
                          ? 'bg-indigo-600'
                          : 'bg-[#e7edf4] dark:bg:white/10'
                      }`}
                    >
                      <Text
                        style={tw`${
                          period === 'month'
                            ? 'text-white'
                            : 'text-[#0d141c] dark:text:white'
                        } text-xs`}
                      >
                        Monthly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={!canMultiPeriodAnalytics}
                      onPress={() => setPeriod('term')}
                      style={tw`px-3 py-1.5 rounded-lg mr-2 ${
                        period === 'term'
                          ? 'bg-indigo-600'
                          : 'bg-[#e7edf4] dark:bg:white/10'
                      } ${!canMultiPeriodAnalytics ? 'opacity-50' : ''}`}
                    >
                      <Text
                        style={tw`${
                          period === 'term'
                            ? 'text-white'
                            : 'text-[#0d141c] dark:text:white'
                        } text-xs`}
                      >
                        Termly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={!canMultiPeriodAnalytics}
                      onPress={() => setPeriod('year')}
                      style={tw`px-3 py-1.5 rounded-lg ${
                        period === 'year'
                          ? 'bg-indigo-600'
                          : 'bg-[#e7edf4] dark:bg:white/10'
                      } ${!canMultiPeriodAnalytics ? 'opacity-50' : ''}`}
                    >
                      <Text
                        style={tw`${
                          period === 'year'
                            ? 'text-white'
                            : 'text-[#0d141c] dark:text:white'
                        } text-xs`}
                      >
                        Yearly
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={tw`flex-row mb-3`}>
                  <TouchableOpacity
                    onPress={loadAnalytics}
                    style={tw`px-3 py-2 rounded-lg bg-indigo-600 mr-2`}
                  >
                    <Text style={tw`text-white text-xs`}>Refresh</Text>
                  </TouchableOpacity>
                  {canCSV && (
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const rows: (string | number)[][] = [
                            ['Bucket', 'Attempts', 'Passes', 'Avg Score'],
                          ];
                          analytics.forEach((r) => {
                            const bucketISO = new Date(r.bucket).toISOString();
                            const attempts = Number(r.attempts ?? 0);
                            const passes = Number(r.passes ?? 0);
                            const avg = `${Math.round(r.avg_score ?? 0)}%`;
                            rows.push([bucketISO, attempts, passes, avg]);
                          });
                          const csv = rows
                            .map((r) =>
                              r
                                .map((v) =>
                                  `"${String(v).replace(/"/g, '""')}"`
                                )
                                .join(',')
                            )
                            .join('\n');
                          await Share.share({ message: csv });
                        } catch {
                          Alert.alert('Export failed', 'Could not export CSV.');
                        }
                      }}
                      style={tw`px-3 py-2 rounded-lg bg-[#e7edf4] dark:bg:white/10`}
                    >
                      <Text style={tw`text-[#0d141c] dark:text:white text-xs`}>
                        Export CSV
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {loadingAnalytics ? (
                  <View style={tw`py-6 items-center`}>
                    <ActivityIndicator
                      color={resolvedScheme === 'dark' ? '#ffffff' : '#0d141c'}
                    />
                  </View>
                ) : analytics.length === 0 ? (
                  <Text style={tw`text-[#49739c] dark:text:white/80 text-sm`}>
                    No analytics yet.
                  </Text>
                ) : (
                  <View>
                    {analytics.map((row, idx) => (
                      <View
                        key={`${row.bucket}-${idx}`}
                        style={tw`mb-2 p-3 rounded-lg bg-[#f8fbff] dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10`}
                      >
                        <Text
                          style={tw`text-[#0d141c] dark:text:white font-semibold`}
                        >
                          {new Date(row.bucket).toLocaleString()}
                        </Text>
                        <Text
                          style={tw`text-[#49739c] dark:text:white/80 text-xs mt-1`}
                        >
                          Attempts: {row.attempts} • Passes: {row.passes} • Avg:{' '}
                          {Math.round(row.avg_score ?? 0)}%
                        </Text>

                        {canEmailReports && (
                          <TouchableOpacity
                            onPress={() =>
                              sendOrgReportRow(
                                backendUrl,
                                authToken!,
                                org!.id,
                                new Date(row.bucket).toISOString(),
                                period
                              )
                                .then((ok) => {
                                  if ((ok as any)?.ok)
                                    Alert.alert('Queued', 'Report queued.');
                                  else
                                    Alert.alert(
                                      'Failed',
                                      'Failed to queue report.'
                                    );
                                })
                                .catch(() =>
                                  Alert.alert(
                                    'Failed',
                                    'Failed to queue report.'
                                  )
                                )
                            }
                            style={tw`mt-2 px-3 py-1.5 rounded bg-[#e7edf4] dark:bg:white/10 self-start`}
                          >
                            <Text style={tw`text-[#0d141c] dark:text:white text-xs`}>
                              Send report for this period
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* learner progress */}
                <View style={tw`mt-4`}>
                  <View style={tw`flex-row items-center justify-between mb-2`}>
                    <Text
                      style={tw`text-[#0d141c] dark:text:white text-base font-semibold`}
                    >
                      Learner Progress (overall)
                    </Text>
                    <View style={tw`flex-row items-center`}>
                      {lpLoading && (
                        <Text
                          style={tw`text-[#49739c] dark:text:white/70 text-xs mr-2`}
                        >
                          Loading…
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={() => loadLearnerProgress(true)}
                        style={tw`px-3 py-1.5 rounded bg-[#e7edf4] dark:bg:white/10`}
                      >
                        <Text
                          style={tw`text-[#0d141c] dark:text:white text-xs`}
                        >
                          Refresh
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {!lpRows.length && !lpLoading ? (
                    <Text
                      style={tw`text-[#49739c] dark:text:white/70 text-sm`}
                    >
                      No learner data yet.
                    </Text>
                  ) : (
                    <View>
                      {lpRows.map((r) => (
                        <View
                          key={String(r.user_id)}
                          style={tw`mb-2 p-3 rounded-lg bg-[#f8fbff] dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10`}
                        >
                          <Text
                            style={tw`text-[#0d141c] dark:text:white font-semibold`}
                          >
                            {r.name || r.email || `User #${r.user_id}`}
                          </Text>
                          {r.email && (
                            <Text
                              style={tw`text-[#49739c] dark:text:white/60 text-[11px]`}
                            >
                              {r.email}
                            </Text>
                          )}
                          <Text
                            style={tw`text-[#49739c] dark:text:white/80 text-xs mt-1`}
                          >
                            Attempts: {r.attempts} • Passes: {r.passes} • Avg:{' '}
                            {r.avg_score != null ? Math.round(r.avg_score) : 0}%
                          </Text>
                          <Text
                            style={tw`text-[#49739c] dark:text:white/80 text-xs mt-1`}
                          >
                            Completed: {r.completed_assignments} • Progress:{' '}
                            {r.progress_pct}%
                          </Text>
                          <Text
                            style={tw`text-[#49739c] dark:text:white/60 text-[11px] mt-1`}
                          >
                            Last Submit:{' '}
                            {r.last_submit_at
                              ? new Date(r.last_submit_at).toLocaleString()
                              : '—'}
                          </Text>
                        </View>
                      ))}
                      {lpCursor && (
                        <TouchableOpacity
                          onPress={() => loadLearnerProgress(false)}
                          disabled={lpLoading}
                          style={tw`mt-1 px-3 py-1.5 rounded bg-indigo-600 self-start ${
                            lpLoading ? 'opacity-60' : ''
                          }`}
                        >
                          <Text style={tw`text-white text-xs`}>Load more</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* learner submit modal */}
      <Modal
        visible={submitOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSubmitOpen(false)}
      >
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
          <View
            style={tw`w-full max-w-md rounded-2xl bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 p-4`}
          >
            <Text style={tw`text-[#0d141c] dark:text:white text-lg font-semibold`}>
              Submit assignment
            </Text>
            <Text style={tw`text-[#49739c] dark:text:white/80 text-xs mt-1`}>
              {submitAssignment?.title || 'Untitled assignment'}
            </Text>

            <Text style={tw`mt-3 text-[#49739c] dark:text:white/80 text-xs`}>
              Your answer (optional)
            </Text>
            <TextInput
              multiline
              textAlignVertical="top"
              value={submitText}
              onChangeText={setSubmitText}
              placeholder="Type your working or short answers here…"
              placeholderTextColor={resolvedScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
              style={tw`mt-1 h-28 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 rounded-xl px-3 py-2 text-[#0d141c] dark:text:white text-sm`}
            />

            <Text style={tw`mt-3 text-[#49739c] dark:text:white/80 text-xs`}>
              Attach file (optional)
            </Text>
            <TouchableOpacity
              onPress={handlePickSubmitFile}
              style={tw`mt-1 px-3 py-2 rounded-xl bg-[#e7edf4] dark:bg:white/10`}
              disabled={submitUploading}
            >
              <Text style={tw`text-[#0d141c] dark:text:white text-xs`}>
                {submitFileAsset ? 'Change attachment' : 'Choose file'}
              </Text>
            </TouchableOpacity>
            {submitFileAsset && (
              <Text style={tw`mt-1 text-[11px] text-[#6b7280] dark:text:white/70`}>
                Selected: {submitFileAsset.name || submitFileAsset.uri}
              </Text>
            )}

            <View style={tw`flex-row justify-end mt-4`}>
              <TouchableOpacity
                onPress={() => setSubmitOpen(false)}
                disabled={submitUploading}
                style={tw`px-4 py-2 rounded-xl bg-[#e7edf4] dark:bg:white/10 mr-2`}
              >
                <Text style={tw`text-[#0d141c] dark:text:white text-sm`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitLegacyWork}
                disabled={submitUploading}
                style={tw`px-4 py-2 rounded-xl bg-emerald-600 ${
                  submitUploading ? 'opacity-60' : ''
                }`}
              >
                <Text style={tw`text-white text-sm`}>
                  {submitUploading ? 'Submitting…' : 'Submit work'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* congrats modal */}
      <Modal
        visible={showCongrats}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCongrats(false)}
      >
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
          <View
            style={tw`w-full max-w-md rounded-2xl bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border:white/10 p-5`}
          >
            <View style={tw`flex-row items-start`}>
              <View
                style={tw`h-10 w-10 rounded-full bg-emerald-500/15 items-center justify-center mr-3`}
              >
                <Text style={tw`text-xl`}>🎉</Text>
              </View>
              <View style={tw`flex-1`}>
                <Text
                  style={tw`text-[#0d141c] dark:text:white text-lg font-semibold`}
                >
                  Brand saved!
                </Text>
                <Text
                  style={tw`text-[#49739c] dark:text:white/80 text-sm mt-1`}
                >
                  Your institution profile is ready. Want to set up an assignment now?
                </Text>
              </View>
            </View>

            <View style={tw`mt-4 flex-row flex-wrap`}>
              <TouchableOpacity
                onPress={() => {
                  setShowCongrats(false);
                  setTab('assign');
                }}
                style={tw`mr-2 mb-2 px-4 py-2 rounded-xl bg-emerald-600`}
              >
                <Text style={tw`text-white font-semibold`}>Go to Assignments</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowCongrats(false)}
                style={tw`mb-2 px-4 py-2 rounded-xl bg-[#e7edf4] dark:bg:white/10`}
              >
                <Text style={tw`text-[#0d141c] dark:text:white`}>Not now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* plan modals */}
      {authToken && org?.id && (
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
      )}
            {/* native date/time pickers */}
      {legacyDuePickerOpen && (
        <DateTimePicker
          value={legacyDueDate ?? new Date()}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleLegacyDueChange}
        />
      )}
      {aiDuePickerOpen && (
        <DateTimePicker
          value={aiDueDate ?? new Date()}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleAiDueChange}
        />
      )}

    </View>
  );
};

export default OrgElearnPortalNative;
