import { Suspense } from 'react';
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense fallback={<div className="h-96 w-80 animate-pulse rounded-2xl bg-muted" />}>
        <SignIn />
      </Suspense>
    </div>
  );
}
