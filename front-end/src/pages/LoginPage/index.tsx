import { LoginPageView } from './LoginPageView';
import { useLoginPage } from './useLoginPage';

export function LoginPage() {
  const { isRestoringSession } = useLoginPage();
  return <LoginPageView isRestoringSession={isRestoringSession} />;
}
