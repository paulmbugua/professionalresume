import ModernSidebar from '../../../../../../components/cv/templates/ModernSidebar';
import { demoDraft } from '../../demoData';

export default function Page() {
  return <ModernSidebar draft={{ ...demoDraft, templateId: 'modern-sidebar' }} />;
}
