import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { WarehouseIllustration } from "@/components/brand/warehouse-illustration";
import { familyStyle } from "@/lib/families";
import { APP_NAME } from "@/lib/constants";

const FAMILIES = ["R.482", "R.483", "R.484", "R.485", "R.486", "R.487", "R.489", "R.490"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-[var(--marine)] text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
        <Link href="/" className="flex items-center gap-3 font-display text-3xl font-bold">
          <Logo size={44} />
          {APP_NAME}
        </Link>
        <div className="grid gap-8">
          <div className="overflow-hidden rounded-3xl border-4 border-[var(--yellow)] shadow-[0_10px_0_rgba(0,0,0,.25)]">
            <WarehouseIllustration className="block h-auto w-full" />
          </div>
          <div className="grid gap-4">
            <p className="font-display text-5xl font-bold leading-[0.98] text-balance">
              Votre chantier de tests, enfin sous contrôle.
            </p>
            <ul className="flex flex-wrap gap-2" aria-label="Familles d'engins">
              {FAMILIES.map((code) => {
                const f = familyStyle(code);
                return (
                  <li
                    key={code}
                    className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold"
                  >
                    <span className="size-3 rounded-sm border-2 border-white/80" style={{ background: f.color }} aria-hidden />
                    {code}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <p className="text-xs text-white/60">
          CACES® est une marque déposée de la Cnam. {APP_NAME} n&apos;est ni affilié à la Cnam ni approuvé par elle.
        </p>
      </aside>

      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center gap-3 bg-[var(--marine)] px-5 py-4 text-white lg:hidden">
          <Link href="/" className="flex items-center gap-3 font-display text-2xl font-bold">
            <Logo size={34} />
            {APP_NAME}
          </Link>
        </header>
        <div className="lg:hidden" aria-hidden>
          <WarehouseIllustration className="block h-32 w-full object-cover" />
        </div>
        <main id="contenu" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 lg:py-16">
          {children}
        </main>
      </div>
    </div>
  );
}
