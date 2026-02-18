import TemplateDebugPanel from '../../../../../components/cv/TemplateDebugPanel';
import { demoDraft, demoTemplates } from '../demoData';

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <TemplateDebugPanel
        draft={demoDraft}
        templateCount={demoTemplates.length}
        templateSource="local"
        resumeSource="demo"
      />
    </main>
  );
}
