"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function DatePicker({
  value,
  onChange,
  className,
}: {
  value?: string | null;
  onChange: (date?: string) => void;
  className?: string;
}) {
  // O valor do formulário já está no formato 'yyyy-MM-dd'.
  // O input[type=date] também usa este formato.
  // Usamos `value || ""` para lidar com null/undefined e fornecer um valor válido para o input.
  const inputValue = value || "";

  return (
    <div className={cn("w-full", className)}>
      <label htmlFor="birthdate" className="sr-only">
        Data de Nascimento
      </label>
      <input
        id="birthdate"
        type="date"
        value={inputValue}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full justify-start text-left font-normal flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}