import * as React from "react";

import { cn } from "@/lib/utils";

/** Native select styled like the inputs: reliable on tablets and with gloves. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "flex h-12 w-full rounded-md border-2 border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
