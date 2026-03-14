"use client";

import Link from "next/link";
import Image from "next/image";
import { CurrencyDollar } from "@phosphor-icons/react";
import { formatCost } from "@/lib/utils";
import type { HeaderProps } from "@/types/components";

export function Header({ totalSpend = 0, userInitials = "PT" }: HeaderProps) {
  return (
    <header className="w-full px-6 py-3.5 bg-brand-off-white border-b border-brand-border-light flex items-center justify-between">
      <Link href="/dashboard" aria-label="Project Atlas home">
        <Image
          src="/logos/Logo.svg"
          alt="Project Atlas"
          width={42}
          height={42}
        />
      </Link>

      <div className="flex items-center gap-5">
        {/* Total Spend Badge */}
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

        {/* User Avatar */}
        <div className="size-11 bg-brand-blue rounded-full flex items-center justify-center">
          <span className="text-base font-medium text-white">
            {userInitials}
          </span>
        </div>
      </div>
    </header>
  );
}
