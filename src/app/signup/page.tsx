import LoginBackground from '@/components/auth/login-background';
import LoginHero from '@/components/auth/login-hero';
import SignupCard from '@/components/auth/signup-card';

export default function SignupPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-0)]">
      <LoginBackground />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16 gap-12">
        <LoginHero />
        <div className="w-full max-w-[440px]">
          <SignupCard />
        </div>
      </div>
    </div>
  );
}
