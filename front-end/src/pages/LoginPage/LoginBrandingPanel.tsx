export function LoginBrandingPanel() {
  return (
    <aside className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(155deg,#003d7a_0%,#005fb8_52%,#1a6fc4_100%)] px-7 pb-7 pt-8 text-white max-[800px]:h-auto max-[800px]:min-h-[min(38svh,20rem)] max-[800px]:px-5 max-[800px]:pb-6 max-[800px]:pt-6">
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <img
          src="/forklift-bg.png"
          alt=""
          className="h-auto w-full max-w-[min(26rem,92%)] object-contain object-center max-h-[min(58%,min(28rem,52vh))] opacity-70 drop-shadow-[0_14px_48px_rgba(0,0,0,0.38)] max-[800px]:max-h-[min(50%,min(20rem,36svh))] max-[800px]:max-w-[min(20rem,88%)]"
          decoding="async"
        />
      </div>
      <span
        className="pointer-events-none absolute -right-[60px] -top-20 z-1 h-[280px] w-[280px] rounded-full bg-white/12 blur-[48px]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -bottom-[100px] -left-20 z-1 h-80 w-80 rounded-full bg-[rgba(0,61,122,0.45)] blur-[56px]"
        aria-hidden
      />
      <header className="relative z-10">
        <h1 className="m-0 text-2xl font-bold leading-[1.2] tracking-[-0.02em] sm:text-[length:var(--text-title,1.5rem)]">
          ForkLift Flow
        </h1>
        <p className="mt-2 max-w-[18rem] text-sm font-normal leading-[1.45] text-white/88">
          Acesse sua conta para continuar na plataforma.
        </p>
      </header>
      <div className="relative z-10 min-h-0 flex-1 py-6 max-[800px]:py-4" aria-hidden />
      <footer className="relative z-10 mt-auto flex items-center justify-center border-t border-white/20 pt-4">
        <p className="m-0 text-center text-xs font-medium tracking-wide text-white/75">
          Operações em armazém
        </p>
      </footer>
    </aside>
  );
}
