export function LoginBrandingPanel() {
  return (
    <aside className="relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden bg-[linear-gradient(155deg,#003d7a_0%,#005fb8_52%,#1a6fc4_100%)] px-7 pb-7 pt-8 text-white max-[800px]:h-auto max-[800px]:min-h-0 max-[800px]:px-4 max-[800px]:pb-4 max-[800px]:pt-5">
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center max-[800px]:hidden"
        aria-hidden
      >
        <img
          src="/forklift-bg.png"
          alt=""
          className="h-auto w-full max-w-[min(26rem,92%)] object-contain object-center max-h-[min(58%,min(28rem,52vh))] opacity-70 drop-shadow-[0_14px_48px_rgba(0,0,0,0.38)]"
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
        <h1 className="m-0 text-2xl font-bold leading-[1.2] tracking-[-0.02em] max-[800px]:text-xl sm:text-[length:var(--text-title,1.5rem)]">
          ForkLift Flow
        </h1>
        <p className="mt-2 max-w-[18rem] text-sm font-normal leading-[1.45] text-white/88 max-[800px]:mt-1 max-[800px]:text-xs">
          Acesse sua conta para continuar na plataforma.
        </p>
      </header>
      <div
        className="relative z-10 hidden justify-center py-3 max-[800px]:flex"
        aria-hidden
      >
        <img
          src="/forklift-bg.png"
          alt=""
          className="h-auto max-h-[min(9rem,28svh)] w-full max-w-[min(14rem,72%)] object-contain object-center opacity-70 drop-shadow-[0_14px_48px_rgba(0,0,0,0.38)]"
          decoding="async"
        />
      </div>
      <div
        className="relative z-10 min-h-0 flex-1 py-6 max-[800px]:hidden"
        aria-hidden
      />
      <footer className="relative z-10 mt-auto flex items-center justify-center border-t border-white/20 pt-4 max-[800px]:mt-3 max-[800px]:pt-3">
        <p className="m-0 text-center text-xs font-medium tracking-wide text-white/75">
          Pedertractor & TractorComponents
        </p>
      </footer>
    </aside>
  );
}
