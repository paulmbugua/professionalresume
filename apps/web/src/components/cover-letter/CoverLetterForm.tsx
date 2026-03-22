import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { CoverLetterDraft } from '@cvpro/shared/types';

const section = 'space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500';
const input = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900';

const CoverLetterForm: React.FC = () => {
  const { register, control } = useFormContext<CoverLetterDraft>();
  const middle = useFieldArray({ control, name: 'body.middleParagraphs' as never });

  return (
    <div className="space-y-4">
      <section className={section}>
        <h3 className="text-sm font-semibold text-gray-900">Sender Details</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className={label}>Full Name</label>
            <input className={input} {...register('sender.fullName')} />
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
        <h3 className="text-sm font-semibold text-gray-900">Recipient Details</h3>
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
        <h3 className="text-sm font-semibold text-gray-900">Letter Details</h3>
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
        <h3 className="text-sm font-semibold text-gray-900">Body Content</h3>
        <div>
          <label className={label}>Opening</label>
          <textarea className={`${input} min-h-[110px]`} {...register('body.opening')} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Middle Paragraphs
            </p>
            <button
              type="button"
              className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold"
              onClick={() => middle.append('')}
            >
              Add paragraph
            </button>
          </div>
          {middle.fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-gray-200 p-2">
              <textarea
                className={`${input} min-h-[90px]`}
                {...register(`body.middleParagraphs.${index}` as const)}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => middle.move(index, Math.max(0, index - 1))}
                  disabled={index === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => middle.move(index, Math.min(middle.fields.length - 1, index + 1))}
                  disabled={index === middle.fields.length - 1}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700"
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
        <h3 className="text-sm font-semibold text-gray-900">Design & Style</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className={label}>Template</label>
            <select className={input} {...register('templateId')}>
              <option value="classic-letter">Classic Letter</option>
              <option value="modern-accent">Modern Accent</option>
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
            </select>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoverLetterForm;
