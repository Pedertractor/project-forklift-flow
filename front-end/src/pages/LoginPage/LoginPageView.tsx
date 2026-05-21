import { Card } from '@/components/ui/card';
import { LoginBrandingPanel } from './LoginBrandingPanel';
import { LoginFormPanel } from './LoginFormPanel';

export function LoginPageView({
  isRestoringSession = false,
}: {
  isRestoringSession?: boolean;
}) {
  return (
    <main className="relative flex min-h-svh items-center justify-center bg-zinc-100/80 p-6 bg-[radial-gradient(circle_at_1px_1px,rgba(0,95,184,0.07)_1px,transparent_0),radial-gradient(80%_60%_at_50%_0%,rgba(0,95,184,0.08),transparent_55%)] [background-size:22px_22px,100%_100%]">
      <Card className="relative grid min-h-[clamp(28rem,calc(100svh-3rem),40rem)] w-full max-w-[920px] grid-cols-2 items-stretch gap-0 overflow-hidden rounded-xl border border-zinc-200 p-0 shadow-lg max-[800px]:min-h-[calc(100svh-3rem)] max-[800px]:max-w-[min(100%,28rem)] max-[800px]:grid-cols-1 max-[800px]:grid-rows-[auto_minmax(0,1fr)]">
        {isRestoringSession ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/85 px-6 text-center backdrop-blur-[2px] max-[800px]:col-span-1">
            Carregando...
          </div>
        ) : null}
        <LoginBrandingPanel />
        <LoginFormPanel />
      </Card>
    </main>
  );
}
