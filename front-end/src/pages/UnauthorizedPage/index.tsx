import { UnauthorizedPageView } from './UnauthorizedPageView';
import { useUnauthorizedPage } from './useUnauthorizedPage';

export function UnauthorizedPage() {
  return <UnauthorizedPageView {...useUnauthorizedPage()} />;
}
