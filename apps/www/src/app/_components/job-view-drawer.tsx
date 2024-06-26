"use client";

import * as React from "react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAtom } from "jotai";

import { Sheet, SheetContent } from "@/components/ui/sheet";

import { activeAtom } from "../_store/job-view.store";
import { JobDetailClient } from "./job-detail.client";

export function JobViewDrawer() {
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useAtom(activeAtom);

  useEffect(() => {
    if (activeId) {
      window.history.pushState(
        {},
        "",
        `/${activeId}?${searchParams.toString()}`,
      );
    } else {
      window.history.pushState({}, "", `/?${searchParams.toString()}`);
    }
  }, [activeId, searchParams]);

  return (
    <Sheet
      open={!!activeId}
      onOpenChange={(val) => {
        if (!val) {
          setActiveId(null);
        }
      }}
    >
      <SheetContent
        side="left"
        className="min-w-full focus-visible:outline-0 md:min-w-[1000px]"
      >
        {activeId && (
          <JobDetailClient
            id={activeId}
            onClose={() => {
              setActiveId(null);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
