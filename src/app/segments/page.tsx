'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SegmentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="py-20 text-center text-slate-400 text-sm">
      Redirecting to Agency Radar...
    </div>
  );
}
