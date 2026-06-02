import { SectorsPageView } from './SectorsPageView';
import { useSectorsPage } from './useSectorsPage';

export function SectorsPage() {
  return <SectorsPageView {...useSectorsPage()} />;
}
