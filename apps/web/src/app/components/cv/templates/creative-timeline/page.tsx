import CreativeTimeline from '../../../../../../components/cv/templates/CreativeTimeline';
import { demoDraft } from '../../demoData';

export default function Page() {
  return <CreativeTimeline draft={{ ...demoDraft, templateId: 'creative-timeline' }} />;
}
