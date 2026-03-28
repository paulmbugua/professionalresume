'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import type { CoverLetterDraft } from '@cvpro/shared/types';

const section =
  'space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5';
const label =
  'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300';
const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-primary';
const helperButton =
  'rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-primary dark:hover:text-primary';

const CoverLetterForm: React.FC = () => {
  const { register, setValue, getValues, watch } = useFormContext<CoverLetterDraft>();

  const subject = watch('letter.subject') ?? '';
  const greeting = watch('letter.greeting') ?? '';
  const opening = watch('body.opening') ?? '';
  const middleParagraphs = watch('body.middleParagraphs') ?? [];
  const closing = watch('body.closing') ?? '';
  const body = [opening, ...middleParagraphs].filter(Boolean).join('\n\n');

  const appendBodyParagraph = (text: string) => {
    const current = getValues('body.middleParagraphs') ?? [];
    const next = [...current.filter(Boolean), text];
    setValue('body.middleParagraphs', next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const replaceText = (
    field: 'letter.subject' | 'letter.greeting' | 'body.opening' | 'body.closing',
    text: string
  ) => {
    setValue(field, text, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="space-y-4">
      <section className={section}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Letter essentials
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Fill the core cover letter fields used by the current draft model.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-300 sm:text-right">
            <span>Subject: {subject.length}</span>
            <span>Greeting: {greeting.length}</span>
            <span>Body: {body.length}</span>
            <span>Closing: {closing.length}</span>
          </div>
        </div>
      </section>

      <section className={section}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Quick starters
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-300">
            One-click helpers
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={helperButton}
            onClick={() => replaceText('letter.greeting', 'Dear Hiring Manager,')}
          >
            Dear Hiring Manager
          </button>
          <button
            type="button"
            className={helperButton}
            onClick={() => replaceText('letter.greeting', 'Dear Recruitment Team,')}
          >
            Dear Recruitment Team
          </button>
          <button
            type="button"
            className={helperButton}
            onClick={() =>
              replaceText('letter.subject', 'Application for the advertised position')
            }
          >
            Set subject
          </button>
          <button
            type="button"
            className={helperButton}
            onClick={() =>
              replaceText(
                'body.opening',
                'I am excited to apply for this opportunity and bring relevant experience, strong execution, and a results-driven mindset.'
              )
            }
          >
            Add strong opening
          </button>
          <button
            type="button"
            className={helperButton}
            onClick={() =>
              appendBodyParagraph(
                'In previous roles, I consistently delivered high-quality work, collaborated effectively with teams, and adapted quickly to changing priorities.'
              )
            }
          >
            Add value paragraph
          </button>
          <button
            type="button"
            className={helperButton}
            onClick={() =>
              replaceText(
                'body.closing',
                'Thank you for your time and consideration. I would welcome the opportunity to discuss how I can contribute.'
              )
            }
          >
            Add strong close
          </button>
        </div>
      </section>

      <section className={section}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Basic details
        </h3>

        <div>
          <label className={label}>Subject</label>
          <input
            className={input}
            placeholder="Application for Marketing Assistant"
            {...register('letter.subject')}
          />
        </div>

        <div>
          <label className={label}>Greeting</label>
          <input
            className={input}
            placeholder="Dear Hiring Manager,"
            {...register('letter.greeting')}
          />
        </div>
      </section>

      <section className={section}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Main letter body
          </h3>
          <button
            type="button"
            className={helperButton}
            onClick={() => {
              replaceText('body.opening', '');
              setValue('body.middleParagraphs', [], {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            }}
          >
            Clear body
          </button>
        </div>

        <div>
          <label className={label}>Body</label>
          <textarea
            className={`${input} min-h-[240px]`}
            placeholder={`Introduce yourself, explain why you fit the role, and highlight the strongest value you bring.\n\nExample:\nI am writing to express my strong interest in this opportunity. My background in customer service, organization, and problem-solving has prepared me to contribute immediately.\n\nI have consistently supported teams by improving workflows, communicating clearly, and maintaining a high standard of professionalism.`}
            value={body}
            onChange={(event) => {
              const paragraphs = event.target.value
                .split(/\n{2,}/)
                .map((p) => p.trim())
                .filter(Boolean);
              const [nextOpening, ...nextMiddle] = paragraphs;
              setValue('body.opening', nextOpening ?? '', {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
              setValue('body.middleParagraphs', nextMiddle, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={helperButton}
            onClick={() =>
              appendBodyParagraph(
                'My experience has strengthened my communication, teamwork, and ability to deliver excellent results under pressure.'
              )
            }
          >
            Add skills line
          </button>
          <button
            type="button"
            className={helperButton}
            onClick={() =>
              appendBodyParagraph(
                'I am particularly drawn to this role because it aligns with my strengths, growth mindset, and commitment to meaningful impact.'
              )
            }
          >
            Add motivation line
          </button>
        </div>
      </section>

      <section className={section}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Closing
          </h3>
          <button
            type="button"
            className={helperButton}
            onClick={() => replaceText('body.closing', '')}
          >
            Clear closing
          </button>
        </div>

        <div>
          <label className={label}>Closing</label>
          <textarea
            className={`${input} min-h-[140px]`}
            placeholder={`Thank you for your time and consideration. I would welcome the opportunity to discuss my application further.\n\nSincerely,`}
            {...register('body.closing')}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={helperButton}
            onClick={() => replaceText('body.closing', 'Sincerely,')}
          >
            Sincerely
          </button>
          <button
            type="button"
            className={helperButton}
            onClick={() => replaceText('body.closing', 'Kind regards,')}
          >
            Kind regards
          </button>
          <button
            type="button"
            className={helperButton}
            onClick={() =>
              replaceText(
                'body.closing',
                [closing, 'Thank you again for reviewing my application.']
                  .filter(Boolean)
                  .join('\n\n')
              )
            }
          >
            Add thank-you line
          </button>
        </div>
      </section>
    </div>
  );
};

export default CoverLetterForm;
