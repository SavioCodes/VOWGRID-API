'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@vowgrid/ui';

export function AuthSubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();

  return (
    <Button block type="submit" disabled={pending}>
      {pending ? 'Working...' : children}
    </Button>
  );
}
