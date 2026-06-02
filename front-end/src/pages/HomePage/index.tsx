import { HomePageView } from './HomePageView';
import { useHomePage } from './useHomePage';

export function HomePage() {
  return <HomePageView {...useHomePage()} />;
}
