import CompactOnePager from '../../../../../../components/cv/templates/CompactOnePager';
import { demoDraft } from '../../demoData';

export default function Page() {
  return <CompactOnePager draft={{ ...demoDraft, templateId: 'compact-one-pager' }} />;
}
