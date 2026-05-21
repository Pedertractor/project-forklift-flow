export function ForkliftLoader() {
  return (
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
  );
}
