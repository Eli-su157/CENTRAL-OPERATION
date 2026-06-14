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
      className={
        'w-full py-3.5 px-6 rounded-lg font-mono text-xs uppercase tracking-[0.2em] ' +
        'bg-transparent border border-brand text-brand ' +
        'shadow-[0_0_8px_0_rgba(249,115,22,0.25)] ' +
        'hover:bg-brand/10 hover:shadow-[0_0_18px_2px_rgba(249,115,22,0.45)] ' +
        'active:bg-brand/20 active:shadow-[0_0_10px_0_rgba(249,115,22,0.3)] ' +
        'transition-[box-shadow,background-color] duration-200 ' +
        'disabled:opacity-35 disabled:cursor-not-allowed disabled:shadow-none'
      }
    >
      {pending ? loadingLabel : label}
    </button>
  );
}
