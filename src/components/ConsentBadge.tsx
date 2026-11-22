'use client';

import React from 'react';
import { ConsentStatus } from '@/types';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface Props {
  status: ConsentStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function ConsentBadge({ status, size = 'sm', showIcon = true }: Props) {
  const isSm = size === 'sm';

  if (status === 'consented') {
    return (
      <span
        title="Explicit marketing consent granted by customer"
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 ${
          isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        }`}
      >
        {showIcon && <CheckCircle2 className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />}
        <span>Consented</span>
      </span>
    );
  }

  if (status === 'opted_out') {
    return (
      <span
        title="Customer explicitly asked not to receive marketing messages"
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 ${
          isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        }`}
      >
        {showIcon && <XCircle className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />}
        <span>Opted Out</span>
      </span>
    );
  }

  return (
    <span
      title="Recorded for visit history only. Excluded from marketing campaigns until explicit consent is given."
      className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 ${
        isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
    >
      {showIcon && <AlertCircle className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />}
      <span>Unconfirmed</span>
    </span>
  );
}
