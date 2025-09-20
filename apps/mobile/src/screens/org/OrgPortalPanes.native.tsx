/* apps/mobile/src/screens/org/OrgPortalPanes.native.tsx */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  FlatList,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import tw from '../../../tailwind';
import type { OrgResp as Org, OrgAnalyticsRow } from '@mytutorapp/shared/api/orgApi';

type TabKey = 'branding' | 'assign' | 'analytics';
type Period = 'month' | 'term' | 'year';

const Label = ({ children }: { children: React.ReactNode }) => (
  <Text style={tw`text-xs text-gray-300`}>{children}</Text>
);
const Pill = ({ children }: { children: React.ReactNode }) => (
  <View style={tw`px-2 py-0.5 rounded-full bg-white/10`}>
    <Text style={tw`text-[11px] text-white`}>{children}</Text>
  </View>
);

/* ─────────────────────────────────────────────────────────
 * BRANDING + ASSIGN pane (Native)
 * ───────────────────────────────────────────────────────── */

type BrandingAssignProps = {
  tab: TabKey;
  setTab: (t: TabKey) => void;

  // capabilities
  canBranding: boolean;
  canAssignments: boolean;
  canCustomPassTimers: boolean;
  canSSO: boolean;
  canWebhooks: boolean;
  canEmailReports: boolean;

  // org/session
  org: Org | null;
  token?: string | null;
  backendUrl: string;

  // branding
  form: any;
  setForm: (f: any) => void;

  uploadingLogo: boolean;
  uploadingSignature: boolean;

  /** In native, the pane asks the parent to pick & upload. */
  onPickImage: (target: 'logo_url' | 'signature_url') => Promise<void>;
  onSaveBranding: () => void;
  onSendTestReport: () => Promise<void>;

  // assignment
  courseId: string;
  setCourseId: (v: string) => void;
  titleOverride: string;
  setTitleOverride: (v: string) => void;
  passMark: number | '';
  setPassMark: (v: number | '') => void;
  timer: number | '';
  setTimer: (v: number | '') => void;
  dueAt: string;
  setDueAt: (v: string) => void;
  onCreateAssignment: () => void;
  inviteLink: string;
  copyLink: () => Promise<void> | void;
};

export function BrandingAssignPane({
  tab, setTab,
  canBranding, canAssignments, canCustomPassTimers, canSSO, canWebhooks, canEmailReports,
  org, token, backendUrl,
  form, setForm,
  uploadingLogo, uploadingSignature,
  onPickImage,
  onSaveBranding,
  onSendTestReport,
  courseId, setCourseId, titleOverride, setTitleOverride,
  passMark, setPassMark, timer, setTimer, dueAt, setDueAt,
  onCreateAssignment, inviteLink, copyLink,
}: BrandingAssignProps) {

  // Webhook test enablement logic (same rules, RN UI)
  const rawUrl = String(form.webhook_url ?? '').trim();
  const urlOk  = /^https:\/\/.+/i.test(rawUrl);
  const canSendTest = Boolean(org?.id && token && form.webhook_enabled && urlOk);
  const [isSending, setIsSending] = useState(false);

  const logoPreview = form.logo_url || '';
  const sigPreview  = form.signature_url || '';

  return (
    <View style={tw`rounded-2xl border border-white/10 bg-white/5 p-3`}>
      {/* Tabs header */}
      <View style={tw`mb-3 flex-row`}>
        <TouchableOpacity
          onPress={() => setTab('branding')}
          style={tw.style(
            'px-3 py-1.5 rounded-xl mr-2',
            tab === 'branding' ? 'bg-white/10' : 'bg-white/5'
          )}
        >
          <Text style={tw`text-sm text-white`}>Branding</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('assign')}
          style={tw.style(
            'px-3 py-1.5 rounded-xl',
            tab === 'assign' ? 'bg-white/10' : 'bg-white/5'
          )}
        >
          <Text style={tw`text-sm text-white`}>Assign</Text>
        </TouchableOpacity>
      </View>

      {tab === 'branding' && (
        <View style={tw`gap-3`}>
          {!canBranding && (
            <Text style={tw`text-sm text-amber-300`}>
              Branding is not included on your plan. Upgrade to enable.
            </Text>
          )}

          {/* Institution Name */}
          <View>
            <Label>Institution Name</Label>
            <TextInput
              style={tw`mt-1 w-full px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
              placeholder="Acme College"
              placeholderTextColor="#9CA3AF"
              value={form.name || ''}
              onChangeText={(t) => setForm({ ...form, name: t })}
              editable={canBranding}
            />
          </View>

          {/* Certificate Title */}
          <View>
            <Label>Certificate Title (optional)</Label>
            <TextInput
              style={tw`mt-1 w-full px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
              placeholder="Certificate of Completion"
              placeholderTextColor="#9CA3AF"
              value={form.certificate_title || ''}
              onChangeText={(t) => setForm({ ...form, certificate_title: t })}
              editable={canBranding}
            />
          </View>

          {/* Logo */}
          <View>
            <Label>Logo</Label>
            <View style={tw`flex-row items-center mt-2`}>
              <View style={tw`w-16 h-16 rounded bg-white/10 border border-white/10 items-center justify-center overflow-hidden`}>
                {logoPreview ? (
                  <Image source={{ uri: logoPreview }} style={tw`w-16 h-16`} resizeMode="contain" />
                ) : (
                  <Text style={tw`text-[10px] text-white/60 px-1 text-center`}>No logo</Text>
                )}
              </View>
              <View style={tw`ml-3 flex-1`}>
                <TextInput
                  style={tw`mb-2 px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
                  placeholder="https://..."
                  placeholderTextColor="#9CA3AF"
                  value={form.logo_url || ''}
                  onChangeText={(t) => setForm({ ...form, logo_url: t })}
                  editable={canBranding}
                />
                <TouchableOpacity
                  onPress={() => onPickImage('logo_url')}
                  disabled={!canBranding || uploadingLogo || !token}
                  style={tw.style(
                    'px-3 py-2 rounded',
                    (!canBranding || uploadingLogo || !token) ? 'bg-white/10' : 'bg-emerald-600'
                  )}
                >
                  {uploadingLogo ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={tw`text-white text-sm font-semibold`}>Upload Logo</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Signature */}
          <View>
            <Label>Registrar Signature</Label>
            <View style={tw`flex-row items-center mt-2`}>
              <View style={tw`w-16 h-16 rounded bg-white/10 border border-white/10 items-center justify-center overflow-hidden`}>
                {sigPreview ? (
                  <Image source={{ uri: sigPreview }} style={tw`w-16 h-16`} resizeMode="contain" />
                ) : (
                  <Text style={tw`text-[10px] text-white/60 px-1 text-center`}>No signature</Text>
                )}
              </View>
              <View style={tw`ml-3 flex-1`}>
                <TextInput
                  style={tw`mb-2 px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
                  placeholder="https://..."
                  placeholderTextColor="#9CA3AF"
                  value={form.signature_url || ''}
                  onChangeText={(t) => setForm({ ...form, signature_url: t })}
                  editable={canBranding}
                />
                <TouchableOpacity
                  onPress={() => onPickImage('signature_url')}
                  disabled={!canBranding || uploadingSignature || !token}
                  style={tw.style(
                    'px-3 py-2 rounded',
                    (!canBranding || uploadingSignature || !token) ? 'bg-white/10' : 'bg-emerald-600'
                  )}
                >
                  {uploadingSignature ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={tw`text-white text-sm font-semibold`}>Upload Signature</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Default Pass Mark */}
          <View>
            <View style={tw`flex-row items-center gap-2`}>
              <Label>Default Pass Mark</Label>
              {!canCustomPassTimers && <Pill>Pro+</Pill>}
            </View>
            <TextInput
              style={tw`mt-1 w-full px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
              keyboardType="numeric"
              value={String(form.default_pass_mark ?? 70)}
              onChangeText={(t) => setForm({ ...form, default_pass_mark: Number(t) || 70 })}
              editable={canCustomPassTimers}
            />
          </View>

          {/* Quiz Time Limit */}
          <View>
            <View style={tw`flex-row items-center gap-2`}>
              <Label>Quiz Time Limit (seconds)</Label>
              {!canCustomPassTimers && <Pill>Pro+</Pill>}
            </View>
            <TextInput
              style={tw`mt-1 w-full px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
              keyboardType="numeric"
              value={String(form.quiz_time_limit_s ?? 900)}
              onChangeText={(t) => setForm({ ...form, quiz_time_limit_s: Number(t) || 900 })}
              editable={canCustomPassTimers}
            />
          </View>

          {/* Allow retry */}
          <View style={tw`flex-row items-center`}>
            <Switch
              value={!!form.allow_retry}
              onValueChange={(v) => setForm({ ...form, allow_retry: v })}
              disabled={!canCustomPassTimers}
            />
            <Text style={tw`ml-2 text-sm text-white`}>
              Allow retry? <Text style={tw`text-white/50`}>(default off)</Text>
            </Text>
            {!canCustomPassTimers && <View style={tw`ml-2`}><Pill>Pro+</Pill></View>}
          </View>

          {/* Email Domain Restrict */}
          <View>
            <View style={tw`flex-row items-center gap-2`}>
              <Label>Restrict invites by email domain</Label>
              {!canSSO && <Pill>Enterprise</Pill>}
            </View>
            <TextInput
              style={tw`mt-1 w-full px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
              placeholder="example.edu, *.example.edu"
              placeholderTextColor="#9CA3AF"
              value={form.email_domain || ''}
              onChangeText={(t) => setForm({ ...form, email_domain: t })}
              editable={canSSO}
            />
            <Text style={tw`mt-1 text-[11px] text-white/60`}>
              Comma-separated. Supports wildcards like *.example.edu
            </Text>
          </View>

          {/* Webhooks */}
          <View>
            <View style={tw`flex-row items-center gap-2`}>
              <Label>Webhook (on submit / pass)</Label>
              {!canWebhooks && <Pill>Enterprise</Pill>}
            </View>

            <View style={tw`flex-row items-center mt-1`}>
              <Switch
                value={!!form.webhook_enabled}
                onValueChange={(v) => setForm({ ...form, webhook_enabled: v })}
                disabled={!canWebhooks}
              />
              <Text style={tw`ml-2 text-sm text-white`}>Enable webhooks</Text>
            </View>

            <TextInput
              style={tw`mt-1 w-full px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
              placeholder="https://your.system/hooks/elearn"
              placeholderTextColor="#9CA3AF"
              value={form.webhook_url || ''}
              onChangeText={(t) => setForm({ ...form, webhook_url: t })}
              editable={canWebhooks}
            />

            {/* Webhook controls */}
            <View style={tw`mt-2 flex-row flex-wrap`}>
              <TouchableOpacity
                onPress={async () => {
                  if (!org?.id || !token) return;
                  try {
                    const r = await fetch(`${backendUrl}/api/orgs/${org.id}/webhooks/secret`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const j = await r.json();
                    if (!j.ok && j.message) return Alert.alert('Webhook', j.message);
                    Alert.alert(
                      'Webhook secret',
                      j.present
                        ? `Secret exists (last4: ${j.last4 || '—'}). Rotated: ${j.rotatedAt || '—'}`
                        : 'No secret yet. Generate one.'
                    );
                  } catch (e: any) {
                    Alert.alert('Webhook', e?.message || 'Failed to fetch status.');
                  }
                }}
                disabled={!org?.id || !token}
                style={tw.style(
                  'px-3 py-2 rounded mr-2 mb-2',
                  !org?.id || !token ? 'bg-white/10' : 'bg-white/10'
                )}
              >
                <Text style={tw`text-white text-xs`}>View secret status</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  if (!org?.id || !token) return;
                  Alert.alert(
                    'Rotate secret',
                    'Generate/rotate the secret now? This invalidates the previous one.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Rotate',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const r = await fetch(`${backendUrl}/api/orgs/${org.id}/webhooks/secret`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            const j = await r.json();
                            if (!j.ok) return Alert.alert('Error', j.message || 'Failed to generate secret.');
                            Alert.alert('Copy secret', j.secret);
                          } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Failed to generate.');
                          }
                        },
                      },
                    ]
                  );
                }}
                disabled={!org?.id || !token}
                style={tw.style(
                  'px-3 py-2 rounded mr-2 mb-2',
                  !org?.id || !token ? 'bg-white/10' : 'bg-white/10'
                )}
              >
                <Text style={tw`text-white text-xs`}>Generate / Rotate secret</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  if (!canWebhooks || !canSendTest || isSending || !org?.id || !token) return;
                  setIsSending(true);
                  try {
                    const r = await fetch(`${backendUrl}/api/orgs/${org.id}/webhooks/test`, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        overrideUrl: String(form.webhook_url || '').trim(),
                      }),
                    });
                    let j: any = null;
                    if (r.status !== 204) { try { j = await r.json(); } catch {} }
                    if (!r.ok || j?.ok === false) {
                      Alert.alert('Webhook', j?.message || `Failed (HTTP ${r.status})`);
                      return;
                    }
                    Alert.alert(
                      'Webhook',
                      `Test webhook queued${j?.status ? ` and fired (HTTP ${j.status})` : ''}. Delivery id: ${j?.id || 'n/a'}`
                    );
                  } catch (e: any) {
                    Alert.alert('Network', e?.message || 'Failed to queue.');
                  } finally {
                    setIsSending(false);
                  }
                }}
                disabled={!canWebhooks || !canSendTest || isSending}
                style={tw.style(
                  'px-3 py-2 rounded mb-2',
                  (!canWebhooks || !canSendTest || isSending) ? 'bg-white/10' : 'bg-pink-600'
                )}
              >
                <Text style={tw`text-white text-xs`}>{isSending ? 'Sending…' : 'Send test webhook'}</Text>
              </TouchableOpacity>
            </View>

            {canEmailReports && (
              <View style={tw`mt-3 rounded-xl bg-white/5 border border-white/10 p-3`}>
                <View style={tw`flex-row items-center justify-between`}>
                  <View>
                    <Text style={tw`text-white font-medium`}>Email reports</Text>
                    <Text style={tw`text-[11px] text-white/70`}>Send periodic analytics to admins</Text>
                  </View>
                  <TouchableOpacity
                    onPress={onSendTestReport}
                    style={tw`px-3 py-2 rounded bg-indigo-600`}
                  >
                    <Text style={tw`text-white text-sm`}>Send test report</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Save */}
          <View style={tw`mt-2`}>
            <TouchableOpacity
              onPress={onSaveBranding}
              disabled={!org?.id || !token}
              style={tw.style(
                'px-3 py-2 rounded items-center',
                !org?.id || !token ? 'bg-white/10' : 'bg-indigo-600'
              )}
            >
              <Text style={tw`text-white font-semibold`}>Save Branding</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {tab === 'assign' && (
        <View style={tw`gap-3`}>
          {!canAssignments && (
            <Text style={tw`text-sm text-amber-300`}>
              Assignments are not available on your plan. Upgrade to enable.
            </Text>
          )}

          <View style={tw`gap-3`}>
            <View>
              <Label>Course ID</Label>
              <TextInput
                style={tw`mt-1 w-full px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
                placeholder="course uuid"
                placeholderTextColor="#9CA3AF"
                value={courseId}
                onChangeText={setCourseId}
                editable={canAssignments}
              />
            </View>

            <View>
              <Label>Title Override (optional)</Label>
              <TextInput
                style={tw`mt-1 w-full px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
                placeholder="Intro to Cybersecurity — Cohort A"
                placeholderTextColor="#9CA3AF"
                value={titleOverride}
                onChangeText={setTitleOverride}
                editable={canAssignments}
              />
            </View>

            <View>
              <View style={tw`flex-row items-center`}>
                <Label>Pass Mark (optional)</Label>
                {!canCustomPassTimers && <View style={tw`ml-2`}><Pill>Pro+</Pill></View>}
              </View>
              <TextInput
                style={tw`mt-1 w-full px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
                keyboardType="numeric"
                value={passMark === '' ? '' : String(passMark)}
                onChangeText={(t) => setPassMark(t ? Number(t) : '')}
                editable={canAssignments && canCustomPassTimers}
              />
            </View>

            <View>
              <View style={tw`flex-row items-center`}>
                <Label>Timer seconds (optional)</Label>
                {!canCustomPassTimers && <View style={tw`ml-2`}><Pill>Pro+</Pill></View>}
              </View>
              <TextInput
                style={tw`mt-1 w-full px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
                keyboardType="numeric"
                value={timer === '' ? '' : String(timer)}
                onChangeText={(t) => setTimer(t ? Number(t) : '')}
                editable={canAssignments && canCustomPassTimers}
              />
            </View>

            <View>
              <Label>Due at (optional, ISO)</Label>
              <TextInput
                style={tw`mt-1 w-full px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
                placeholder="2025-09-30T23:59:59Z"
                placeholderTextColor="#9CA3AF"
                value={dueAt}
                onChangeText={setDueAt}
                editable={canAssignments}
              />
            </View>
          </View>

          {/* Actions + Link */}
          <View style={tw`mt-1`}>
            <TouchableOpacity
              onPress={onCreateAssignment}
              disabled={!canAssignments}
              style={tw.style(
                'px-3 py-2 rounded items-center',
                canAssignments ? 'bg-emerald-600' : 'bg-white/10'
              )}
            >
              <Text style={tw`text-white font-semibold`}>Create assignment</Text>
            </TouchableOpacity>

            {!!inviteLink && (
              <View style={tw`mt-2`}>
                <TextInput
                  style={tw`px-3 py-2 rounded bg-[#0f1821] text-white border border-white/10`}
                  value={inviteLink}
                  editable={false}
                />
                <TouchableOpacity
                  onPress={copyLink}
                  style={tw`mt-2 px-3 py-2 rounded bg-pink-600 items-center`}
                >
                  <Text style={tw`text-white text-sm font-semibold`}>Copy</Text>
                </TouchableOpacity>
              </View>
            )}

            {!!inviteLink && (org?.email_domain || form.email_domain) && (
              <Text style={tw`mt-2 text-[11px] text-amber-300`}>
                This invite is restricted to: <Text style={tw`font-bold`}>{(form.email_domain || org?.email_domain || '').trim()}</Text>
              </Text>
            )}
          </View>

          <Text style={tw`text-xs text-white/70 mt-1`}>
            Share the link. Learners join → timer starts → one attempt → auto email → results on this dashboard.
          </Text>
        </View>
      )}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────
 * ANALYTICS pane (Native)
 * ───────────────────────────────────────────────────────── */

type AnalyticsProps = {
  period: Period;
  setPeriod: (p: Period) => void;
  canMultiPeriodAnalytics: boolean;
  canEmailReports: boolean;
  canCSV: boolean;
  canMonthly: boolean;

  loadingAnalytics: boolean;
  analytics: OrgAnalyticsRow[];

  onRefresh: () => void;
  onExportCSV: () => void;
  onSendReportRow: (bucketISO: string, period: Period) => Promise<void>;
};

export function AnalyticsPane({
  period,
  setPeriod,
  canMultiPeriodAnalytics,
  canEmailReports,
  canCSV,
  canMonthly,
  loadingAnalytics,
  analytics,
  onRefresh,
  onExportCSV,
  onSendReportRow,
}: AnalyticsProps) {
  const header = (
    <View style={tw`flex-row flex-wrap items-center mb-3`}>
      <TouchableOpacity
        onPress={() => setPeriod('month')}
        style={tw.style('px-3 py-1.5 rounded-xl mr-2', period === 'month' ? 'bg-white/10' : 'bg-white/5')}
      >
        <Text style={tw`text-white text-sm`}>Month</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => canMultiPeriodAnalytics && setPeriod('term')}
        disabled={!canMultiPeriodAnalytics}
        style={tw.style(
          'px-3 py-1.5 rounded-xl mr-2',
          period === 'term' ? 'bg-white/10' : 'bg-white/5',
          !canMultiPeriodAnalytics && 'opacity-50'
        )}
      >
        <Text style={tw`text-white text-sm`}>Term</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => canMultiPeriodAnalytics && setPeriod('year')}
        disabled={!canMultiPeriodAnalytics}
        style={tw.style(
          'px-3 py-1.5 rounded-xl mr-2',
          period === 'year' ? 'bg-white/10' : 'bg-white/5',
          !canMultiPeriodAnalytics && 'opacity-50'
        )}
      >
        <Text style={tw`text-white text-sm`}>Year</Text>
      </TouchableOpacity>

      <View style={tw`ml-auto flex-row items-center`}>
        {canCSV && (
          <TouchableOpacity onPress={onExportCSV} style={tw`px-3 py-1.5 rounded-xl bg-white/10 mr-2`}>
            <Text style={tw`text-white text-sm`}>Export CSV</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onRefresh} style={tw`px-3 py-1.5 rounded-xl bg-white/10`}>
          <Text style={tw`text-white text-sm`}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRow = ({ item }: { item: OrgAnalyticsRow }) => (
    <View style={tw`py-2 border-t border-white/10`}>
      <View style={tw`flex-row`}>
        <View style={tw`w-2/5 pr-2`}>
          <Text style={tw`text-white/70 text-xs`}>Bucket</Text>
          <Text style={tw`text-white`}>{new Date(item.bucket).toLocaleDateString()}</Text>
        </View>
        <View style={tw`w-1/5 pr-2`}>
          <Text style={tw`text-white/70 text-xs`}>Attempts</Text>
          <Text style={tw`text-white`}>{item.attempts}</Text>
        </View>
        <View style={tw`w-1/5 pr-2`}>
          <Text style={tw`text-white/70 text-xs`}>Passes</Text>
          <Text style={tw`text-white`}>{item.passes}</Text>
        </View>
        <View style={tw`w-1/5`}>
          <Text style={tw`text-white/70 text-xs`}>Avg</Text>
          <Text style={tw`text-white`}>{Math.round(item.avg_score || 0)}%</Text>
        </View>
      </View>

      {canEmailReports && (
        <View style={tw`mt-2`}>
          <TouchableOpacity
            onPress={() => onSendReportRow(new Date(item.bucket).toISOString(), period)}
            style={tw`px-3 py-1.5 rounded bg-white/10 self-start`}
          >
            <Text style={tw`text-white text-xs`}>Email row</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={tw`rounded-2xl border border-white/10 bg-white/5 p-3`}>
      {header}

      {loadingAnalytics ? (
        <View style={tw`py-6 items-center`}>
          <ActivityIndicator color="#fff" />
          <Text style={tw`text-white/70 text-xs mt-2`}>Loading…</Text>
        </View>
      ) : analytics.length ? (
        <FlatList
          data={analytics}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderRow}
        />
      ) : (
        <Text style={tw`py-6 text-white/60 text-xs`}>No data for this period yet.</Text>
      )}

      {!canMonthly && (
        <Text style={tw`mt-3 text-xs text-amber-300`}>
          Monthly analytics are not included. Upgrade to view analytics.
        </Text>
      )}
    </View>
  );
}
