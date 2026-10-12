import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type { CvDraft } from '@cvpro/shared/types';
export default function AdditionalResumeSections() {
  const { control, register, setValue, watch } = useFormContext<CvDraft>();
  const { fields, append, remove } = useFieldArray({ control, name: 'additionalSections' });
  return (
    <section className="border-t border-gray-200 pt-4 dark:border-white/15">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Additional Sections</h3>
        <button
          type="button"
          title="Add section"
          aria-label="Add section"
          onClick={() => {
            append({ title: '', placement: 'main', content: '', bullets: [] });
            setValue('sectionVisibility.additionalSections', true, { shouldDirty: true });
          }}
          className="rounded-lg border p-2 dark:border-white/20"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="space-y-3 border-b border-gray-200 pb-4 pt-3 dark:border-white/15"
        >
          <div className="flex gap-2">
            <input
              aria-label="Section title"
              {...register(`additionalSections.${index}.title`)}
              className="input min-w-0 flex-1 text-sm"
              placeholder="Section title"
            />
            <button
              type="button"
              title="Remove section"
              aria-label="Remove section"
              onClick={() => remove(index)}
              className="p-2 text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <select
            aria-label="Section placement"
            {...register(`additionalSections.${index}.placement`)}
            className="input w-full text-sm"
          >
            <option value="main">Main area</option>
            <option value="sidebar">Sidebar</option>
          </select>
          <textarea
            aria-label="Section content"
            {...register(`additionalSections.${index}.content`)}
            className="input w-full text-sm"
            rows={3}
          />
          <textarea
            aria-label="Section bullets"
            value={watch(`additionalSections.${index}.bullets`)?.join('\n') || ''}
            onChange={(event) =>
              setValue(`additionalSections.${index}.bullets`, event.target.value.split('\n'), {
                shouldDirty: true,
              })
            }
            className="input w-full text-sm"
            rows={3}
            placeholder="Bullets"
          />
        </div>
      ))}
    </section>
  );
}
