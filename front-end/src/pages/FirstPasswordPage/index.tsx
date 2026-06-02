import { FirstPasswordPageView } from './FirstPasswordPageView';
import { useFirstPasswordPage } from './useFirstPasswordPage';

export function FirstPasswordPage() {
  return <FirstPasswordPageView {...useFirstPasswordPage()} />;
}
