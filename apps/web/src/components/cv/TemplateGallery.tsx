import React from 'react';
import type { CvTemplate } from '@cvpro/shared/types';
import TemplateCard from './TemplateCard';

type Props = {
  templates: CvTemplate[];
  onSelect: (template: CvTemplate) => void;
};

const TemplateGallery: React.FC<Props> = ({ templates, onSelect }) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} onSelect={onSelect} />
      ))}
    </div>
  );
};

export default TemplateGallery;
