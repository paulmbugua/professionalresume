// apps/mobile/src/screens/RobotTeacherControls.native.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

export type SizePresetKey = "quick" | "standard" | "extended" | "intensive" | "marathon";
export type TrackKey = "module" | "certificate" | "diploma" | "degree";
type CourseOption = { id: string; title: string };

type Option = { value: string; label: string };

/* ───────────────────────── CourseSelect (native) ───────────────────────── */
const CourseSelect = React.memo(function CourseSelect({
  options,
  value,
  onChange,
  placeholder = "Select a course…",
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  return (
    <View className="relative">
      <Pressable
        onPress={() => setOpen(true)}
        className="h-11 rounded-xl px-3 pr-9 justify-center border border-slate-300 bg-white dark:border-white/15 dark:bg-[#172534]"
        accessibilityRole="button"
        accessibilityLabel="Select course"
      >
        <Text className={`text-sm ${selected ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-white/60"}`}>
          {selected ? selected.label : placeholder}
        </Text>

        <View className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60">
          <Text className="text-slate-500 dark:text-white/70">▾</Text>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setOpen(false)} />

        <View className="absolute inset-x-4 top-[20%] rounded-2xl overflow-hidden bg-white dark:bg-[#0f1821] border border-slate-200 dark:border-white/10">
          <View className="px-4 py-3 border-b border-slate-200 dark:border-white/10">
            <Text className="font-semibold text-slate-900 dark:text-white">Choose a course</Text>
          </View>

          {Platform.OS === "android" ? (
            <View className="px-2 py-2">
              <Picker
                selectedValue={value}
                onValueChange={(v) => {
                  onChange(String(v));
                  setOpen(false);
                }}
                dropdownIconColor="#64748b"
              >
                {options.length === 0 ? (
                  <Picker.Item label="No courses available" value="" />
                ) : (
                  options.map((o) => <Picker.Item key={o.value} label={o.label} value={o.value} />)
                )}
              </Picker>
            </View>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    className={`px-4 py-3 ${active ? "bg-indigo-50 dark:bg-indigo-600/30" : ""}`}
                  >
                    <Text className={`text-sm ${active ? "text-indigo-700 dark:text-white" : "text-slate-900 dark:text-white"}`}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View className="px-4 py-3">
                  <Text className="text-sm text-slate-500 dark:text-white/60">No courses available</Text>
                </View>
              }
              style={{ maxHeight: 300 }}
            />
          )}

          <View className="px-4 py-3 border-t border-slate-200 dark:border-white/10">
            <Pressable onPress={() => setOpen(false)} className="self-end px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/10">
              <Text className="text-slate-700 dark:text-white">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
});

/* ─────────────────────────── Types for panel ─────────────────────────── */
interface ControlsPanelProps {
  showMinimalControls: boolean;
  isLockedLearner: boolean;
  canShareUi: boolean;
  restrictStarter: boolean;
  knobsDisabled: boolean;
  topCourses: CourseOption[];
  selectedCourse: CourseOption | null;
  onSelectCourse: (id: string) => void;
  PRESETS: ReadonlyArray<{ key: SizePresetKey; label: string; min: number }>;
  TRACKS: ReadonlyArray<{ key: TrackKey; label: string; lessons: number }>;
  trackLessons: number;
  sizePreset: SizePresetKey;
  setSizePreset: (k: SizePresetKey) => void;
  minutes: number;
  setMinutes: (n: number) => void;
  classLevel: "beginner" | "intermediate" | "advanced";
  setClassLevel: (lv: "beginner" | "intermediate" | "advanced") => void;
  programTrack: TrackKey;
  setProgramTrack: (k: TrackKey) => void;
  capMinutes: (m?: number) => number;
  customTitle: string;
  setCustomTitle: (s: string) => void;
  busy: boolean;
  hasAIContent: boolean;
  onStart: () => Promise<void> | void;
  onRefreshSelectedAI: () => Promise<void> | void;
  onOpenShare: () => void;
  totalLessons: number;
  setTotalLessons: (n: number) => void;
  quizCount: number;
  setQuizCount: (n: number) => void;
}

/* ───────────────────────────── Panel (native) ───────────────────────────── */
const ControlsPanel: React.FC<ControlsPanelProps> = React.memo((props) => {
  const {
    showMinimalControls,
    isLockedLearner,
    canShareUi,
    restrictStarter, // eslint-disable-line @typescript-eslint/no-unused-vars
    knobsDisabled,
    topCourses,
    selectedCourse,
    onSelectCourse,
    PRESETS,
    TRACKS,
    trackLessons,
    sizePreset,
    setSizePreset,
    minutes,
    setMinutes,
    classLevel,
    setClassLevel,
    programTrack,
    setProgramTrack,
    capMinutes,
    customTitle,
    setCustomTitle,
    busy,
    hasAIContent,
    onStart,
    onRefreshSelectedAI,
    onOpenShare,
    totalLessons,
    setTotalLessons,
    quizCount,
    setQuizCount,
  } = props;

  // Safe fallback for preset key to avoid PRESETS[0] possibly undefined
  const defaultPresetKey: SizePresetKey = PRESETS[0]?.key ?? "standard";

  return (
    <View className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1821] p-3 md:p-4">
      {showMinimalControls ? (
        <View className="gap-3">
          <Text className="text-sm text-slate-600 dark:text-white/70">
            This lesson was assigned by your organization. Settings are fixed.
          </Text>

          <View>
            <Text className="text-[11px] text-slate-600 dark:text-white/70">Course</Text>
            <View className="mt-1 h-11 rounded-xl px-3 justify-center bg-slate-100 dark:bg-white/10">
              <Text className="text-slate-900 dark:text-white">
                {selectedCourse?.title || "Assigned course"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-end gap-2">
            <Pressable
              onPress={() => {
                if (!busy) onStart();
              }}
              disabled={busy || !selectedCourse}
              className={`flex-1 h-10 rounded-xl items-center justify-center border ${
                busy || !selectedCourse
                  ? "opacity-60 bg-indigo-50 border-indigo-300"
                  : "bg-indigo-50 border-indigo-300"
              }`}
              accessibilityLabel="Start with AI"
            >
              <Text className="text-sm font-semibold text-indigo-700 dark:text-white">
                {busy ? "Preparing…" : hasAIContent ? "Continue lesson" : "Start with A.I"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
          {/* Course */}
          <View>
            <Text className="text-[11px] text-slate-600 dark:text-white/70">Course</Text>
            <View className="mt-1">
              {isLockedLearner ? (
                <View className="h-11 rounded-xl px-3 justify-center bg-slate-100 dark:bg-white/10">
                  <Text className="text-slate-900 dark:text-white">
                    {selectedCourse?.title || "Assigned course"}
                  </Text>
                </View>
              ) : (
                <CourseSelect
                  value={selectedCourse?.id || ""}
                  onChange={(id) => onSelectCourse(id)}
                  options={(topCourses || []).map((c) => ({ value: c.id, label: c.title }))}
                  placeholder={(topCourses || []).length ? "Select a course…" : "Loading…"}
                />
              )}
            </View>
          </View>

          {/* Program track */}
          <View>
            <Text className="text-[11px] text-slate-600 dark:text-white/70">Program track</Text>
            <View className="mt-1 flex-row flex-wrap gap-2">
              {TRACKS.map((t) => {
                const active = programTrack === t.key;
                const disabled = isLockedLearner;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => !disabled && setProgramTrack(t.key)}
                    disabled={disabled}
                    className={`px-3 py-1.5 rounded-full border ${
                      active
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-white dark:bg-white/10 border-slate-300 dark:border-white/15"
                    } ${disabled ? "opacity-50" : ""}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled }}
                    accessibilityLabel={`${t.label} (${t.lessons})`}
                  >
                    <Text className={`${active ? "text-white" : "text-slate-800 dark:text-white"}`}>
                      {t.label} ({t.lessons})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="mt-1 text-[11px] text-slate-600 dark:text-white/60">
              Track controls lesson count. We generate ~{trackLessons} lessons for this course.
            </Text>
          </View>

          {/* Lesson size + minutes */}
          <View>
            <Text className="text-[11px] text-slate-600 dark:text-white/70">Lesson size</Text>
            <View className="mt-1 gap-2">
              <View className="flex-row flex-wrap gap-2">
                {PRESETS.map((p) => {
                  const active = sizePreset === p.key;
                  const disabled = isLockedLearner;
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() => {
                        if (disabled) return;
                        setSizePreset(p.key);
                        setMinutes(capMinutes(minutes < p.min ? p.min : minutes));
                      }}
                      disabled={disabled}
                      className={`px-3 py-1.5 rounded-full border ${
                        active
                          ? "bg-indigo-600 border-indigo-600"
                          : "bg-white dark:bg-white/10 border-slate-300 dark:border-white/15"
                      } ${disabled ? "opacity-50" : ""}`}
                      accessibilityLabel={`${p.label} (~${p.min} min)`}
                      accessibilityState={{ selected: active, disabled }}
                    >
                      <Text className={`${active ? "text-white" : "text-slate-800 dark:text-white"}`}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="flex-row items-center gap-2">
                <Text className="text-[11px] text-slate-600 dark:text-white/70">Minutes</Text>
                <TextInput
                  keyboardType="number-pad"
                  value={String(minutes)}
                  onChangeText={(txt) => {
                    if (knobsDisabled) return;
                    const n = Math.max(8, Math.min(600, Number(txt.replace(/[^\d]/g, "")) || 0));
                    setMinutes(n);
                    const found = [...PRESETS].reverse().find((x) => n >= x.min);
                    const key: SizePresetKey = (found?.key ?? defaultPresetKey);
                    setSizePreset(key);
                  }}
                  editable={!knobsDisabled}
                  className={`h-9 w-20 rounded-xl px-2 border text-[12px] ${
                    knobsDisabled
                      ? "opacity-50 border-slate-300 dark:border-white/15"
                      : "border-slate-300 dark:border-white/15"
                  } bg-white dark:bg-[#172534] text-slate-900 dark:text-white`}
                />
              </View>
            </View>
          </View>

          {/* Level */}
          <View>
            <Text className="text-[11px] text-slate-600 dark:text-white/70">Level</Text>
            <View className="mt-1 flex-row rounded-lg overflow-hidden border border-slate-200 dark:border-white/15">
              {(["beginner", "intermediate", "advanced"] as const).map((lv) => {
                const active = classLevel === lv;
                const disabled = isLockedLearner;
                return (
                  <Pressable
                    key={lv}
                    onPress={() => !disabled && setClassLevel(lv)}
                    disabled={disabled}
                    className={`flex-1 px-3 py-2 ${
                      active
                        ? "bg-indigo-50 dark:bg-white/20"
                        : "bg-white dark:bg-white/10"
                    } ${disabled ? "opacity-50" : ""}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled }}
                    accessibilityLabel={lv}
                  >
                    <Text className={`${active ? "text-indigo-700 dark:text-white" : "text-slate-700 dark:text-white/80"} capitalize text-[11px]`}>
                      {lv}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Start / Refresh / Share */}
          <View className="flex-row items-end gap-2">
            <Pressable
              onPress={() => {
                if (!busy) onStart();
              }}
              disabled={busy || (!selectedCourse && !customTitle.trim())}
              className={`flex-1 h-10 rounded-xl items-center justify-center border ${
                busy || (!selectedCourse && !customTitle.trim())
                  ? "opacity-60 bg-indigo-50 border-indigo-300"
                  : "bg-indigo-50 border-indigo-300"
              }`}
              accessibilityLabel="Start with AI"
            >
              <Text className="text-sm font-semibold text-indigo-700 dark:text-white">
                {busy ? "Preparing…" : hasAIContent ? "Continue lesson" : "Start with A.I"}
              </Text>
            </Pressable>

            {selectedCourse && !isLockedLearner ? (
              <Pressable
                onPress={() => onRefreshSelectedAI()}
                className="h-10 px-3 rounded-xl items-center justify-center border bg-white dark:bg-white/10 border-slate-300 dark:border-white/15"
                accessibilityLabel="Refresh AI"
              >
                <Text className="text-slate-800 dark:text-white">Refresh AI</Text>
              </Pressable>
            ) : null}

            {canShareUi && !isLockedLearner ? (
              <Pressable
                onPress={onOpenShare}
                disabled={!selectedCourse?.id && !customTitle.trim()}
                className={`h-10 px-3 rounded-xl items-center justify-center border ${
                  selectedCourse?.id
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-white dark:bg-white/10 border-slate-300 dark:border-white/15"
                } ${!selectedCourse?.id && !customTitle.trim() ? "opacity-60" : ""}`}
                accessibilityLabel="Share with learners"
              >
                <Text className={`${selectedCourse?.id ? "text-white" : "text-slate-800 dark:text-white"}`}>
                  Share with learners
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Extra knobs (minutes/lessons/quizzes) */}
          <View className="gap-2">
            <LabeledNumber
              label="Minutes"
              value={minutes}
              min={3}
              max={5000}
              disabled={knobsDisabled}
              onChange={(v) => {
                const vv = Math.max(3, v);
                setMinutes(vv);
                const found = [...PRESETS].reverse().find((x) => vv >= x.min);
                const key: SizePresetKey = (found?.key ?? defaultPresetKey);
                setSizePreset(key);
              }}
            />
            <LabeledNumber
              label="Lessons"
              value={totalLessons}
              min={1}
              max={500}
              disabled={knobsDisabled}
              onChange={(v) => setTotalLessons(Math.max(1, v))}
            />
            <LabeledNumber
              label="Quiz questions"
              value={quizCount}
              min={4}
              max={400}
              disabled={knobsDisabled}
              onChange={(v) => setQuizCount(Math.max(4, v))}
            />
          </View>

          {/* Custom topic */}
          {!isLockedLearner && (
            <View className="mt-1">
              <Text className="text-[11px] text-slate-600 dark:text-white/70">Or type any topic</Text>
              <TextInput
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder='e.g., Linear Algebra crash course'
                className="mt-1 h-11 rounded-xl px-3 border border-slate-300 dark:border-white/15 bg-white dark:bg-[#172534] text-slate-900 dark:text-white"
                placeholderTextColor="rgba(148,163,184,0.8)"
              />
              <View className="mt-2 items-start">
                <Pressable
                  disabled={!customTitle.trim() || busy}
                  onPress={() => onStart()}
                  className={`h-10 px-4 rounded-xl items-center justify-center border ${
                    !customTitle.trim() || busy
                      ? "opacity-60 bg-indigo-50 border-indigo-300"
                      : "bg-indigo-50 border-indigo-300"
                  }`}
                  accessibilityLabel="Teach me"
                >
                  <Text className="text-sm font-semibold text-indigo-700 dark:text-white">Teach me</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
});
ControlsPanel.displayName = "RobotTeacherControls";

export default ControlsPanel;

/* ────────────────────────── Small helper input ────────────────────────── */
function LabeledNumber({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <View>
      <Text className="text-sm text-slate-800 dark:text-white mb-1">{label}</Text>
      <TextInput
        keyboardType="number-pad"
        value={String(value)}
        onChangeText={(txt) => {
          if (disabled) return;
          const n = Math.max(min, Math.min(max, Number(txt.replace(/[^\d]/g, "")) || 0));
          onChange(n);
        }}
        editable={!disabled}
        className={`h-11 rounded-xl px-3 border text-sm ${
          disabled
            ? "opacity-50 border-slate-300 dark:border-white/15"
            : "border-slate-300 dark:border-white/15"
        } bg-white dark:bg-[#172534] text-slate-900 dark:text-white`}
      />
    </View>
  );
}
