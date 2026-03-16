"use client";

// -- next
import Link from "next/link";

// -- icons
import { PlayIcon } from "@phosphor-icons/react";

function SideCard({ className }: { className?: string }) {
  return (
    <div
      className={`w-[170px] bg-[#FAF9F5] rounded-md shadow-lg border border-[#E5E5E5] p-2 ${className ?? ""}`}
    >
      {/* Large filled beige thumbnail rectangle */}
      <div className="h-10 bg-[#E1DACD7A] rounded-sm" />
      {/* Details below thumbnail */}
      <div className="mt-2 px-0.5 flex flex-col gap-1.5">
        {/* Full-width line */}
        <div className="w-full h-1.5 bg-[#F0EEE7] rounded-sm" />
        {/* 4 tag blocks evenly spaced */}
        <div className="flex gap-1">
          <div className="flex-1 h-1.5 bg-[#E1DACD]" />
          <div className="flex-1 h-1.5 bg-[#E1DACD]" />
          <div className="flex-1 h-1.5 bg-[#E1DACD]" />
          <div className="flex-1 h-1.5 bg-[#E1DACD]" />
        </div>
      </div>
    </div>
  );
}

export function EmptyStateHero() {
  return (
    <div className="flex flex-col items-center mt-16 sm:mt-24 relative px-4">
      {/* Browser Window + Side Cards wrapper */}
      <div className="relative w-[400px] max-w-[90vw]">
        {/* Left Side Card */}
        <SideCard className="hidden md:block absolute top-[60%] -translate-y-1/2 -left-28 z-10" />

        {/* Right Side Card */}
        <SideCard className="hidden md:block absolute top-[60%] -translate-y-1/2 -right-28 z-10" />

        {/* Browser Header — traffic lights + URL bar */}
        <div className="w-full h-11 relative bg-white rounded-t-2xl border border-b border-[#E5E5E5">
          <div className="flex items-center gap-1.5 absolute left-4 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 bg-destructive rounded-full" />
            <div className="w-3 h-3 bg-highlight rounded-full" />
            <div className="w-3 h-3 bg-primary rounded-full" />
          </div>
          <div className="h-6 absolute left-24 right-[28px] top-1/2 -translate-y-1/2 bg-[#EFF2F7] rounded-lg" />
        </div>

        {/* Browser Content Area */}
        <div
          className="w-full relative pt-16 pb-5"
          style={{
            background:
              "linear-gradient(to bottom, #F1F1F1, #F0F3F3B2, #EFF8F700)",
            borderLeft: "1px solid",
            borderRight: "1px solid",
            borderImage: "linear-gradient(to bottom, #E5E5E5, #F4FBFA00) 1",
          }}
        >
          {/* Central Card wrapper — relative so badge positions off it */}
          <div className="relative mx-auto w-[62%]">
            {/* "Videos" tab — flush on top-left edge of card, rounded top only */}
            <div className="absolute bottom-full left-2.5 z-20">
              <div className="px-2 bg-brand-green rounded-t-lg">
                <span className="text-white text-[11px] font-semibold tracking-wide">
                  Videos
                </span>
              </div>
            </div>

            {/* Center Card */}
            <div className="bg-white rounded-md shadow-md border border-[#ddd8d1]/60 p-2.5">
              {/* Video thumbnail — filled beige area with play button */}
              <div className="h-24 bg-[#e5e1da] rounded-md border border-[#d8d3cb]/60 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#FAF9F5] shadow border flex items-center justify-center">
                  <PlayIcon
                    size={16}
                    weight="fill"
                    className="text-[#989897] ml-[2px]"
                  />
                </div>
              </div>

              {/* Card detail lines */}
              <div className="mt-3 mb-1 px-[2px] flex flex-col gap-[8px]">
                {/* Title — short, darker */}
                <div className="w-[35%] h-2.5 bg-[#E1DACD] rounded-sm" />
                {/* Subtitle — full width, lighter */}
                <div className="w-full h-2.5 bg-[#F0EEE7] rounded-sm" />
                {/* Tag row — 4 evenly spread */}
                <div className="flex gap-1">
                  <div className="flex-1 h-2.5 bg-[#E1DACD] rounded-sm" />
                  <div className="flex-1 h-2.5 bg-[#E1DACD] rounded-sm" />
                  <div className="flex-1 h-2.5 bg-[#E1DACD] rounded-sm" />
                  <div className="flex-1 h-2.5 bg-[#E1DACD] rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Text Content */}
      <div className="flex flex-col items-center gap-1.5 mt-4">
        <h3 className="text-center text-foreground text-lg font-semibold leading-6">
          From idea to publish-ready video-Powered by AI
        </h3>
        <p className="text-center text-muted-foreground text-base max-w-lg">
          Fully scripted, voiced and edited by AI. No tools, no timeline, no
          experience needed.
        </p>
        <Link
          href="/projects/new"
          className="mt-4 px-4 py-2.5 bg-brand-black rounded-full text-brand-off-white text-sm font-medium hover:opacity-80 transition-opacity duration-200"
        >
          Create New Project
        </Link>
      </div>
    </div>
  );
}
