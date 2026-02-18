import AtsMinimal from '../../../../../../components/cv/templates/AtsMinimal';
import { demoDraft } from '../../demoData';

export default function Page() {
  return <AtsMinimal draft={{ ...demoDraft, templateId: 'ats-minimal' }} />;
}
