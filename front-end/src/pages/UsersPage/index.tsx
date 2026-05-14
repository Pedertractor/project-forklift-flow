import { UsersPageView } from './UsersPageView';
import { useUsersPage } from './useUsersPage';

export function UsersPage() {
  return <UsersPageView {...useUsersPage()} />;
}
