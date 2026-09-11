import { Card } from "../components/Card";

export function Profile() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-forest-900">Profile</h1>
        <p className="text-[14px] text-charcoal/60 mt-0.5">Info akun kamu.</p>
      </div>
      <Card>
        <p className="text-[14px] text-charcoal/60">Placeholder profil pengguna — bisa disambungkan ke akun Telegram/Supabase nanti.</p>
      </Card>
    </div>
  );
}
