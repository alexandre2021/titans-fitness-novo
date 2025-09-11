"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { addMinutes, format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return isMobile;
};

export function DatePicker({
  value,
  onChange,
  className,
}: {
  value?: string | null;
  onChange: (date?: string) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();
  // O valor do input é 'yyyy-MM-dd'. Para evitar problemas de fuso horário
  // ao criar o objeto Date (que o interpreta como UTC), adicionamos 'T00:00:00'
  // para que seja interpretado na hora local do usuário.
  const date = value ? new Date(`${value}T00:00:00`) : undefined;

  const handleSelect = (selectedDate?: Date) => {
    if (selectedDate) {
      // `react-day-picker` pode retornar a data como meia-noite UTC.
      // Em fusos horários como o do Brasil (UTC-3), a função `format`
      // do date-fns a converteria para o dia anterior. Para corrigir isso,
      // ajustamos a data para o fuso horário local antes de formatar.
      const adjustedDate = addMinutes(selectedDate, selectedDate.getTimezoneOffset());
      onChange(format(adjustedDate, "yyyy-MM-dd"));
    } else {
      onChange(undefined);
    }
    setOpen(false);
  };

  const Trigger = (
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
  );

  const Content = (
    <Calendar
      mode="single"
      selected={date}
      defaultMonth={date}
      onSelect={handleSelect}
      initialFocus
      locale={ptBR}
      captionLayout="dropdown"
      fromYear={1940}
      toDate={new Date()}
      toYear={new Date().getFullYear()}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{Trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Selecione uma data</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">{Content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{Trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        {Content}
      </PopoverContent>
    </Popover>
  );
}