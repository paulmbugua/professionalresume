import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFieldArray, useFormContext, Controller, useWatch } from 'react-hook-form';
import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';
import { useShopContext } from '@cvpro/shared/context';
import { uploadAsset } from '@cvpro/shared/api/uploadAsset';
import { demoResume, hasAnyUserData } from '../../templates/demoResume';
import { stripHtml } from '../../utils/cvRichText';
import { parseUploadedCv } from '../../utils/cvParseApi';
import { improveExperienceEntry } from '../../utils/cvImproveApi';
import { normalizeSectionOrder, normalizeSectionVisibility } from '../../utils/cvDefaults';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input {...props} ref={ref} className={`input ${className ?? ''}`} />
  )
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea {...props} ref={ref} className={`input min-h-[90px] ${className ?? ''}`} />
));
Textarea.displayName = 'Textarea';

const RichTextField: React.FC<{
  name: string;
  plainName?: keyof CvDraft;
  placeholder?: string;
}> = ({ name, plainName, placeholder }) => {
  const { setValue, watch } = useFormContext<CvDraft>();
  const value = (watch(name as any) as string) || '';

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => {
          const html = e.target.value;
          setValue(name as any, html, { shouldDirty: true, shouldTouch: true });
          if (plainName) {
            setValue(plainName as any, stripHtml(html), { shouldDirty: true, shouldTouch: true });
          }
        }}
        placeholder={
          placeholder ||
          'Use simple rich text tags like <strong>bold</strong> or <span style="color:#0ea5a5">color</span>'
        }
      />
    </div>
  );
};

const hasText = (v?: string | null) => Boolean(v && v.trim().length > 0);

const debugCvImport = (label: string, payload: unknown) => {
  if (process.env.NODE_ENV === 'production') return;
  try {
    console.log(`[CV_IMPORT_DEBUG] ${label}`, payload);
  } catch {
    // no-op
  }
};

const looksLikePdfJunk = (extracted: any): boolean => {
  if (!extracted) return false;

  const textBits: string[] = [];

  const push = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) textBits.push(value);
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === 'string' && item.trim()) textBits.push(item);
      });
    }
  };

  push(extracted?.basics?.name);
  push(extracted?.basics?.headline);
  push(extracted?.basics?.email);
  push(extracted?.basics?.phone);
  push(extracted?.basics?.location);
  push(extracted?.summary);
  push(extracted?.skills);
  push(extracted?.extras?.languages);
  push(extracted?.extras?.interests);

  const sample = textBits.join(' ').slice(0, 4000);
  if (!sample.trim()) return false;

  const pdfMarkers = [
    '%PDF-',
    'endobj',
    'stream',
    'endstream',
    'xref',
    'MediaBox',
    'ViewerPreferences',
    'ProcSet',
    'StructParents',
  ];

  const markerHits = pdfMarkers.reduce(
    (count, marker) => count + (sample.includes(marker) ? 1 : 0),
    0
  );

  const weirdChars = (sample.match(/[^\x09\x0A\x0D\x20-\x7E]/g) || []).length;
  const weirdRatio = sample.length ? weirdChars / sample.length : 0;

  return markerHits >= 3 || weirdRatio > 0.12;
};

const normalizeExperienceItems = (items: any[] = []) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    company: item?.company || '',
    role: item?.role || '',
    start: item?.start || '',
    end: item?.end || '',
    location: item?.location || '',
    description: item?.description || '',
    bullets: Array.isArray(item?.bullets) ? item.bullets.filter(Boolean) : [],
  }));

const experienceSignature = (items: any[] = []) =>
  JSON.stringify(
    normalizeExperienceItems(items).map((item) => ({
      company: item.company,
      role: item.role,
      start: item.start,
      end: item.end,
      location: item.location,
      description: item.description,
      bullets: item.bullets,
    }))
  );

const BulletsField: React.FC<{
  name: `experience.${number}.bullets` | `projects.${number}.bullets`;
}> = ({ name }) => (
  <Controller
    name={name}
    render={({ field }) => (
      <Textarea
        {...field}
        value={(field.value || []).join('\n')}
        onChange={(e) => {
          const next = e.target.value
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
          field.onChange(next);
        }}
        placeholder="Add bullets (one per line)"
      />
    )}
  />
);

const CsvListField: React.FC<{ name: 'extras.languages' | 'extras.interests'; label: string }> = ({
  name,
  label,
}) => (
  <Controller
    name={name}
    render={({ field }) => (
      <Textarea
        {...field}
        value={(field.value || []).join(', ')}
        onChange={(e) => {
          const next = e.target.value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
          field.onChange(next);
        }}
        placeholder={`${label} (comma separated)`}
      />
    )}
  />
);

type SectionStatus = 'done' | 'missing';

const formatCountLabel = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const StatusPill: React.FC<{ status: SectionStatus; title?: string }> = ({ status, title }) => {
  const isDone = status === 'done';
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isDone
          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200'
          : 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/30 dark:bg-amber-500/15 dark:text-amber-100'
      }`}
    >
      <span className="leading-none">{isDone ? '✓' : '•'}</span>
      <span className="uppercase tracking-wide">{isDone ? 'Complete' : 'Empty'}</span>
    </span>
  );
};

type SectionCardProps = {
  title: string;
  subtitle?: string;
  collapsedPreview?: string;
  isOpen: boolean;
  onToggle?: () => void;
  right?: React.ReactNode;
  status?: SectionStatus;
  statusTitle?: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
};

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  collapsedPreview,
  isOpen,
  onToggle,
  right,
  status,
  statusTitle,
  children,
  className,
  collapsible = true,
}) => {
  const sectionId = useId();
  const contentId = `${sectionId}-content`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors dark:border-white/10 dark:bg-white/5 ${className ?? ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 md:flex-nowrap">
        {collapsible ? (
          <button
            type="button"
            onClick={onToggle}
            className="group min-w-0 flex-1 text-left"
            aria-expanded={isOpen}
            aria-controls={contentId}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="break-words text-sm font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              {status ? <StatusPill status={status} title={statusTitle} /> : null}
              <span
                aria-hidden
                className={`ml-auto shrink-0 text-sm text-gray-400 transition-transform dark:text-white/40 ${
                  isOpen ? 'rotate-180' : 'rotate-0'
                }`}
              >
                ▾
              </span>
            </div>
            {subtitle ? (
              <p className="mt-1 break-words text-xs leading-5 text-gray-500 dark:text-white/60">
                {subtitle}
              </p>
            ) : null}
            {!isOpen && collapsedPreview ? (
              <p className="mt-2 break-words text-xs leading-5 text-gray-700 dark:text-white/70">
                {collapsedPreview}
              </p>
            ) : null}
          </button>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="break-words text-sm font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            </div>
            {subtitle ? (
              <p className="mt-1 break-words text-xs leading-5 text-gray-500 dark:text-white/60">
                {subtitle}
              </p>
            ) : null}
          </div>
        )}

        {right ? (
          <div
            className="flex w-full flex-wrap items-center justify-start gap-2 md:w-auto md:max-w-[52%] md:justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            {right}
          </div>
        ) : null}
      </div>

      <div
        id={contentId}
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0">{children}</div>
      </div>
    </div>
  );
};

const pillBtn =
  'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition';
const pillGray = `${pillBtn} border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80`;
const pillDanger = `${pillBtn} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`;
const pillPrimary = `${pillBtn} border-transparent bg-primary text-white hover:opacity-90`;

const CvForm: React.FC = () => {
  const { register, control, setValue, getValues, reset } = useFormContext<CvDraft>();
  const { backendUrl, token } = useShopContext() as any;

  const [skillInput, setSkillInput] = useState('');
  const [uploadMode, setUploadMode] = useState<'merge' | 'replace'>('merge');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [parseState, setParseState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any | null>(null);
  const [diagnostics, setDiagnostics] = useState<{
    warnings?: string[];
    parser?: string;
    confidence?: number;
  } | null>(null);
  const [hasAppliedUpload, setHasAppliedUpload] = useState(false);
  const [importUndoSnapshot, setImportUndoSnapshot] = useState<CvDraft | null>(null);
  const [experienceRenderKey, setExperienceRenderKey] = useState(0);
  const [improvingExperienceIndex, setImprovingExperienceIndex] = useState<number | null>(null);
  const [improvingAllExperience, setImprovingAllExperience] = useState(false);
  const [experienceAiError, setExperienceAiError] = useState<string | null>(null);
  const [photoUploadState, setPhotoUploadState] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const didAutoPreloadRef = useRef(false);
  const lastExperienceSyncSigRef = useRef('');

  const basics = useWatch({ control, name: 'basics' });
  const templateId = useWatch({ control, name: 'templateId' });
  const summary = useWatch({ control, name: 'summary' });
  const skills = useWatch({ control, name: 'skills' }) || [];
  const experience = useWatch({ control, name: 'experience' }) || [];
  const education = useWatch({ control, name: 'education' }) || [];
  const projects = useWatch({ control, name: 'projects' }) || [];
  const certifications = useWatch({ control, name: 'certifications' }) || [];
  const extras = useWatch({ control, name: 'extras' });
  const sectionVisibility = normalizeSectionVisibility(
    useWatch({ control, name: 'sectionVisibility' }) || demoResume.sectionVisibility
  );
  const isModernBlueSidebar = templateId === 'modern-sidebar-blue';
  const basicsPhotoUrl = basics?.photoUrl?.trim() || '';

  const linksField = useFieldArray({ control, name: 'basics.links' });
  const experienceField = useFieldArray({ control, name: 'experience' });
  const educationField = useFieldArray({ control, name: 'education' });
  const projectsField = useFieldArray({ control, name: 'projects' });
  const certificationsField = useFieldArray({ control, name: 'certifications' });

  const [open, setOpen] = useState<Record<string, boolean>>(() => ({
    basics: true,
    summary: false,
    skills: false,
    experience: false,
    education: false,
    projects: false,
    certifications: false,
    extras: false,
    photo: false,
  }));
  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  const setSectionVisible = (key: CvSectionKey, visible: boolean) => {
    setValue(`sectionVisibility.${key}`, visible as any, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  };

  useEffect(() => {
    debugCvImport('EXPERIENCE_RENDER_STATE', {
      watchedExperienceLength: Array.isArray(experience) ? experience.length : 0,
      fieldArrayLength: experienceField.fields.length,
      watchedExperience: normalizeExperienceItems(experience as any[]),
      fieldArrayItems: experienceField.fields.map((item: any) => ({
        id: item.id,
        company: item.company || '',
        role: item.role || '',
        start: item.start || '',
        end: item.end || '',
        location: item.location || '',
        description: item.description || '',
        bullets: Array.isArray(item.bullets) ? item.bullets : [],
      })),
    });
  }, [experience, experienceField.fields]);

  useEffect(() => {
    const watchedNormalized = normalizeExperienceItems(experience as any[]);
    const watchedSig = experienceSignature(watchedNormalized);
    const fieldSig = experienceSignature(experienceField.fields as any[]);

    if (!hasAppliedUpload) return;
    if (!watchedNormalized.length) return;
    if (watchedSig === fieldSig) return;
    if (lastExperienceSyncSigRef.current === watchedSig) return;

    lastExperienceSyncSigRef.current = watchedSig;

    debugCvImport('EXPERIENCE_SYNC_MISMATCH', {
      watchedSig,
      fieldSig,
      watchedNormalized,
      fieldFields: experienceField.fields,
    });

    experienceField.replace(watchedNormalized as any);
    setExperienceRenderKey((k) => k + 1);

    requestAnimationFrame(() => {
      debugCvImport('EXPERIENCE_SYNC_AFTER_REPLACE', {
        getValuesExperience: normalizeExperienceItems(getValues('experience') as any[]),
      });
    });
  }, [experience, experienceField.fields, hasAppliedUpload, experienceField, getValues]);

  const statuses = useMemo(() => {
    const basicsDone =
      hasText(basics?.name) ||
      hasText(basics?.headline) ||
      hasText(basics?.email) ||
      hasText(basics?.phone) ||
      hasText(basics?.location) ||
      (basics?.links?.some((l: any) => hasText(l?.label) || hasText(l?.url)) ?? false);

    const summaryDone = hasText(summary);
    const skillsDone = (skills as string[]).some((s) => hasText(s));

    const expDone =
      (experience as any[]).some(
        (e) =>
          hasText(e?.company) ||
          hasText(e?.role) ||
          hasText(e?.location) ||
          hasText(e?.start) ||
          hasText(e?.end) ||
          hasText(e?.description) ||
          (e?.bullets?.some((b: any) => hasText(b)) ?? false)
      ) || false;

    const eduDone =
      (education as any[]).some(
        (e) =>
          hasText(e?.school) ||
          hasText(e?.program) ||
          hasText(e?.start) ||
          hasText(e?.end) ||
          hasText(e?.details)
      ) || false;

    const projDone =
      (projects as any[]).some(
        (p) =>
          hasText(p?.name) ||
          hasText(p?.link) ||
          hasText(p?.description) ||
          (p?.bullets?.some((b: any) => hasText(b)) ?? false)
      ) || false;

    const certDone =
      (certifications as any[]).some(
        (c) => hasText(c?.name) || hasText(c?.issuer) || hasText(c?.year)
      ) || false;

    const extrasDone =
      (extras?.languages?.some((l: any) => hasText(l)) ?? false) ||
      (extras?.interests?.some((i: any) => hasText(i)) ?? false);

    return {
      basics: basicsDone ? ('done' as const) : ('missing' as const),
      summary: summaryDone ? ('done' as const) : ('missing' as const),
      skills: skillsDone ? ('done' as const) : ('missing' as const),
      experience: expDone ? ('done' as const) : ('missing' as const),
      education: eduDone ? ('done' as const) : ('missing' as const),
      projects: projDone ? ('done' as const) : ('missing' as const),
      certifications: certDone ? ('done' as const) : ('missing' as const),
      extras: extrasDone ? ('done' as const) : ('missing' as const),
    };
  }, [basics, summary, skills, experience, education, projects, certifications, extras]);

  const statusTitle = (k: keyof typeof statuses) =>
    statuses[k] === 'done'
      ? 'You’ve entered some data here.'
      : 'Nothing entered yet — you can hide or clear this section if you don’t need it.';

  const collapsedPreviews = useMemo(() => {
    const basicsHeadline = [basics?.name?.trim(), basics?.headline?.trim()]
      .filter(Boolean)
      .join(' · ');
    const firstSummaryLine = (summary || '').replace(/\s+/g, ' ').trim();

    return {
      basics: basicsHeadline || 'Add your name and headline to personalize your CV.',
      photo: basicsPhotoUrl ? 'Photo uploaded' : 'No photo yet',
      summary: firstSummaryLine ? firstSummaryLine.slice(0, 80) : 'No summary yet',
      skills:
        (skills as string[]).length > 0
          ? formatCountLabel((skills as string[]).length, 'skill')
          : 'No skills yet',
      experience:
        experienceField.fields.length > 0
          ? formatCountLabel(experienceField.fields.length, 'entry')
          : 'No experience entries',
      education:
        educationField.fields.length > 0
          ? formatCountLabel(educationField.fields.length, 'entry')
          : 'No education entries',
      projects:
        projectsField.fields.length > 0
          ? formatCountLabel(projectsField.fields.length, 'project')
          : 'No projects yet',
      certifications:
        certificationsField.fields.length > 0
          ? formatCountLabel(certificationsField.fields.length, 'certification')
          : 'No certifications yet',
      extras:
        extras?.languages?.length || extras?.interests?.length
          ? `${formatCountLabel(extras?.languages?.length || 0, 'language')} · ${formatCountLabel(
              extras?.interests?.length || 0,
              'interest'
            )}`
          : 'No languages or interests yet',
    };
  }, [
    basics?.headline,
    basics?.name,
    basicsPhotoUrl,
    certificationsField.fields.length,
    educationField.fields.length,
    experienceField.fields.length,
    extras?.interests?.length,
    extras?.languages?.length,
    projectsField.fields.length,
    skills,
    summary,
  ]);

  useEffect(() => {
    if (open.summary) return;
    const basicsComplete = statuses.basics === 'done';
    const summaryEmpty = statuses.summary === 'missing';
    if (basicsComplete && summaryEmpty) {
      setOpen((prev) => ({ ...prev, summary: true }));
    }
  }, [open.summary, statuses.basics, statuses.summary]);

  const preloadFromDemo = (opts?: { markDirty?: boolean }) => {
    const markDirty = opts?.markDirty ?? true;
    const current = getValues();

    setValue('meta.isDemoSeeded' as any, true, {
      shouldDirty: markDirty,
      shouldTouch: false,
      shouldValidate: false,
    });
    setValue('meta.hasImportedCv' as any, false, {
      shouldDirty: markDirty,
      shouldTouch: false,
      shouldValidate: false,
    });

    setValue('title', current.title?.trim() ? current.title : demoResume.title, {
      shouldDirty: markDirty,
      shouldTouch: false,
      shouldValidate: false,
    });

    setValue(
      'basics',
      {
        ...demoResume.basics,
        links: current.basics?.links ?? demoResume.basics.links,
      } as any,
      {
        shouldDirty: markDirty,
        shouldTouch: false,
        shouldValidate: false,
      }
    );

    setValue('summary', demoResume.summary as any, {
      shouldDirty: markDirty,
      shouldTouch: false,
      shouldValidate: false,
    });

    setValue('richText.summary' as any, demoResume.summary as any, {
      shouldDirty: markDirty,
      shouldTouch: false,
      shouldValidate: false,
    });

    setValue('skills', demoResume.skills as any, {
      shouldDirty: markDirty,
      shouldTouch: false,
      shouldValidate: false,
    });

    setValue('extras', demoResume.extras as any, {
      shouldDirty: markDirty,
      shouldTouch: false,
      shouldValidate: false,
    });

    setValue(
      'sectionOrder',
      normalizeSectionOrder(
        current.sectionOrder?.length ? current.sectionOrder : (demoResume.sectionOrder as any)
      ) as any,
      { shouldDirty: markDirty, shouldTouch: false, shouldValidate: false }
    );

    setValue(
      'sectionVisibility',
      normalizeSectionVisibility(
        current.sectionVisibility
          ? current.sectionVisibility
          : (demoResume.sectionVisibility as any)
      ) as any,
      { shouldDirty: markDirty, shouldTouch: false, shouldValidate: false }
    );

    linksField.replace((demoResume.basics.links as any) || []);
    experienceField.replace(normalizeExperienceItems(demoResume.experience as any[]) as any);
    educationField.replace((demoResume.education as any) || []);
    projectsField.replace((demoResume.projects as any) || []);
    certificationsField.replace((demoResume.certifications as any) || []);
    setExperienceRenderKey((k) => k + 1);
  };

  useEffect(() => {
    if (didAutoPreloadRef.current || hasAppliedUpload) return;

    const current = getValues();
    const hasUser = hasAnyUserData(current);

    if (!hasUser) {
      didAutoPreloadRef.current = true;
      setTimeout(() => {
        preloadFromDemo({ markDirty: false });
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAppliedUpload]);

  const clearAllContent = () => {
    setValue('title', '', { shouldDirty: true });
    setValue('meta.isDemoSeeded' as any, false, { shouldDirty: true });
    setValue('meta.hasImportedCv' as any, false, { shouldDirty: true });

    setValue(
      'basics',
      {
        ...demoResume.basics,
        name: '',
        headline: '',
        email: '',
        phone: '',
        location: '',
        links: [],
      } as any,
      { shouldDirty: true }
    );
    linksField.replace([] as any);

    setValue('summary', '', { shouldDirty: true });
    setValue('richText.summary' as any, '', { shouldDirty: true });
    setValue('skills', [], { shouldDirty: true });

    experienceField.replace([] as any);
    educationField.replace([] as any);
    projectsField.replace([] as any);
    certificationsField.replace([] as any);
    setExperienceRenderKey((k) => k + 1);

    setValue('extras', { languages: [], interests: [] } as any, { shouldDirty: true });

    const nextVis: Record<CvSectionKey, boolean> = {
      summary: false,
      skills: false,
      experience: false,
      education: false,
      projects: false,
      certifications: false,
      extras: false,
    };
    setValue('sectionVisibility', normalizeSectionVisibility(nextVis) as any, {
      shouldDirty: true,
    });
  };

  const clearSection = (key: CvSectionKey | 'basics') => {
    if (key === 'basics') {
      setValue('basics.name', '', { shouldDirty: true, shouldTouch: true });
      setValue('basics.headline', '', { shouldDirty: true, shouldTouch: true });
      setValue('basics.email', '', { shouldDirty: true, shouldTouch: true });
      setValue('basics.phone', '', { shouldDirty: true, shouldTouch: true });
      setValue('basics.location', '', { shouldDirty: true, shouldTouch: true });
      linksField.replace([] as any);
      setValue('basics.links', [] as any, { shouldDirty: true, shouldTouch: true });
      return;
    }

    switch (key) {
      case 'summary':
        setValue('summary', '', { shouldDirty: true, shouldTouch: true });
        setValue('richText.summary' as any, '', { shouldDirty: true, shouldTouch: true });
        break;
      case 'skills':
        setValue('skills', [], { shouldDirty: true, shouldTouch: true });
        break;
      case 'experience':
        experienceField.replace([] as any);
        setValue('experience', [] as any, { shouldDirty: true, shouldTouch: true });
        setExperienceRenderKey((k) => k + 1);
        break;
      case 'education':
        educationField.replace([] as any);
        setValue('education', [] as any, { shouldDirty: true, shouldTouch: true });
        break;
      case 'projects':
        projectsField.replace([] as any);
        setValue('projects', [] as any, { shouldDirty: true, shouldTouch: true });
        break;
      case 'certifications':
        certificationsField.replace([] as any);
        setValue('certifications', [] as any, { shouldDirty: true, shouldTouch: true });
        break;
      case 'extras':
        setValue('extras.languages', [] as any, { shouldDirty: true, shouldTouch: true });
        setValue('extras.interests', [] as any, { shouldDirty: true, shouldTouch: true });
        break;
    }
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    const next = Array.from(new Set([...(skills as string[]), trimmed]));
    setValue('skills', next as any, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    const next = (skills as string[]).filter((item) => item !== skill);
    setValue('skills', next as any, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  };

  const isSameAsDemo = (path: string, value: any) => {
    const demoValue = path
      .split('.')
      .reduce((acc: any, part) => (acc ? acc[part] : undefined), demoResume as any);
    return JSON.stringify(demoValue ?? null) === JSON.stringify(value ?? null);
  };

  const isMeaningful = (value: any) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return Boolean(value);
  };

  const chooseField = (
    path: string,
    existing: any,
    incoming: any,
    mode: 'merge' | 'replace',
    isDemoSeeded: boolean
  ) => {
    if (mode === 'replace') return incoming;

    const incomingMeaningful = isMeaningful(incoming);
    if (!incomingMeaningful) return existing;

    const existingMeaningful = isMeaningful(existing);
    if (!existingMeaningful) return incoming;

    const existingFromDemo = isDemoSeeded && isSameAsDemo(path, existing);
    return existingFromDemo ? incoming : existing;
  };

  const applyExtractedToForm = (extracted: Partial<CvDraft>, mode: 'merge' | 'replace') => {
    const current = getValues();
    const isDemoSeeded = Boolean(current.meta?.isDemoSeeded);

    debugCvImport('FORM_APPLY_PAYLOAD', { mode, extracted, current });

    const choose = (path: string, existing: any, incoming: any) =>
      chooseField(path, existing, incoming, mode, isDemoSeeded);

    const chooseImportedArray = <T,>(existing: T[] = [], incoming: T[] = []) => {
      return incoming.length ? incoming : existing;
    };

    const nextBasics = {
      ...current.basics,
      name: choose('basics.name', current.basics?.name, extracted.basics?.name || ''),
      headline: choose(
        'basics.headline',
        current.basics?.headline,
        extracted.basics?.headline || ''
      ),
      email: choose('basics.email', current.basics?.email, extracted.basics?.email || ''),
      phone: choose('basics.phone', current.basics?.phone, extracted.basics?.phone || ''),
      location: choose(
        'basics.location',
        current.basics?.location,
        extracted.basics?.location || ''
      ),
      links: choose('basics.links', current.basics?.links || [], extracted.basics?.links || []),
    };

    const nextSummary = choose('summary', current.summary || '', extracted.summary || '');

    const nextSkills =
      mode === 'replace'
        ? extracted.skills || []
        : Array.from(
            new Set([...(choose('skills', current.skills || [], extracted.skills || []) || [])])
          );

    const nextExperience = normalizeExperienceItems(
      chooseImportedArray(current.experience || [], extracted.experience || [])
    ) as any[];

    const nextEducation = chooseImportedArray(
      current.education || [],
      extracted.education || []
    ) as any[];

    const nextProjects = chooseImportedArray(
      current.projects || [],
      extracted.projects || []
    ) as any[];

    const nextCertifications = chooseImportedArray(
      current.certifications || [],
      extracted.certifications || []
    ) as any[];

    const nextLanguages = choose(
      'extras.languages',
      current.extras?.languages || [],
      extracted.extras?.languages || []
    );

    const nextInterests = choose(
      'extras.interests',
      current.extras?.interests || [],
      extracted.extras?.interests || []
    );

    const nextVisibility = normalizeSectionVisibility(current.sectionVisibility);

    const extractedHas = {
      summary: Boolean((extracted.summary || '').trim()),
      skills: Boolean(extracted.skills?.length),
      experience: Boolean(extracted.experience?.length),
      education: Boolean(extracted.education?.length),
      projects: Boolean(extracted.projects?.length),
      certifications: Boolean(extracted.certifications?.length),
      extras: Boolean(extracted.extras?.languages?.length || extracted.extras?.interests?.length),
    };

    (Object.keys(extractedHas) as CvSectionKey[]).forEach((key) => {
      if (mode === 'replace') nextVisibility[key] = extractedHas[key];
      else if (extractedHas[key]) nextVisibility[key] = true;
    });

    const suggestedTitle =
      !current.title?.trim() || (isDemoSeeded && isSameAsDemo('title', current.title))
        ? `${(extracted.basics?.name || nextBasics.name || 'My CV').trim()} CV`
        : current.title;

    const nextDraft: CvDraft = {
      ...current,
      title: suggestedTitle,
      basics: nextBasics,
      summary: nextSummary,
      skills: nextSkills,
      experience: nextExperience,
      education: nextEducation,
      projects: nextProjects,
      certifications: nextCertifications,
      extras: {
        languages: nextLanguages || [],
        interests: nextInterests || [],
      },
      richText: {
        ...(current.richText || {}),
        summary: nextSummary || '',
      },
      sectionOrder: normalizeSectionOrder(current.sectionOrder),
      sectionVisibility: normalizeSectionVisibility(nextVisibility),
      meta: {
        ...(current.meta || {}),
        isDemoSeeded: false,
        hasImportedCv: true,
        importedAt: new Date().toISOString(),
        importMode: mode,
      },
    };

    debugCvImport('FORM_APPLY_NEXT_DRAFT', nextDraft);
    debugCvImport('FORM_APPLY_NEXT_EXPERIENCE', nextExperience);

    reset(nextDraft, {
      keepDefaultValues: false,
    });

    setTimeout(() => {
      linksField.replace((nextDraft.basics?.links || []) as any);
      experienceField.replace((nextDraft.experience || []) as any);
      educationField.replace((nextDraft.education || []) as any);
      projectsField.replace((nextDraft.projects || []) as any);
      certificationsField.replace((nextDraft.certifications || []) as any);
      setExperienceRenderKey((k) => k + 1);

      debugCvImport('POST_RESET_EXPERIENCE_VALUES', {
        watched: normalizeExperienceItems(getValues('experience') as any[]),
        replacingWith: nextDraft.experience,
      });

      requestAnimationFrame(() => {
        debugCvImport('POST_RESET_EXPERIENCE_FIELDS', {
          fieldArrayLength: experienceField.fields.length,
          getValuesExperience: normalizeExperienceItems(getValues('experience') as any[]),
        });
      });
    }, 0);

    didAutoPreloadRef.current = true;
    setHasAppliedUpload(true);
    setOpen((prev) => ({
      ...prev,
      basics: true,
      summary:
        Boolean(nextBasics.name?.trim() || nextBasics.headline?.trim()) &&
        !Boolean(nextSummary?.trim()),
      experience: Boolean(nextExperience.length),
      education: false,
      projects: false,
      certifications: false,
      skills: false,
      extras: false,
      photo: false,
    }));
  };

  const onExtractCv = async () => {
    if (!backendUrl || !cvFile) return;

    setParseState('loading');
    setParseError(null);
    setParsedPreview(null);

    try {
      const parsed = await parseUploadedCv({ backendUrl, token, file: cvFile, mode: uploadMode });
      const extracted = parsed.extracted || null;

      if (extracted && looksLikePdfJunk(extracted)) {
        throw new Error(
          'Extraction output appears corrupted. Please retry with a text-based PDF or DOCX.'
        );
      }

      setParsedPreview(extracted);
      setDiagnostics(parsed.diagnostics || null);

      debugCvImport('PARSED_EXTRACTED_PRE_APPLY', extracted);

      if (extracted) {
        setImportUndoSnapshot(getValues() as CvDraft);
        applyExtractedToForm(extracted, uploadMode);
      }

      setParseState('success');
    } catch (err: any) {
      setParseError(err?.response?.data?.error || err?.message || 'Failed to parse CV');
      setParseState('error');
    }
  };

  const includePill = (key: CvSectionKey) => (
    <button
      type="button"
      onClick={() => setSectionVisible(key, !sectionVisibility?.[key])}
      className={sectionVisibility?.[key] ? pillPrimary : pillGray}
      title={sectionVisibility?.[key] ? 'Section included in CV' : 'Section hidden from CV'}
    >
      {sectionVisibility?.[key] ? 'Included' : 'Hidden'}
    </button>
  );

  const clearPill = (key: CvSectionKey | 'basics') => (
    <button type="button" onClick={() => clearSection(key)} className={pillDanger}>
      Clear
    </button>
  );

  const topActions = useMemo(
    () => (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Quick setup
            </p>
            <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              Build fast, then remove what you don’t need
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-white/60">
              Sample content loads by default. Importing a CV now replaces sample values
              automatically.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => preloadFromDemo({ markDirty: true })}
              className={pillPrimary}
            >
              Start from demo
            </button>
            <button type="button" onClick={clearAllContent} className={pillDanger}>
              Clear all
            </button>
          </div>
        </div>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const normalizeBulletLines = (items: string[] = []) =>
    Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean))).slice(
      0,
      12
    );

  const improveSingleExperience = async (index: number) => {
    if (!backendUrl || !token) return;

    const entry = getValues(`experience.${index}` as const);
    if (!entry) return;

    setExperienceAiError(null);
    setImprovingExperienceIndex(index);

    try {
      const res = await improveExperienceEntry({
        backendUrl,
        token,
        experience: {
          company: entry.company || '',
          role: entry.role || '',
          start: entry.start || '',
          end: entry.end || '',
          location: entry.location || '',
          description: entry.description || '',
          bullets: Array.isArray(entry.bullets) ? entry.bullets : [],
        },
        wholeCvContext: {
          summary: getValues('summary') || '',
          skills: getValues('skills') || [],
        },
      });

      const improved = res?.improved;
      if (!improved) throw new Error('No improved experience was returned.');

      setValue(`experience.${index}.description`, improved.description || '', {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });

      setValue(`experience.${index}.bullets`, normalizeBulletLines(improved.bullets || []), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });

      setOpen((prev) => ({ ...prev, experience: true }));
    } catch (err: any) {
      setExperienceAiError(
        err?.response?.data?.error || err?.message || 'Failed to improve experience entry.'
      );
    } finally {
      setImprovingExperienceIndex(null);
    }
  };

  const improveAllExperience = async () => {
    if (!backendUrl || !token) return;

    const items = (getValues('experience') || []) as any[];
    if (!items.length) return;

    setExperienceAiError(null);
    setImprovingAllExperience(true);

    try {
      for (let index = 0; index < items.length; index += 1) {
        const entry = getValues(`experience.${index}` as const);
        if (!entry) continue;

        const hasContent =
          hasText(entry.company) ||
          hasText(entry.role) ||
          hasText(entry.description) ||
          (Array.isArray(entry.bullets) && entry.bullets.some((b: string) => hasText(b)));

        if (!hasContent) continue;

        const res = await improveExperienceEntry({
          backendUrl,
          token,
          experience: {
            company: entry.company || '',
            role: entry.role || '',
            start: entry.start || '',
            end: entry.end || '',
            location: entry.location || '',
            description: entry.description || '',
            bullets: Array.isArray(entry.bullets) ? entry.bullets : [],
          },
          wholeCvContext: {
            summary: getValues('summary') || '',
            skills: getValues('skills') || [],
          },
        });

        const improved = res?.improved;
        if (!improved) continue;

        setValue(`experience.${index}.description`, improved.description || '', {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        });

        setValue(`experience.${index}.bullets`, normalizeBulletLines(improved.bullets || []), {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        });
      }

      setOpen((prev) => ({ ...prev, experience: true }));
    } catch (err: any) {
      setExperienceAiError(
        err?.response?.data?.error || err?.message || 'Failed to improve all experience entries.'
      );
    } finally {
      setImprovingAllExperience(false);
    }
  };

  const onPickPhoto = () => {
    photoInputRef.current?.click();
  };

  const onUploadPhoto = async (file?: File | null) => {
    if (!file) return;
    if (!backendUrl || !token) {
      setPhotoUploadState('error');
      setPhotoUploadError('Sign in again to upload your image.');
      return;
    }

    setPhotoUploadState('uploading');
    setPhotoUploadError(null);

    try {
      const uploadedUrl = await uploadAsset(backendUrl, token, file, 'image');
      setValue('basics.photoUrl', uploadedUrl, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
      setPhotoUploadState('idle');
    } catch (err: any) {
      setPhotoUploadState('error');
      setPhotoUploadError(err?.message || 'Image upload failed. Please try again.');
    }
  };

  const removePhoto = () => {
    setValue('basics.photoUrl', '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
    setPhotoUploadError(null);
    setPhotoUploadState('idle');
  };

  return (
    <div className="space-y-6">
      {topActions}

      <SectionCard
        title="Upload your existing CV"
        subtitle="Upload PDF/DOCX and we’ll auto-fill the form."
        isOpen
        collapsible={false}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"
              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              className="text-xs"
            />
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={uploadMode === 'merge'}
                onChange={(e) => setUploadMode(e.target.checked ? 'merge' : 'replace')}
              />
              Merge into existing data (recommended)
            </label>
            <button
              type="button"
              disabled={!cvFile || parseState === 'loading'}
              onClick={onExtractCv}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {parseState === 'loading' ? 'Uploading & parsing...' : 'Extract details'}
            </button>
          </div>

          {parseState === 'error' && parseError ? (
            <p className="text-xs text-rose-600">{parseError}</p>
          ) : null}

          {parseState === 'success' && parsedPreview ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <p>
                <b>Name:</b> {parsedPreview.basics?.name || '—'}
              </p>
              <p>
                <b>Headline:</b> {parsedPreview.basics?.headline || '—'}
              </p>
              <p>
                <b>Email / Phone:</b> {parsedPreview.basics?.email || '—'} /{' '}
                {parsedPreview.basics?.phone || '—'}
              </p>
              <p>
                <b>Location:</b> {parsedPreview.basics?.location || '—'}
              </p>
              <p className="mt-2">
                <b>Counts:</b> skills {parsedPreview.skills?.length || 0} · experience{' '}
                {parsedPreview.experience?.length || 0} · education{' '}
                {parsedPreview.education?.length || 0} · projects{' '}
                {parsedPreview.projects?.length || 0} · certs{' '}
                {parsedPreview.certifications?.length || 0}
              </p>
              {diagnostics?.warnings?.length ? (
                <ul className="mt-2 list-disc pl-5">
                  {diagnostics.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex gap-2">
                <span className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                  Imported details applied
                </span>
                <button
                  type="button"
                  disabled={!importUndoSnapshot}
                  onClick={() => {
                    if (importUndoSnapshot) {
                      reset(importUndoSnapshot);
                      setHasAppliedUpload(Boolean(importUndoSnapshot.meta?.hasImportedCv));
                      setImportUndoSnapshot(null);
                      setExperienceRenderKey((k) => k + 1);
                    }
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50"
                >
                  Undo import
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Basics"
        subtitle="Your name, contact info, links."
        collapsedPreview={collapsedPreviews.basics}
        isOpen={open.basics}
        onToggle={() => toggle('basics')}
        status={statuses.basics}
        statusTitle={statusTitle('basics')}
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">{clearPill('basics')}</div>
        }
      >
        <input type="hidden" {...register('title')} />
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Full name" {...register('basics.name')} />
          <Input placeholder="Professional headline" {...register('basics.headline')} />
          <Input placeholder="Email" type="email" {...register('basics.email')} />
          <Input placeholder="Phone" {...register('basics.phone')} />
          <Input placeholder="Location" {...register('basics.location')} />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-white/60">
              Links
            </p>
            <button
              type="button"
              onClick={() => linksField.append({ label: '', url: '' } as any)}
              className="text-xs font-semibold text-primary"
            >
              + Add link
            </button>
          </div>

          {linksField.fields.length === 0 && (
            <p className="text-xs text-gray-400">Add portfolio, LinkedIn, GitHub, etc.</p>
          )}

          <div className="space-y-2">
            {linksField.fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto]">
                <Input placeholder="Label" {...register(`basics.links.${index}.label` as const)} />
                <Input placeholder="URL" {...register(`basics.links.${index}.url` as const)} />
                <button
                  type="button"
                  onClick={() => linksField.remove(index)}
                  className="text-xs text-gray-400 hover:text-rose-500"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {isModernBlueSidebar ? (
        <SectionCard
          title="Profile Photo"
          subtitle="Shown only in Modern Blue Sidebar."
          collapsedPreview={collapsedPreviews.photo}
          isOpen={open.photo ?? true}
          onToggle={() => toggle('photo')}
          status={basicsPhotoUrl ? 'done' : 'missing'}
          statusTitle={basicsPhotoUrl ? 'Photo added to your profile.' : 'No photo uploaded yet.'}
        >
          <div className="space-y-3">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                void onUploadPhoto(e.target.files?.[0] || null);
                e.currentTarget.value = '';
              }}
            />

            <div className="flex items-center gap-4 rounded-xl border border-gray-200 p-3 dark:border-white/10">
              <img
                src={basicsPhotoUrl || '/assets/profile_photo.png'}
                alt="Profile preview"
                className="h-24 w-20 rounded-md border border-gray-200 object-cover dark:border-white/15"
              />
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-white/60">
                  Upload a passport-style photo. PNG, JPG, JPEG, WEBP supported.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onPickPhoto}
                    disabled={photoUploadState === 'uploading'}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {photoUploadState === 'uploading'
                      ? 'Uploading...'
                      : basicsPhotoUrl
                        ? 'Replace photo'
                        : 'Upload photo'}
                  </button>
                  {basicsPhotoUrl ? (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                {photoUploadError ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{photoUploadError}</p>
                ) : null}
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Summary"
        subtitle="A short professional pitch."
        collapsedPreview={collapsedPreviews.summary}
        isOpen={open.summary}
        onToggle={() => toggle('summary')}
        status={statuses.summary}
        statusTitle={statusTitle('summary')}
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {includePill('summary')}
            {clearPill('summary')}
          </div>
        }
      >
        <RichTextField
          name="richText.summary"
          plainName="summary"
          placeholder="Write a professional summary (supports <strong>, <em>, <u>, color span)"
        />
      </SectionCard>

      <SectionCard
        title="Skills"
        subtitle="Add only what you want recruiters to see."
        collapsedPreview={collapsedPreviews.skills}
        isOpen={open.skills}
        onToggle={() => toggle('skills')}
        status={statuses.skills}
        statusTitle={statusTitle('skills')}
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {includePill('skills')}
            {clearPill('skills')}
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {(skills as string[]).map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-white"
            >
              {skill}
              <button type="button" onClick={() => removeSkill(skill)} className="text-[10px]">
                ✕
              </button>
            </span>
          ))}
          {(skills as string[]).length === 0 && (
            <span className="text-xs text-gray-400">No skills yet — add a few to start.</span>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            placeholder="Add a skill"
          />
          <button
            type="button"
            onClick={addSkill}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Experience"
        subtitle="Jobs, internships, freelance — keep it relevant."
        collapsedPreview={collapsedPreviews.experience}
        isOpen={open.experience}
        onToggle={() => toggle('experience')}
        status={statuses.experience}
        statusTitle={statusTitle('experience')}
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {includePill('experience')}
            {clearPill('experience')}
          </div>
        }
      >
        <div key={`experience-render-${experienceRenderKey}`} className="space-y-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-white/60">
              Add roles you want included. Remove the rest. You can improve duties with AI.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={improveAllExperience}
                disabled={improvingAllExperience || !experienceField.fields.length}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                {improvingAllExperience ? 'Improving all...' : 'Improve all with AI'}
              </button>

              <button
                type="button"
                onClick={() =>
                  experienceField.append({
                    company: '',
                    role: '',
                    start: '',
                    end: '',
                    location: '',
                    description: '',
                    bullets: [],
                  } as any)
                }
                className="text-xs font-semibold text-primary"
              >
                + Add experience
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-gray-200 p-2 text-[11px] text-gray-500 dark:border-white/10 dark:text-white/60">
            UI debug: watched={Array.isArray(experience) ? experience.length : 0} · fields=
            {experienceField.fields.length}
          </div>

          {experienceAiError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
              {experienceAiError}
            </div>
          ) : null}

          {experienceField.fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-gray-100 p-3 dark:border-white/10"
            >
              <div className="mb-2 text-[11px] text-gray-400">
                #{index + 1} · {String((field as any).company || '') || 'Untitled'}
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="Company"
                  {...register(`experience.${index}.company` as const)}
                />
                <Input placeholder="Role" {...register(`experience.${index}.role` as const)} />
                <Input placeholder="Start" {...register(`experience.${index}.start` as const)} />
                <Input placeholder="End" {...register(`experience.${index}.end` as const)} />
                <Input
                  placeholder="Location"
                  {...register(`experience.${index}.location` as const)}
                />
              </div>

              <div className="mt-3">
                <Textarea
                  placeholder="Short description"
                  {...register(`experience.${index}.description` as const)}
                />
              </div>

              <div className="mt-3">
                <BulletsField name={`experience.${index}.bullets`} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => improveSingleExperience(index)}
                  disabled={improvingExperienceIndex === index || improvingAllExperience}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {improvingExperienceIndex === index ? 'Improving...' : 'Improve duties with AI'}
                </button>

                <span className="text-[11px] text-gray-500 dark:text-white/60">
                  Rewrites description and bullets without changing the facts.
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  experienceField.remove(index);
                  setExperienceRenderKey((k) => k + 1);
                }}
                className="mt-2 text-xs text-gray-400 hover:text-rose-500"
              >
                Remove this role
              </button>
            </div>
          ))}

          {experienceField.fields.length === 0 && (
            <p className="text-xs text-gray-400">No experience entries yet.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Education"
        subtitle="School, degree, and anything worth mentioning."
        collapsedPreview={collapsedPreviews.education}
        isOpen={open.education}
        onToggle={() => toggle('education')}
        status={statuses.education}
        statusTitle={statusTitle('education')}
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {includePill('education')}
            {clearPill('education')}
          </div>
        }
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-white/60">Remove entries you don’t want.</p>
          <button
            type="button"
            onClick={() =>
              educationField.append({
                school: '',
                program: '',
                start: '',
                end: '',
                details: '',
              } as any)
            }
            className="text-xs font-semibold text-primary"
          >
            + Add education
          </button>
        </div>

        <div className="space-y-4">
          {educationField.fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-gray-100 p-3 dark:border-white/10"
            >
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="School" {...register(`education.${index}.school` as const)} />
                <Input placeholder="Program" {...register(`education.${index}.program` as const)} />
                <Input placeholder="Start" {...register(`education.${index}.start` as const)} />
                <Input placeholder="End" {...register(`education.${index}.end` as const)} />
              </div>
              <div className="mt-3">
                <Textarea
                  placeholder="Details"
                  {...register(`education.${index}.details` as const)}
                />
              </div>
              <button
                type="button"
                onClick={() => educationField.remove(index)}
                className="mt-2 text-xs text-gray-400 hover:text-rose-500"
              >
                Remove this education
              </button>
            </div>
          ))}
          {educationField.fields.length === 0 && (
            <p className="text-xs text-gray-400">No education entries yet.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Projects"
        subtitle="Side projects, work projects, open source."
        collapsedPreview={collapsedPreviews.projects}
        isOpen={open.projects}
        onToggle={() => toggle('projects')}
        status={statuses.projects}
        statusTitle={statusTitle('projects')}
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {includePill('projects')}
            {clearPill('projects')}
          </div>
        }
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-white/60">
            Add projects that strengthen the story.
          </p>
          <button
            type="button"
            onClick={() =>
              projectsField.append({ name: '', link: '', description: '', bullets: [] } as any)
            }
            className="text-xs font-semibold text-primary"
          >
            + Add project
          </button>
        </div>

        <div className="space-y-4">
          {projectsField.fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-gray-100 p-3 dark:border-white/10"
            >
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="Project name"
                  {...register(`projects.${index}.name` as const)}
                />
                <Input placeholder="Link" {...register(`projects.${index}.link` as const)} />
              </div>
              <div className="mt-3">
                <Textarea
                  placeholder="Short description"
                  {...register(`projects.${index}.description` as const)}
                />
              </div>
              <div className="mt-3">
                <BulletsField name={`projects.${index}.bullets`} />
              </div>
              <button
                type="button"
                onClick={() => projectsField.remove(index)}
                className="mt-2 text-xs text-gray-400 hover:text-rose-500"
              >
                Remove this project
              </button>
            </div>
          ))}
          {projectsField.fields.length === 0 && (
            <p className="text-xs text-gray-400">No projects yet.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Certifications"
        subtitle="Only include what helps for the role."
        collapsedPreview={collapsedPreviews.certifications}
        isOpen={open.certifications}
        onToggle={() => toggle('certifications')}
        status={statuses.certifications}
        statusTitle={statusTitle('certifications')}
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {includePill('certifications')}
            {clearPill('certifications')}
          </div>
        }
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-white/60">Remove any you don’t want.</p>
          <button
            type="button"
            onClick={() => certificationsField.append({ name: '', issuer: '', year: '' } as any)}
            className="text-xs font-semibold text-primary"
          >
            + Add certification
          </button>
        </div>

        <div className="space-y-4">
          {certificationsField.fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-gray-100 p-3 dark:border-white/10"
            >
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Certification"
                  {...register(`certifications.${index}.name` as const)}
                />
                <Input
                  placeholder="Issuer"
                  {...register(`certifications.${index}.issuer` as const)}
                />
                <Input placeholder="Year" {...register(`certifications.${index}.year` as const)} />
              </div>
              <button
                type="button"
                onClick={() => certificationsField.remove(index)}
                className="mt-2 text-xs text-gray-400 hover:text-rose-500"
              >
                Remove this certification
              </button>
            </div>
          ))}
          {certificationsField.fields.length === 0 && (
            <p className="text-xs text-gray-400">No certifications yet.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Extras"
        subtitle="Languages + interests (optional)."
        collapsedPreview={collapsedPreviews.extras}
        isOpen={open.extras}
        onToggle={() => toggle('extras')}
        status={statuses.extras}
        statusTitle={statusTitle('extras')}
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {includePill('extras')}
            {clearPill('extras')}
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <CsvListField name="extras.languages" label="Languages" />
          <CsvListField name="extras.interests" label="Interests" />
        </div>
      </SectionCard>
    </div>
  );
};

export default CvForm;
