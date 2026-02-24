import React, { useMemo, useState } from 'react';
import {
  useFieldArray,
  useFormContext,
  Controller,
  useWatch,
} from 'react-hook-form';
import type { CvDraft } from '@cvpro/shared/types';

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`input ${props.className ?? ''}`}
  />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`input min-h-[90px] ${props.className ?? ''}`}
  />
);

const BulletsField: React.FC<{ name: `experience.${number}.bullets` | `projects.${number}.bullets` }> = ({
  name,
}) => (
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

const CvForm: React.FC = () => {
  const { register, control, setValue } = useFormContext<CvDraft>();
  const [skillInput, setSkillInput] = useState('');
  const skills = useWatch({ control, name: 'skills' }) || [];

  const linksField = useFieldArray({ control, name: 'basics.links' });
  const experienceField = useFieldArray({ control, name: 'experience' });
  const educationField = useFieldArray({ control, name: 'education' });
  const projectsField = useFieldArray({ control, name: 'projects' });
  const certificationsField = useFieldArray({ control, name: 'certifications' });

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    const next = Array.from(new Set([...skills, trimmed]));
    setValue('skills', next, { shouldDirty: true });
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    const next = skills.filter((item: string) => item !== skill);
    setValue('skills', next, { shouldDirty: true });
  };

  const sectionClass = useMemo(
    () =>
      'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5',
    []
  );

  return (
    <div className="space-y-6">
      <div className={sectionClass}>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Basics</h3>
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
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-white/60">
              Links
            </p>
            <button
              type="button"
              onClick={() => linksField.append({ label: '', url: '' })}
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
                <Input placeholder="Label" {...register(`basics.links.${index}.label`)} />
                <Input placeholder="URL" {...register(`basics.links.${index}.url`)} />
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
      </div>

      <div className={sectionClass}>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Summary</h3>
        <Textarea placeholder="Write a professional summary" {...register('summary')} />
      </div>

      <div className={sectionClass}>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill: string) => (
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
      </div>

      <div className={sectionClass}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Experience</h3>
          <button
            type="button"
            onClick={() =>
              experienceField.append({ company: '', role: '', start: '', end: '', location: '', bullets: [] })
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
                <Input placeholder="Company" {...register(`experience.${index}.company`)} />
                <Input placeholder="Role" {...register(`experience.${index}.role`)} />
                <Input placeholder="Start" {...register(`experience.${index}.start`)} />
                <Input placeholder="End" {...register(`experience.${index}.end`)} />
                <Input placeholder="Location" {...register(`experience.${index}.location`)} />
              </div>
              <div className="mt-3">
                <BulletsField name={`experience.${index}.bullets`} />
              </div>
              <button
                type="button"
                onClick={() => experienceField.remove(index)}
                className="mt-2 text-xs text-gray-400 hover:text-rose-500"
              >
                Remove experience
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={sectionClass}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Education</h3>
          <button
            type="button"
            onClick={() => educationField.append({ school: '', program: '', start: '', end: '', details: '' })}
            className="text-xs font-semibold text-primary"
          >
            + Add education
          </button>
        </div>
        <div className="space-y-4">
          {educationField.fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-gray-100 p-3 dark:border-white/10">
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="School" {...register(`education.${index}.school`)} />
                <Input placeholder="Program" {...register(`education.${index}.program`)} />
                <Input placeholder="Start" {...register(`education.${index}.start`)} />
                <Input placeholder="End" {...register(`education.${index}.end`)} />
              </div>
              <div className="mt-3">
                <Textarea placeholder="Details" {...register(`education.${index}.details`)} />
              </div>
              <button
                type="button"
                onClick={() => educationField.remove(index)}
                className="mt-2 text-xs text-gray-400 hover:text-rose-500"
              >
                Remove education
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={sectionClass}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Projects</h3>
          <button
            type="button"
            onClick={() => projectsField.append({ name: '', link: '', description: '', bullets: [] })}
            className="text-xs font-semibold text-primary"
          >
            + Add project
          </button>
        </div>
        <div className="space-y-4">
          {projectsField.fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-gray-100 p-3 dark:border-white/10">
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Project name" {...register(`projects.${index}.name`)} />
                <Input placeholder="Link" {...register(`projects.${index}.link`)} />
              </div>
              <div className="mt-3">
                <Textarea placeholder="Short description" {...register(`projects.${index}.description`)} />
              </div>
              <div className="mt-3">
                <BulletsField name={`projects.${index}.bullets`} />
              </div>
              <button
                type="button"
                onClick={() => projectsField.remove(index)}
                className="mt-2 text-xs text-gray-400 hover:text-rose-500"
              >
                Remove project
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={sectionClass}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Certifications</h3>
          <button
            type="button"
            onClick={() => certificationsField.append({ name: '', issuer: '', year: '' })}
            className="text-xs font-semibold text-primary"
          >
            + Add certification
          </button>
        </div>
        <div className="space-y-4">
          {certificationsField.fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-gray-100 p-3 dark:border-white/10">
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="Certification" {...register(`certifications.${index}.name`)} />
                <Input placeholder="Issuer" {...register(`certifications.${index}.issuer`)} />
                <Input placeholder="Year" {...register(`certifications.${index}.year`)} />
              </div>
              <button
                type="button"
                onClick={() => certificationsField.remove(index)}
                className="mt-2 text-xs text-gray-400 hover:text-rose-500"
              >
                Remove certification
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={sectionClass}>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Extras</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <CsvListField name="extras.languages" label="Languages" />
          <CsvListField name="extras.interests" label="Interests" />
        </div>
      </div>
    </div>
  );
};

export default CvForm;
