"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CurrencyDollar, SignOut } from "@phosphor-icons/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { formatCost } from "@/lib/utils";
import type { HeaderProps } from "@/types/components";

export function Header({
  totalSpend = 0,
  showSpend = true,
  userInitials = "PT",
}: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 w-full px-6 py-3.5 bg-brand-off-white border-b border-brand-border-light flex items-center justify-between">
      <Link href="/" aria-label="Project Atlas home" className="block">
        <Image
          src="/logos/Logo.svg"
          alt="Project Atlas"
          width={42}
          height={42}
          className="cursor-pointer"
        />
      </Link>

      <div className="flex items-center gap-5">
        {/* Total Spend Badge */}
        {showSpend && (
          <div className="px-2.5 py-2.5 bg-secondary rounded-full flex items-center gap-2">
            <CurrencyDollar
              size={22}
              weight="fill"
              className="text-brand-yellow"
            />
            <p className="text-sm text-foreground">
              <span className="font-medium">Total Spend :</span>{" "}
              <span>{formatCost(totalSpend)}</span>
            </p>
          </div>
        )}

        {/* User Avatar with Dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="size-11 bg-brand-blue rounded-full flex items-center justify-center cursor-pointer outline-none hover:opacity-90 transition-opacity">
              <span className="text-base font-medium text-white">
                {userInitials}
              </span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="min-w-[160px] bg-white rounded-xl shadow-lg border border-brand-border-light p-1.5 z-50 animate-in fade-in-0 zoom-in-95"
            >
              <DropdownMenu.Item
                onSelect={handleLogout}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-destructive rounded-lg cursor-pointer outline-none hover:bg-red-50 transition-colors"
              >
                <SignOut size={18} weight="bold" />
                <span>Log out</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
