'use client';

import { useFormStatus } from 'react-dom';

interface Props {
  label: string;
  loadingLabel?: string;
}

export function SubmitButton({ label, loadingLabel = 'Aguarde...' }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3.5 px-4 rounded-lg font-semibold text-sm bg-brand hover:bg-brand/90 active:bg-brand/80 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed tracking-wide"
    >
      {pending ? loadingLabel : label}
    </button>
  );
}
