import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { CoverLetterDraft } from '@cvpro/shared/types';
import { coverLetterTemplateRegistry } from '../../templates/coverLetterRegistry';

const section =
  'space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5';
const label =
  'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300';
const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-primary';

const CoverLetterForm: React.FC = () => {
  const { register, control } = useFormContext<CoverLetterDraft>();
  const middle = useFieldArray({ control, name: 'body.middleParagraphs' as never });

  return (
    <div className="space-y-4">
      <section className={section}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Sender Details</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className={label}>Full Name</label>
            <input className={input} {...register('sender.fullName')} />
          </div>
          <div>
            <label className={label}>Professional Title</label>
            <input className={input} {...register('sender.title' as any)} />
          </div>
          <div>
            <label className={label}>Email</label>
            <input className={input} {...register('sender.email')} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={input} {...register('sender.phone')} />
          </div>
          <div>
            <label className={label}>Location</label>
            <input className={input} {...register('sender.location')} />
          </div>
        </div>
      </section>

      <section className={section}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recipient Details</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className={label}>Name</label>
            <input className={input} {...register('recipient.name')} />
          </div>
          <div>
            <label className={label}>Title</label>
            <input className={input} {...register('recipient.title')} />
          </div>
          <div>
            <label className={label}>Company</label>
            <input className={input} {...register('recipient.company')} />
          </div>
          <div>
            <label className={label}>Address</label>
            <input className={input} {...register('recipient.address')} />
          </div>
        </div>
      </section>

      <section className={section}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Letter Details</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className={label}>Role</label>
            <input className={input} {...register('letter.role')} />
          </div>
          <div>
            <label className={label}>Date</label>
            <input className={input} {...register('letter.date')} />
          </div>
        </div>
        <div>
          <label className={label}>Subject</label>
          <input className={input} {...register('letter.subject')} />
        </div>
        <div>
          <label className={label}>Greeting</label>
          <input className={input} {...register('letter.greeting')} />
        </div>
        <div>
          <label className={label}>Signoff</label>
          <input className={input} {...register('letter.signoff')} />
        </div>
      </section>

      <section className={section}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Body Content</h3>
        <div>
          <label className={label}>Opening</label>
          <textarea className={`${input} min-h-[110px]`} {...register('body.opening')} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              Middle Paragraphs
            </p>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-primary dark:hover:text-primary"
              onClick={() => middle.append('')}
            >
              Add paragraph
            </button>
          </div>
          {middle.fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-lg border border-slate-200 bg-white/70 p-2 dark:border-white/10 dark:bg-slate-900/30"
            >
              <textarea
                className={`${input} min-h-[90px]`}
                {...register(`body.middleParagraphs.${index}` as const)}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  onClick={() => middle.move(index, Math.max(0, index - 1))}
                  disabled={index === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  onClick={() => middle.move(index, Math.min(middle.fields.length - 1, index + 1))}
                  disabled={index === middle.fields.length - 1}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                  onClick={() => middle.remove(index)}
                  disabled={middle.fields.length === 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className={label}>Closing</label>
          <textarea className={`${input} min-h-[110px]`} {...register('body.closing')} />
        </div>
      </section>

      <section className={section}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Design & Style</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className={label}>Template</label>
            <select className={input} {...register('templateId')}>
              {coverLetterTemplateRegistry.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Font Family</label>
            <input className={input} {...register('style.fontFamily')} />
          </div>
          <div>
            <label className={label}>Font Size</label>
            <input
              type="number"
              className={input}
              {...register('style.fontSize', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className={label}>Line Height</label>
            <input
              type="number"
              step="0.05"
              className={input}
              {...register('style.lineHeight', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className={label}>Accent Color</label>
            <input type="color" className={`${input} h-10`} {...register('style.accentColor')} />
          </div>
          <div>
            <label className={label}>Page Theme</label>
            <select className={input} {...register('style.pageTheme')}>
              <option value="light">Light</option>
              <option value="warm">Warm</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoverLetterForm;
