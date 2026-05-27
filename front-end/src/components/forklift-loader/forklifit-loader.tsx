export function ForkliftLoader() {
  return (
    <div
    className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-10"
    role="status"
    aria-live="polite"
  >
    <div className="h-24 w-24 shrink-0">
    <div className="flex w-full h-full items-center justify-center ">
      <div className=" flex items-center justify-center bg-white rounded-full p-2">
        <video
          src="/forklift-loader/forklift-loader.mp4"
          autoPlay
          loop
          muted
          className="w-full h-full object-cover"
        />
      </div>
      </div>
      </div>
    </div>
  );
}
