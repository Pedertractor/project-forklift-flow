import { Card } from '@/components/ui/card';
import { LoginBrandingPanel } from './LoginBrandingPanel';
import { LoginFormPanel } from './LoginFormPanel';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';

export function LoginPageView({
  isRestoringSession = false,
}: {
  isRestoringSession?: boolean;
}) {
  return (
    <main className="relative flex h-svh min-h-svh items-center justify-center bg-zinc-100/80 p-6 max-[767px]:items-stretch max-[767px]:p-3 min-[768px]:p-4 lg:p-6 bg-[radial-gradient(circle_at_1px_1px,rgba(0,95,184,0.07)_1px,transparent_0),radial-gradient(80%_60%_at_50%_0%,rgba(0,95,184,0.08),transparent_55%)] [background-size:22px_22px,100%_100%]">
      {isRestoringSession ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-100/90 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <AccordionLoader />
        </div>
      ) : null}
      <Card className="relative grid w-full min-w-0 max-w-[920px] grid-cols-2 items-stretch gap-0 overflow-hidden rounded-xl border border-zinc-200 p-0 shadow-lg max-[767px]:h-[calc(100svh-1.5rem)] max-[767px]:max-h-[calc(100svh-1.5rem)] max-[767px]:min-h-0 max-[767px]:max-w-none max-[767px]:grid-cols-1 max-[767px]:grid-rows-[auto_minmax(0,1fr)] min-[768px]:min-h-[clamp(22rem,calc(100svh-2rem),40rem)] min-[768px]:max-w-none lg:min-h-[clamp(28rem,calc(100svh-3rem),40rem)] lg:max-w-[920px]">
        <LoginBrandingPanel />
        <LoginFormPanel />
      </Card>
    </main>
  );
}
