import LoginBackground from '@/components/auth/login-background';
import LoginHero from '@/components/auth/login-hero';
import LoginCard from '@/components/auth/login-card';
import TelemetryCorners from '@/components/auth/telemetry-corners';

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-0)]">
      <LoginBackground />
      <TelemetryCorners />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16 gap-12">
        <LoginHero />
        <div className="w-full max-w-[440px]">
          <LoginCard />
        </div>
      </div>
    </div>
  );
}
