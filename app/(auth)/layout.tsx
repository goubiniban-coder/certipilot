import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted">
      <header className="px-6 py-5">
        <Link href="/" className="text-2xl font-bold">
          {APP_NAME}
        </Link>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-16">{children}</main>
    </div>
  );
}
