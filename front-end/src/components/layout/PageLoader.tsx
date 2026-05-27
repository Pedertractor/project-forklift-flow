import { ForkliftLoader } from '@/components/forklift-loader/forklifit-loader';

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <ForkliftLoader size="lg" />
    </div>
  );
}
