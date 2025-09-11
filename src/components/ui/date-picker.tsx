"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePicker({
  value,
  onChange,
  className,
}: {
  value?: string | null;
  onChange: (date?: string) => void;
  className?: string;
}) {
  // O valor do input é 'yyyy-MM-dd'. Para evitar problemas de fuso horário
  // ao criar o objeto Date (que o interpreta como UTC), adicionamos 'T00:00:00'
  // para que seja interpretado na hora local do usuário.
  const date = value ? new Date(`${value}T00:00:00`) : undefined;

  const handleSelect = (selectedDate?: Date) => {
    if (selectedDate) {
      // O formulário e o input 'date' nativo esperam o formato 'yyyy-MM-dd'.
      // A função `format` do date-fns formata corretamente sem problemas de fuso.
      onChange(format(selectedDate, "yyyy-MM-dd"));
    } else {
      onChange(undefined);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "PPP", { locale: ptBR })
          ) : (
            <span>Selecione uma data</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          locale={ptBR}
          captionLayout="dropdown"
          fromYear={1940}
          toYear={new Date().getFullYear()}
        />
      </PopoverContent>
    </Popover>
  );
}