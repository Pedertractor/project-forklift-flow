function AccordionLoader() {
  const lines = Array.from({ length: 6 });

  return (
    <div
      className="mx-auto flex w-fit items-center justify-center"
      role="status"
      aria-label="Carregando"
    >
      <div className="flex items-center justify-center gap-2">
        {lines.map((_, i) => (
          <div
            key={i}
            className="w-2 bg-brand rounded-full"
            style={{
              height: '60px',
              animation: `accordion 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      <style>{`
          @keyframes accordion {
            0%, 100% {
              height: 20px;
              opacity: 0.5;
            }
            50% {
              height: 60px;
              opacity: 1;
            }
          }
        `}</style>
    </div>
  );
}

export default AccordionLoader;
