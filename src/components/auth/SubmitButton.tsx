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
      className="w-full py-3 px-4 font-semibold text-sm bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed tracking-wide mt-2"
    >
      {pending ? loadingLabel : label}
    </button>
  );
}
