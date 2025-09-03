import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pickImageForCourse, SUBJECT_IMAGE_MAP, SUBJECT_ALIASES, FALLBACK_COURSE_IMAGE } from '@/utils/subjectImages'; // adjust path if needed

type CourseLike = { id?: string; title?: string; subject?: string; category?: string; level?: string; description?: string; [k: string]: any };
type BackdropProps = {
  course?: CourseLike | null;
  outline?: { id: string; title: string; keyPoints?: string[] }[];
  backendUrl?: string;
  /** Seconds between slide changes */
  intervalSec?: number;
  /** Stop rotating when false (e.g., paused) */
  playing?: boolean;
};

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function collectSubjectKeysFromText(txt: string) {
  const hay = normalize(txt);
  const hits: string[] = [];

  // direct keys
  for (const key of Object.keys(SUBJECT_IMAGE_MAP)) {
    if (hay.includes(key)) hits.push(key);
  }
  // aliases
  for (const [canonical, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.some(a => hay.includes(a))) hits.push(canonical);
  }
  return Array.from(new Set(hits));
}

export default function ClassroomBackdrop({
  course,
  outline,
  backendUrl,
  intervalSec = 14,
  playing = true,
}: BackdropProps) {
  // 1) Base (safe) image from your helper
  const base = useMemo(() => {
    try {
      return course ? pickImageForCourse(course as any, backendUrl) : FALLBACK_COURSE_IMAGE;
    } catch {
      return FALLBACK_COURSE_IMAGE;
    }
  }, [course, backendUrl]);

  // 2) Smart additions: derive a few more images from title + outline
  const extraImages = useMemo(() => {
    const pool = new Set<string>();
    const textBits: string[] = [];

    if (course?.title) textBits.push(course.title);
    if ((course as any)?.subject) textBits.push((course as any).subject);
    if ((course as any)?.category) textBits.push((course as any).category);
    if (course?.description) textBits.push(course.description || '');
    (outline || []).forEach(s => {
      textBits.push(s.title);
      (s.keyPoints || []).forEach(k => textBits.push(k));
    });

    const keys = collectSubjectKeysFromText(textBits.join(' '));
    keys.forEach(k => pool.add(SUBJECT_IMAGE_MAP[k]));

    // ensure base is first; cap to 4 total for memory/perf
    const arr = [base, ...Array.from(pool)];
    const uniq = Array.from(new Set(arr)).slice(0, 4);
    return uniq;
  }, [base, course, outline]);

  // 3) Rotate with simple crossfade
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || extraImages.length <= 1) return () => {};
    timerRef.current && window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setIdx(i => (i + 1) % extraImages.length);
    }, intervalSec * 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [extraImages.length, intervalSec, playing]);

  // Preload images once
  useEffect(() => {
    extraImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, [extraImages]);

  // Layer two slides for a soft crossfade (current & previous)
  const prevIdx = (idx - 1 + extraImages.length) % extraImages.length;
  const cur = extraImages[idx] || base;
  const prev = extraImages[prevIdx] || base;

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      {/* Previous */}
      <div
        aria-hidden
        className="absolute inset-0 bg-center bg-cover transition-opacity duration-700"
        style={{ backgroundImage: `url('${prev}')`, opacity: 0.0 }}
      />
      {/* Current */}
      <div
        aria-hidden
        key={idx} // force fade
        className="absolute inset-0 bg-center bg-cover transition-opacity duration-700 opacity-100"
        style={{ backgroundImage: `url('${cur}')` }}
      />
      {/* Vignette + readable floor */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  );
}
