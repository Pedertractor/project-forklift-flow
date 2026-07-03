export function LoginBrandingPanel() {
  return (
    <aside className="relative flex h-full min-h-0 min-w-0 shrink-0 flex-col overflow-hidden bg-[linear-gradient(155deg,#003d7a_0%,#005fb8_52%,#1a6fc4_100%)] px-7 pb-7 pt-8 text-white max-[767px]:h-auto max-[767px]:min-h-0 max-[767px]:px-4 max-[767px]:pb-4 max-[767px]:pt-5 [@media(orientation:landscape)_and_(max-height:600px)]:h-full! min-[768px]:px-4 min-[768px]:pb-5 min-[768px]:pt-6 lg:px-7 lg:pb-7 lg:pt-8">
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center max-[767px]:hidden"
        aria-hidden
      >
        <img
          src="/forklift-bg.png"
          alt=""
          className="h-auto w-full max-w-[92%] object-contain object-center opacity-70 drop-shadow-[0_14px_48px_rgba(0,0,0,0.38)] max-h-[min(48%,min(14rem,40vh))] min-[768px]:max-h-[min(52%,min(16rem,44vh))] lg:max-h-[min(58%,min(28rem,52vh))] lg:max-w-[min(26rem,92%)]"
          decoding="async"
        />
      </div>
      <span
        className="pointer-events-none absolute -right-[60px] -top-20 z-1 h-[280px] w-[280px] rounded-full bg-white/12 blur-[48px] max-[767px]:hidden"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -bottom-[100px] -left-20 z-1 h-80 w-80 rounded-full bg-[rgba(0,61,122,0.45)] blur-[56px] max-[767px]:hidden"
        aria-hidden
      />
      <header className="relative z-10 min-w-0">
        <h1 className="m-0 text-2xl font-bold leading-[1.2] tracking-[-0.02em] max-[767px]:text-xl sm:text-[length:var(--text-title,1.5rem)] min-[768px]:text-lg lg:text-2xl">
          Fork
        </h1>
        <p className="mt-2 max-w-[18rem] text-sm font-normal leading-[1.45] text-white/88 max-[767px]:mt-1 max-[767px]:text-xs min-[768px]:mt-1.5 min-[768px]:max-w-none min-[768px]:text-xs lg:mt-2 lg:max-w-[18rem] lg:text-sm">
          Acesse sua conta para continuar na plataforma.
        </p>
      </header>
      <div
        className="relative z-10 hidden justify-center py-3 max-[767px]:flex"
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
        className="relative z-10 min-h-0 flex-1 py-4 max-[767px]:hidden min-[768px]:py-3 lg:py-6"
        aria-hidden
      />
      <footer className="relative z-10 mt-auto flex min-w-0 items-center justify-center border-t border-white/20 pt-4 max-[767px]:mt-3 max-[767px]:pt-3 min-[768px]:pt-3 lg:pt-4">
        <p className="m-0 text-center text-[10px] font-medium leading-snug tracking-wide text-white/75 min-[768px]:px-1 lg:text-xs">
          Pedertractor & TractorComponents
        </p>
      </footer>
    </aside>
  );
}
