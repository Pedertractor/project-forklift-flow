import { LoginPageView } from './LoginPageView';
import { useLoginPage } from './useLoginPage';

export function LoginPage() {
  useLoginPage();
  return <LoginPageView />;
}
