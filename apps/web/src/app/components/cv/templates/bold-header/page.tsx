import BoldHeader from '../../../../../../components/cv/templates/BoldHeader';
import { demoDraft } from '../../demoData';

export default function Page() {
  return <BoldHeader draft={{ ...demoDraft, templateId: 'bold-header' }} />;
}
