export default function LoginBackground({ glow = false }: { glow?: boolean }) {
  return (
    <div className="absolute inset-0 -z-10 login-bg-grid">
      {glow && <div className="absolute inset-0 login-bg-glow" />}
    </div>
  )
}
