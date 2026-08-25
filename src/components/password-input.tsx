"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type">;

// Password field with its own show/hide toggle. Desktop Edge draws a native
// reveal button, but Chrome, Firefox and every mobile browser draw nothing, so
// the control has to be ours for it to exist everywhere.
const PasswordInput = ({ className, ...props }: PasswordInputProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(
          "mt-1 block w-full rounded-md border border-border bg-background py-2 pl-3 pr-11 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
          className
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Keeps the tap target a comfortable size on touch screens without
        // widening the field's visual padding.
        className="absolute inset-y-0 right-0 mt-1 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
};

export default PasswordInput;
