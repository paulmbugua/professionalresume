import React from 'react';
import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';
import { defaultSectionOrder } from '../../../utils/cvDefaults';

type Props = {
  draft: CvDraft;
};

const ElegantSerif: React.FC<Props> = ({ draft }) => {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visible = draft.sectionVisibility || {};

  const sectionMap: Record<CvSectionKey, React.ReactNode> = {
    summary: draft.summary ? (
      <section>
        <h3 className="cv-section-title font-serif">Summary</h3>
        <p className="cv-body text-gray-700">{draft.summary}</p>
      </section>
    ) : null,
    skills: draft.skills?.length ? (
      <section>
        <h3 className="cv-section-title font-serif">Skills</h3>
        <p className="cv-body text-gray-700">{draft.skills.join(' · ')}</p>
      </section>
    ) : null,
    experience: draft.experience?.length ? (
      <section>
        <h3 className="cv-section-title font-serif">Experience</h3>
        <div className="space-y-3">
          {draft.experience.map((exp, idx) => (
            <div key={`${exp.company}-${idx}`}>
              <div className="flex flex-wrap items-center justify-between text-sm font-semibold">
                <span>{exp.role || 'Role'} · {exp.company || 'Company'}</span>
                <span className="text-xs text-gray-500">{exp.start} - {exp.end}</span>
              </div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-gray-700">
                {exp.bullets?.map((bullet, bulletIdx) => (
                  <li key={`${exp.company}-${bulletIdx}`}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    ) : null,
    education: draft.education?.length ? (
      <section>
        <h3 className="cv-section-title font-serif">Education</h3>
        <div className="space-y-3">
          {draft.education.map((edu, idx) => (
            <div key={`${edu.school}-${idx}`}>
              <div className="flex flex-wrap items-center justify-between text-sm font-semibold">
                <span>{edu.program || 'Program'} · {edu.school || 'School'}</span>
                <span className="text-xs text-gray-500">{edu.start} - {edu.end}</span>
              </div>
              {edu.details && <p className="text-xs text-gray-600">{edu.details}</p>}
            </div>
          ))}
        </div>
      </section>
    ) : null,
    projects: draft.projects?.length ? (
      <section>
        <h3 className="cv-section-title font-serif">Projects</h3>
        <div className="space-y-3">
          {draft.projects.map((project, idx) => (
            <div key={`${project.name}-${idx}`}>
              <div className="text-sm font-semibold">{project.name || 'Project'}</div>
              <p className="text-xs text-gray-600">{project.description}</p>
            </div>
          ))}
        </div>
      </section>
    ) : null,
    certifications: draft.certifications?.length ? (
      <section>
        <h3 className="cv-section-title font-serif">Certifications</h3>
        <div className="space-y-1 text-xs text-gray-600">
          {draft.certifications.map((cert, idx) => (
            <div key={`${cert.name}-${idx}`}>
              {cert.name} {cert.issuer ? `· ${cert.issuer}` : ''} {cert.year ? `(${cert.year})` : ''}
            </div>
          ))}
        </div>
      </section>
    ) : null,
    extras: draft.extras ? (
      <section>
        <h3 className="cv-section-title font-serif">Extras</h3>
        <div className="space-y-1 text-xs text-gray-600">
          {draft.extras.languages?.length ? (
            <p>Languages: {draft.extras.languages.join(', ')}</p>
          ) : null}
          {draft.extras.interests?.length ? (
            <p>Interests: {draft.extras.interests.join(', ')}</p>
          ) : null}
        </div>
      </section>
    ) : null,
  };

  return (
    <div className="p-10 font-serif text-[12px]">
      <header className="border-b border-gray-300 pb-4 text-center">
        <h1 className="text-3xl font-semibold">{draft.basics.name || 'Your Name'}</h1>
        <p className="text-sm text-gray-600">{draft.basics.headline || 'Professional Headline'}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
          <span>{draft.basics.email}</span>
          <span>{draft.basics.phone}</span>
          <span>{draft.basics.location}</span>
        </div>
      </header>
      <div className="mt-6 space-y-5">
        {order.map((key) => (visible[key] ? sectionMap[key] : null))}
      </div>
    </div>
  );
};

export default ElegantSerif;
