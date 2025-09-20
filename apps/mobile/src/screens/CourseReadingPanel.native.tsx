/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import tw from '../../tailwind';

/* ------------------------------- types ------------------------------- */

type Status = 'Not Started' | 'In Progress' | 'Completed';

export type SyllabusItem = {
  week: number;
  topic?: string;
  assignment?: string;
  videoUrl?: string;
  notesUrl?: string;
};

type Props = {
  courseId: string;
  week?: number | null;
  item?: SyllabusItem | null;
  status?: Status | null;
  onSetStatus?: (next: Status) => Promise<void> | void;
};

/* ------------------------------ helpers ------------------------------ */

const isMp4 = (url?: string) => !!url && /\.mp4(\?|$)/i.test(url);
const isYouTube = (url?: string) => !!url && /(youtube\.com|youtu\.be)/i.test(url || '');
const isVimeo = (url?: string) => !!url && /vimeo\.com/i.test(url || '');

/** Small progress bar */
const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => (
  <View style={tw`h-2 w-full rounded bg-gray-200 overflow-hidden`}>
    <View style={[tw`h-2 bg-[#3d99f5]`, { width: `${Math.max(0, Math.min(100, pct))}%` }]} />
  </View>
);

/** Theme-aware card */
const Card: React.FC<{ title?: string; children?: React.ReactNode; style?: any }> = ({ title, children, style }) => (
  <View style={[tw`rounded-2xl border border-gray-200 bg-white p-4`, style]}>
    {!!title && <Text style={tw`text-lg font-semibold mb-3`}>{title}</Text>}
    {children}
  </View>
);

/* ----------------------------- VideoGate ----------------------------- */
/**
 * - MP4: renders inline <Video> with precise progress (80% to satisfy)
 * - YouTube/Vimeo/others: opens externally; we track a 4-min timer as coarse proxy (80% → 192s)
 */
const VideoGate: React.FC<{
  url: string;
  onSatisfied: () => void;
}> = ({ url, onSatisfied }) => {
  const requiredPct = 80;
  const NON_MP4_TOTAL = 240; // 4 minutes
  const NON_MP4_REQUIRED = Math.round((requiredPct / 100) * NON_MP4_TOTAL); // 192s

  const [openLarge, setOpenLarge] = useState(false);
  const [watchedPct, setWatchedPct] = useState(0);

  // mp4 tracking
  const videoRef = useRef<Video | null>(null);
  const onStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status || !('positionMillis' in status) || !('durationMillis' in status) || !status.durationMillis) return;
      const pct = Math.min(100, Math.round((status.positionMillis / status.durationMillis) * 100));
      setWatchedPct(pct);
      if (pct >= requiredPct) onSatisfied();
    },
    [onSatisfied]
  );

  // non-mp4 tracking
  const [coarseElapsed, setCoarseElapsed] = useState(0);
  useEffect(() => {
    if (isMp4(url)) return;
    let id: any = null;
    if (coarseElapsed >= NON_MP4_REQUIRED) {
      setWatchedPct(100);
      onSatisfied();
      return;
    }
    // tick every second but only while the user has "started" (presses Open Video)
    if (coarseElapsed > 0 && coarseElapsed < NON_MP4_REQUIRED) {
      id = setInterval(() => {
        setCoarseElapsed((s) => s + 1);
      }, 1000);
    }
    return () => id && clearInterval(id);
  }, [url, coarseElapsed, onSatisfied]);

  const startExternal = async () => {
    try {
      await Linking.openURL(url);
      // start coarse timer after we launch external link
      if (coarseElapsed === 0) setCoarseElapsed(1);
    } catch {
      // no-op
    }
  };

  const pctLabel =
    isMp4(url) ? `Watched: ${watchedPct}% • need ${requiredPct}%` :
    `Time: ${coarseElapsed}s / ${NON_MP4_REQUIRED}s (~80%)`;

  return (
    <Card title="Video">
      <View style={tw`mx-auto w-full`}>
        {/* Primary player area */}
        {isMp4(url) ? (
          <>
            <View style={tw`rounded-lg overflow-hidden bg-black`}>
              <View style={[tw`w-full bg-black`, { aspectRatio: 16 / 9 }]}>
                <Video
                  ref={videoRef}
                  source={{ uri: url }}
                  style={tw`w-full h-full`}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls
                  onPlaybackStatusUpdate={onStatus}
                  shouldPlay={false}
                />
              </View>
            </View>
            <View style={tw`mt-3`}>
              <ProgressBar pct={watchedPct} />
              <Text style={tw`mt-1 text-xs text-gray-600`}>{pctLabel}</Text>
            </View>

            {/* Toggle large */}
            <TouchableOpacity
              onPress={() => setOpenLarge((s) => !s)}
              style={tw`mt-2 self-start rounded-xl h-9 px-3 bg-[#e7edf4] justify-center`}
            >
              <Text style={tw`text-sm font-semibold`}>{openLarge ? 'Hide large player' : 'Open large player'}</Text>
            </TouchableOpacity>

            {openLarge && (
              <View style={tw`mt-3 rounded-xl overflow-hidden bg-black`}>
                <View style={[tw`w-full bg-black`, { aspectRatio: 16 / 9 }]}>
                  <Video
                    source={{ uri: url }}
                    style={tw`w-full h-full`}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    onPlaybackStatusUpdate={onStatus}
                    shouldPlay
                  />
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            {/* For YouTube / Vimeo we can't iframe; open externally and track time */}
            <TouchableOpacity
              onPress={startExternal}
              style={tw`rounded-xl h-11 px-4 bg-[#3d99f5] justify-center items-center`}
            >
              <Text style={tw`text-white font-semibold`}>Open video</Text>
            </TouchableOpacity>

            <View style={tw`mt-3`}>
              <ProgressBar pct={Math.min(100, Math.round((coarseElapsed / NON_MP4_REQUIRED) * 100))} />
              <Text style={tw`mt-1 text-xs text-gray-600`}>{pctLabel}</Text>
            </View>

            <Text style={tw`mt-2 text-xs text-gray-500`}>
              Video opens in your browser or YouTube app. Keep it playing; this timer will reach ~80%.
            </Text>
          </>
        )}
      </View>
    </Card>
  );
};

/* ----------------------------- NotesGate ------------------------------ */
/** Opens notes (PDF/image) externally, then requires 30s of dwell time */
const NotesGate: React.FC<{
  url: string;
  onSatisfied: () => void;
}> = ({ url, onSatisfied }) => {
  const requiredSeconds = 30;
  const [downloaded, setDownloaded] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let id: any = null;
    if (downloaded && elapsed < requiredSeconds) {
      id = setInterval(() => setElapsed((s) => s + 1), 1000);
    }
    return () => id && clearInterval(id);
  }, [downloaded, elapsed]);

  useEffect(() => {
    if (downloaded && elapsed >= requiredSeconds) onSatisfied();
  }, [downloaded, elapsed, onSatisfied]);

  const onOpen = async () => {
    try {
      await Linking.openURL(url);
      setDownloaded(true);
    } catch {
      // no-op
    }
  };

  return (
    <Card title="Notes / PDF">
      <View style={tw`flex-col gap-2`}>
        <Text style={tw`text-sm text-gray-600`}>Please download and review the notes.</Text>
        <TouchableOpacity
          onPress={onOpen}
          style={tw`self-start rounded-xl h-9 px-3 bg-[#e7edf4] justify-center`}
        >
          <Text style={tw`text-sm font-semibold`}>Open notes</Text>
        </TouchableOpacity>
        <Text style={tw`text-xs text-gray-600`}>
          Time on step: {elapsed}s / {requiredSeconds}s {downloaded ? '• opened ✔' : '• not opened'}
        </Text>
      </View>
    </Card>
  );
};

/* --------------------------- AssignmentGate --------------------------- */
/** Simple dwell requirement (60s) after reading the task text */
const AssignmentGate: React.FC<{
  text?: string;
  onSatisfied: () => void;
}> = ({ text, onSatisfied }) => {
  const requiredSeconds = 60;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (elapsed >= requiredSeconds) onSatisfied();
  }, [elapsed, onSatisfied]);

  return (
    <Card title="Assignment">
      <Text style={tw`text-sm text-gray-800`}>
        {text?.trim() || 'Work through this week’s task before marking complete.'}
      </Text>
      <Text style={tw`mt-2 text-xs text-gray-600`}>
        Spend at least {requiredSeconds}s on this step. Time on step: {elapsed}s
      </Text>
    </Card>
  );
};

/* ---------------------------- Main component --------------------------- */

const CourseReadingPanelNative: React.FC<Props> = ({
  courseId,
  week,
  item,
  status,
  onSetStatus,
}) => {
  const safeStatus: Status = status ?? 'Not Started';
  const safeItem: SyllabusItem | null = item ?? null;
  const weekLabel = safeItem?.week ?? week ?? 0;

  // step gates
  const [videoOk, setVideoOk] = useState(false);
  const [notesOk, setNotesOk] = useState(false);
  const [assignmentOk, setAssignmentOk] = useState(false);

  // mark "In Progress" on first mount if not started
  useEffect(() => {
    if (safeStatus === 'Not Started' && onSetStatus) {
      void onSetStatus('In Progress');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needVideo = !!safeItem?.videoUrl;
  const needNotes = !!safeItem?.notesUrl;
  const needAssign = !!(safeItem?.assignment && safeItem.assignment.trim().length > 0);

  const canComplete =
    (needVideo ? videoOk : true) &&
    (needNotes ? notesOk : true) &&
    (needAssign ? assignmentOk : true);

  const onMarkComplete = async () => {
    if (!canComplete || !onSetStatus) return;
    await onSetStatus('Completed');
  };

  // placeholder while item loads / absent
  if (!safeItem) {
    return (
      <ScrollView contentContainerStyle={tw`p-4`}>
        <View style={tw`flex-row items-center justify-between mb-3`}>
          <View>
            <Text style={tw`text-xl font-bold`}>Week {weekLabel}: Loading…</Text>
            <Text style={tw`text-sm text-gray-600`}>We’re fetching this week’s resources.</Text>
          </View>
          <View style={tw`rounded-lg h-8 px-3 bg-gray-200 justify-center`}>
            <Text style={tw`text-xs font-semibold`}>{safeStatus}</Text>
          </View>
        </View>
        <Card>
          <Text style={tw`text-sm text-gray-600`}>
            No week data yet. If this persists, check your progress API route or the enrollment/Week ID.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={tw`p-4`}>
      {/* Header */}
      <View style={tw`flex-row items-start justify-between mb-3`}>
        <View style={tw`pr-3 flex-1`}>
          <Text style={tw`text-xl font-bold`}>
            Week {weekLabel}: {safeItem.topic || 'Untitled'}
          </Text>
          <Text style={tw`text-sm text-gray-600`}>Work through the resources below.</Text>
        </View>

        <View style={tw`flex-row items-center`}>
          <View style={tw`rounded-lg h-8 px-3 bg-gray-200 justify-center mr-2`}>
            <Text style={tw`text-xs font-semibold`}>{safeStatus}</Text>
          </View>
          <TouchableOpacity
            disabled={!canComplete || safeStatus === 'Completed' || !onSetStatus}
            onPress={onMarkComplete}
            style={tw.style(
              'rounded-xl h-9 px-4 justify-center',
              !canComplete || safeStatus === 'Completed' || !onSetStatus
                ? 'bg-gray-200'
                : 'bg-[#3d99f5]'
            )}
          >
            <Text style={tw.style('text-sm font-semibold', (!canComplete || safeStatus === 'Completed' || !onSetStatus) ? 'text-gray-500' : 'text-white')}>
              {safeStatus === 'Completed' ? 'Completed' : 'Mark week as complete'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Resources */}
      {!!safeItem.videoUrl && (
        <View style={tw`mb-4`}>
          <VideoGate url={safeItem.videoUrl!} onSatisfied={() => setVideoOk(true)} />
        </View>
      )}

      {!!safeItem.notesUrl && (
        <View style={tw`mb-4`}>
          <NotesGate url={safeItem.notesUrl!} onSatisfied={() => setNotesOk(true)} />
        </View>
      )}

      {!!(safeItem.assignment && safeItem.assignment.trim().length > 0) && (
        <View style={tw`mb-4`}>
          <AssignmentGate text={safeItem.assignment} onSatisfied={() => setAssignmentOk(true)} />
        </View>
      )}

      {/* Empty state if no resources */}
      {!safeItem.videoUrl && !safeItem.notesUrl && !(safeItem.assignment && safeItem.assignment.trim().length > 0) && (
        <Card>
          <Text style={tw`text-sm text-gray-600`}>
            No resources were added for this week. You can still mark it complete when ready.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
};

export default CourseReadingPanelNative;
