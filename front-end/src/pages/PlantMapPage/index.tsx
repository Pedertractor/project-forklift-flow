import { PlantMapPageView } from './PlantMapPageView';
import { usePlantMapPage } from './usePlantMapPage';

export function PlantMapPage() {
  return <PlantMapPageView {...usePlantMapPage()} />;
}
