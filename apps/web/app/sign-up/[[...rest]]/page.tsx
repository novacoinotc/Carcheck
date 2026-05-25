import { Suspense } from 'react';
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense fallback={<div className="h-96 w-80 animate-pulse rounded-2xl bg-muted" />}>
        <SignUp />
      </Suspense>
    </div>
  );
}
