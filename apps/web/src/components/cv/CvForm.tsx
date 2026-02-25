import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useFormContext, Controller, useWatch } from 'react-hook-form';
import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';
import { demoResume, hasAnyUserData } from '../../templates/demoResume';
import { stripHtml } from '../../utils/cvRichText';

// ✅ forwardRef so react-hook-form can register inputs correctly
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input {...props} ref={ref} className={`input ${className ?? ''}`} />
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea {...props} ref={ref} className={`input min-h-[90px] ${className ?? ''}`} />
  )
);
Textarea.displayName = 'Textarea';

const RichTextField: React.FC<{ name: string; plainName?: keyof CvDraft; placeholder?: string }> = ({
  name,
  plainName,
  placeholder,
}) => {
  const { setValue, watch } = useFormContext<CvDraft>();
  const value = (watch(name as any) as string) || '';

  const applyWrap = (tag: 'strong' | 'em' | 'u') => {
    const next = `${value}<${tag}>`;
    setValue(name as any, next, { shouldDirty: true, shouldTouch: true });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs">
        <button type="button" className="rounded border px-2 py-1" onClick={() => applyWrap('strong')}>Bold</button>
        <button type="button" className="rounded border px-2 py-1" onClick={() => applyWrap('em')}>Italic</button>
        <button type="button" className="rounded border px-2 py-1" onClick={() => applyWrap('u')}>Underline</button>
      </div>
      <Textarea
        value={value}
        onChange={(e) => {
          const html = e.target.value;
          setValue(name as any, html, { shouldDirty: true, shouldTouch: true });
          if (plainName) {
            setValue(plainName as any, stripHtml(html), { shouldDirty: true, shouldTouch: true });
          }
        }}
        placeholder={placeholder || 'Use simple rich text tags like <strong>bold</strong> or <span style="color:#0ea5a5">color</span>'}
      />
    </div>
  );
};

const hasText = (v?: string | null) => Boolean(v && v.trim().length > 0);

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

const StatusPill: React.FC<{ status: SectionStatus; title?: string }> = ({ status, title }) => {
  const isDone = status === 'done';
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isDone
          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      <span className="leading-none">{isDone ? '✅' : '⚠'}</span>
      <span className="uppercase tracking-wide">{isDone ? 'Completed' : 'Missing'}</span>
    </span>
  );
};

type SectionCardProps = {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  right?: React.ReactNode;
  status?: SectionStatus;
  statusTitle?: string;
  children: React.ReactNode;
  className?: string;
};

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  isOpen,
  onToggle,
  right,
  status,
  statusTitle,
  children,
  className,
}) => (
  <div
    className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 ${className ?? ''}`}
  >
    <div className="flex items-start justify-between gap-3">
      <button type="button" onClick={onToggle} className="flex-1 text-left" aria-expanded={isOpen}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {isOpen ? 'Hide' : 'Show'}
          </span>
          {status ? <StatusPill status={status} title={statusTitle} /> : null}
        </div>
        {subtitle ? <p className="mt-1 text-xs text-gray-500 dark:text-white/60">{subtitle}</p> : null}
      </button>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>

    {isOpen ? <div className="mt-4">{children}</div> : null}
  </div>
);

const pillBtn =
  'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition';
const pillGray = `${pillBtn} border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80`;
const pillDanger = `${pillBtn} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`;
const pillPrimary = `${pillBtn} border-transparent bg-primary text-white hover:opacity-90`;

const CvForm: React.FC = () => {
  const { register, control, setValue, getValues } = useFormContext<CvDraft>();
  const [skillInput, setSkillInput] = useState('');

  // one-time guard so we don’t preload multiple times
  const didAutoPreloadRef = useRef(false);

  // Watch what we need for status + controls
  const basics = useWatch({ control, name: 'basics' });
  const summary = useWatch({ control, name: 'summary' });
  const skills = useWatch({ control, name: 'skills' }) || [];
  const experience = useWatch({ control, name: 'experience' }) || [];
  const education = useWatch({ control, name: 'education' }) || [];
  const projects = useWatch({ control, name: 'projects' }) || [];
  const certifications = useWatch({ control, name: 'certifications' }) || [];
  const extras = useWatch({ control, name: 'extras' });
  const sectionVisibility =
    useWatch({ control, name: 'sectionVisibility' }) || demoResume.sectionVisibility;

  // Field arrays (needed for replace() preload)
  const linksField = useFieldArray({ control, name: 'basics.links' });
  const experienceField = useFieldArray({ control, name: 'experience' });
  const educationField = useFieldArray({ control, name: 'education' });
  const projectsField = useFieldArray({ control, name: 'projects' });
  const certificationsField = useFieldArray({ control, name: 'certifications' });

  // UI: collapsed sections
  const [open, setOpen] = useState<Record<string, boolean>>({
    basics: true,
    summary: true,
    skills: true,
    experience: true,
    education: true,
    projects: true,
    certifications: true,
    extras: true,
  });
  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  const setSectionVisible = (key: CvSectionKey, visible: boolean) => {
    setValue(`sectionVisibility.${key}`, visible as any, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  };

  // ---------- Section status (✅ Completed / ⚠ Missing) ----------
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

  // ---------- Demo preload helper (supports "auto" vs "button") ----------
  const preloadFromDemo = (opts?: { markDirty?: boolean }) => {
    const markDirty = opts?.markDirty ?? true;
    const current = getValues();

    // Non-array fields
    setValue('title', current.title?.trim() ? current.title : demoResume.title, {
      shouldDirty: markDirty,
      shouldTouch: false,
      shouldValidate: false,
    });

    setValue(
      'basics',
      {
        ...demoResume.basics,
        // links handled via fieldArray.replace below
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
      current.sectionOrder?.length ? current.sectionOrder : (demoResume.sectionOrder as any),
      { shouldDirty: markDirty, shouldTouch: false, shouldValidate: false }
    );

    setValue(
      'sectionVisibility',
      current.sectionVisibility ? current.sectionVisibility : (demoResume.sectionVisibility as any),
      { shouldDirty: markDirty, shouldTouch: false, shouldValidate: false }
    );

    // ✅ Field arrays MUST use replace() so UI immediately reflects items
    linksField.replace((demoResume.basics.links as any) || []);
    experienceField.replace((demoResume.experience as any) || []);
    educationField.replace((demoResume.education as any) || []);
    projectsField.replace((demoResume.projects as any) || []);
    certificationsField.replace((demoResume.certifications as any) || []);
  };

  // ✅ AUTO: Start from demo by default (ONLY if user has no data)
  useEffect(() => {
    if (didAutoPreloadRef.current) return;

    const current = getValues();
    const hasUser = hasAnyUserData(current);

    if (!hasUser) {
      didAutoPreloadRef.current = true;

      // ✅ defer to next tick so field arrays are initialized before we replace()
      setTimeout(() => {
        preloadFromDemo({ markDirty: false });
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Clear helpers ----------
  const clearAllContent = () => {
    setValue('title', '', { shouldDirty: true });

    setValue(
      'basics',
      { ...demoResume.basics, name: '', headline: '', email: '', phone: '', location: '', links: [] } as any,
      { shouldDirty: true }
    );
    linksField.replace([] as any);

    setValue('summary', '', { shouldDirty: true });
    setValue('skills', [], { shouldDirty: true });

    experienceField.replace([] as any);
    educationField.replace([] as any);
    projectsField.replace([] as any);
    certificationsField.replace([] as any);

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
    setValue('sectionVisibility', nextVis as any, { shouldDirty: true });
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
        break;
      case 'skills':
        setValue('skills', [], { shouldDirty: true, shouldTouch: true });
        break;
      case 'experience':
        experienceField.replace([] as any);
        setValue('experience', [] as any, { shouldDirty: true, shouldTouch: true });
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

  // ---------- Skills helpers ----------
  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    const next = Array.from(new Set([...(skills as string[]), trimmed]));
    setValue('skills', next as any, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    const next = (skills as string[]).filter((item) => item !== skill);
    setValue('skills', next as any, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
  };

  // ---------- Pills ----------
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

  // ---------- Top helper banner ----------
  const topActions = useMemo(
    () => (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Quick setup</p>
            <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              Build fast, then remove what you don’t need
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-white/60">
              Demo content loads by default. Delete sections/items you don’t want. Preview updates instantly.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => preloadFromDemo({ markDirty: true })} className={pillPrimary}>
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

  return (
    <div className="space-y-6">
      {topActions}

      {/* BASICS */}
      <SectionCard
        title="Basics"
        subtitle="Your name, contact info, links."
        isOpen={open.basics}
        onToggle={() => toggle('basics')}
        status={statuses.basics}
        statusTitle={statusTitle('basics')}
        right={<div className="flex items-center gap-2">{clearPill('basics')}</div>}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="CV Title" {...register('title')} />
          <Input placeholder="Full name" {...register('basics.name')} />
          <Input placeholder="Professional headline" {...register('basics.headline')} />
          <Input placeholder="Email" type="email" {...register('basics.email')} />
          <Input placeholder="Phone" {...register('basics.phone')} />
          <Input placeholder="Location" {...register('basics.location')} />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-white/60">Links</p>
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

      {/* SUMMARY */}
      <SectionCard
        title="Summary"
        subtitle="A short professional pitch."
        isOpen={open.summary}
        onToggle={() => toggle('summary')}
        status={statuses.summary}
        statusTitle={statusTitle('summary')}
        right={
          <div className="flex items-center gap-2">
            {includePill('summary')}
            {clearPill('summary')}
          </div>
        }
      >
        <RichTextField name="richText.summary" plainName="summary" placeholder="Write a professional summary (supports <strong>, <em>, <u>, color span)" />
      </SectionCard>

      {/* SKILLS */}
      <SectionCard
        title="Skills"
        subtitle="Add only what you want recruiters to see."
        isOpen={open.skills}
        onToggle={() => toggle('skills')}
        status={statuses.skills}
        statusTitle={statusTitle('skills')}
        right={
          <div className="flex items-center gap-2">
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
          <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Add a skill" />
          <button
            type="button"
            onClick={addSkill}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>
      </SectionCard>

      {/* EXPERIENCE */}
      <SectionCard
        title="Experience"
        subtitle="Jobs, internships, freelance — keep it relevant."
        isOpen={open.experience}
        onToggle={() => toggle('experience')}
        status={statuses.experience}
        statusTitle={statusTitle('experience')}
        right={
          <div className="flex items-center gap-2">
            {includePill('experience')}
            {clearPill('experience')}
          </div>
        }
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-white/60">Add roles you want included. Remove the rest.</p>
          <button
            type="button"
            onClick={() =>
              experienceField.append({ company: '', role: '', start: '', end: '', location: '', bullets: [] } as any)
            }
            className="text-xs font-semibold text-primary"
          >
            + Add experience
          </button>
        </div>

        <div className="space-y-4">
          {experienceField.fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-gray-100 p-3 dark:border-white/10">
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Company" {...register(`experience.${index}.company` as const)} />
                <Input placeholder="Role" {...register(`experience.${index}.role` as const)} />
                <Input placeholder="Start" {...register(`experience.${index}.start` as const)} />
                <Input placeholder="End" {...register(`experience.${index}.end` as const)} />
                <Input placeholder="Location" {...register(`experience.${index}.location` as const)} />
              </div>
              <div className="mt-3">
                <BulletsField name={`experience.${index}.bullets`} />
              </div>
              <button
                type="button"
                onClick={() => experienceField.remove(index)}
                className="mt-2 text-xs text-gray-400 hover:text-rose-500"
              >
                Remove this role
              </button>
            </div>
          ))}
          {experienceField.fields.length === 0 && <p className="text-xs text-gray-400">No experience entries yet.</p>}
        </div>
      </SectionCard>

      {/* EDUCATION */}
      <SectionCard
        title="Education"
        subtitle="School, degree, and anything worth mentioning."
        isOpen={open.education}
        onToggle={() => toggle('education')}
        status={statuses.education}
        statusTitle={statusTitle('education')}
        right={
          <div className="flex items-center gap-2">
            {includePill('education')}
            {clearPill('education')}
          </div>
        }
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-white/60">Remove entries you don’t want.</p>
          <button
            type="button"
            onClick={() => educationField.append({ school: '', program: '', start: '', end: '', details: '' } as any)}
            className="text-xs font-semibold text-primary"
          >
            + Add education
          </button>
        </div>

        <div className="space-y-4">
          {educationField.fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-gray-100 p-3 dark:border-white/10">
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="School" {...register(`education.${index}.school` as const)} />
                <Input placeholder="Program" {...register(`education.${index}.program` as const)} />
                <Input placeholder="Start" {...register(`education.${index}.start` as const)} />
                <Input placeholder="End" {...register(`education.${index}.end` as const)} />
              </div>
              <div className="mt-3">
                <Textarea placeholder="Details" {...register(`education.${index}.details` as const)} />
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
          {educationField.fields.length === 0 && <p className="text-xs text-gray-400">No education entries yet.</p>}
        </div>
      </SectionCard>

      {/* PROJECTS */}
      <SectionCard
        title="Projects"
        subtitle="Side projects, work projects, open source."
        isOpen={open.projects}
        onToggle={() => toggle('projects')}
        status={statuses.projects}
        statusTitle={statusTitle('projects')}
        right={
          <div className="flex items-center gap-2">
            {includePill('projects')}
            {clearPill('projects')}
          </div>
        }
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-white/60">Add projects that strengthen the story.</p>
          <button
            type="button"
            onClick={() => projectsField.append({ name: '', link: '', description: '', bullets: [] } as any)}
            className="text-xs font-semibold text-primary"
          >
            + Add project
          </button>
        </div>

        <div className="space-y-4">
          {projectsField.fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-gray-100 p-3 dark:border-white/10">
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Project name" {...register(`projects.${index}.name` as const)} />
                <Input placeholder="Link" {...register(`projects.${index}.link` as const)} />
              </div>
              <div className="mt-3">
                <Textarea placeholder="Short description" {...register(`projects.${index}.description` as const)} />
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
          {projectsField.fields.length === 0 && <p className="text-xs text-gray-400">No projects yet.</p>}
        </div>
      </SectionCard>

      {/* CERTIFICATIONS */}
      <SectionCard
        title="Certifications"
        subtitle="Only include what helps for the role."
        isOpen={open.certifications}
        onToggle={() => toggle('certifications')}
        status={statuses.certifications}
        statusTitle={statusTitle('certifications')}
        right={
          <div className="flex items-center gap-2">
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
            <div key={field.id} className="rounded-xl border border-gray-100 p-3 dark:border-white/10">
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="Certification" {...register(`certifications.${index}.name` as const)} />
                <Input placeholder="Issuer" {...register(`certifications.${index}.issuer` as const)} />
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

      {/* EXTRAS */}
      <SectionCard
        title="Extras"
        subtitle="Languages + interests (optional)."
        isOpen={open.extras}
        onToggle={() => toggle('extras')}
        status={statuses.extras}
        statusTitle={statusTitle('extras')}
        right={
          <div className="flex items-center gap-2">
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