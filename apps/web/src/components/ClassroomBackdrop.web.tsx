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

  /** Overlay darkness (0–1). Default: 0.35 */
  dim?: number;
  /** Subtle blur amount in pixels. Default: 2 */
  blurPx?: number;
  /** Background brightness multiplier. Default: 0.6 */
  brightness?: number;
  /** Background saturation multiplier. Default: 0.9 */
  saturation?: number;
  /** Vignette inner stop (0–1). Default: 0.45 (45%) */
  vignetteInner?: number;
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
  dim = 0.35,
  blurPx = 2,
  brightness = 0.6,
  saturation = 0.9,
  vignetteInner = 0.45,
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

  // 3) Rotate with simple crossfade (current image keyed)
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || extraImages.length <= 1) return () => {};
    if (timerRef.current) window.clearInterval(timerRef.current);
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

  // Layer two slides (previous+current) for a soft change; filters keep contrast consistent
  const prevIdx = (idx - 1 + extraImages.length) % extraImages.length;
  const cur = extraImages[idx] || base;
  const prev = extraImages[prevIdx] || base;

  // Shared filter applied to both slides
  const filterCSS = `brightness(${brightness}) saturate(${saturation})`;

  // Tunable vignette (center transparent -> edges dark)
  const vignetteCSS = `radial-gradient(ellipse at center, rgba(0,0,0,0) ${Math.round(
    vignetteInner * 100
  )}%, rgba(0,0,0,0.55) 100%)`;

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      {/* Previous */}
      <div
        aria-hidden
        className="absolute inset-0 bg-center bg-cover transition-opacity duration-700"
        style={{ backgroundImage: `url('${prev}')`, opacity: 0, filter: filterCSS }}
      />
      {/* Current */}
      <div
        aria-hidden
        key={idx} // force transition
        className="absolute inset-0 bg-center bg-cover transition-opacity duration-700 opacity-100"
        style={{ backgroundImage: `url('${cur}')`, filter: filterCSS }}
      />

      {/* Dim layer + subtle blur (pointer-events disabled so UI works) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: `rgba(0,0,0,${Math.max(0, Math.min(1, dim))})`,
          backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
        }}
      />

      {/* Soft radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: vignetteCSS }}
      />

      {/* Stronger bottom fade for captions/UI legibility */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
    </div>
  );
}
