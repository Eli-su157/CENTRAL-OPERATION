import LoginBackground from '@/components/auth/login-background';
import LoginHero from '@/components/auth/login-hero';
import SignupCard from '@/components/auth/signup-card';

export default function SignupPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-0)]">
      <LoginBackground glow={false} />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2 lg:gap-16 lg:px-16 px-6 py-12 items-center">
        {/* Card — order-1 → aparece primeiro no mobile */}
        <div className="order-1 lg:order-2 flex justify-center items-center w-full">
          <div className="w-full max-w-md">
            <SignupCard />
          </div>
        </div>

        {/* Hero — order-2 → abaixo do card no mobile */}
        <div className="order-2 lg:order-1 flex items-center w-full">
          <LoginHero />
        </div>
      </div>
    </div>
  );
}
