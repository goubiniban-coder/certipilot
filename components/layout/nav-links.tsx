"use client";

import {
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  Factory,
  LayoutDashboard,
  Receipt,
  Settings,
  Truck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "/app": LayoutDashboard,
  "/app/sessions": CalendarDays,
  "/app/candidats": Users,
  "/app/entreprises": Building2,
  "/app/certificats": Award,
  "/app/facturation": Receipt,
  "/app/testeurs": UserCog,
  "/app/engins": Truck,
  "/app/referentiel": BookOpen,
  "/app/utilisateurs": Users,
  "/app/organisme": Factory,
};

export function NavLinks({ items }: { items: readonly { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
      {items.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        const Icon = ICONS[item.href] ?? Settings;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold whitespace-nowrap outline-none focus-visible:ring-4 focus-visible:ring-yellow/60",
              active ? "bg-yellow text-yellow-foreground" : "text-white/90 hover:bg-white/10",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
