import ElegantSerif from '../../../../../../components/cv/templates/ElegantSerif';
import { demoDraft } from '../../demoData';

export default function Page() {
  return <ElegantSerif draft={{ ...demoDraft, templateId: 'elegant-serif' }} />;
}
