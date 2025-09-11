"use client";

import * as React from "react";
import { format, parse, isValid, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DatePicker({
  value,
  onChange,
  className,
}: {
  value?: string | null;
  onChange: (date?: string) => void;
  className?: string;
}) {
  const [day, setDay] = React.useState<string>("");
  const [month, setMonth] = React.useState<string>("");
  const [year, setYear] = React.useState<string>("");

  React.useEffect(() => {
    if (value) {
      // O `value` pode ser "2024-06-06" ou um ISO string "2024-06-06T00:00:00Z".
      // `new Date('2024-06-06')` é interpretado como UTC, causando o erro de um dia a menos.
      // Para corrigir, pegamos apenas a parte da data (antes do 'T') e usamos `parse`,
      // que corretamente interpreta "yyyy-MM-dd" como uma data local.
      const dateString = value.split("T")[0];
      const date = parse(dateString, "yyyy-MM-dd", new Date());
      if (isValid(date)) {
        setDay(format(date, "dd"));
        setMonth(format(date, "MM"));
        setYear(format(date, "yyyy"));
      }
    } else {
      setDay("");
      setMonth("");
      setYear("");
    }
  }, [value]);

  const handleDateChange = (part: "day" | "month" | "year", val: string) => {
    let newDay = part === "day" ? val : day;
    const newMonth = part === "month" ? val : month;
    const newYear = part === "year" ? val : year;

    if (part === "day") setDay(val);
    if (part === "month") setMonth(val);
    if (part === "year") setYear(val);

    if (newDay && newMonth && newYear) {
      const daysInMonth = getDaysInMonth(new Date(parseInt(newYear, 10), parseInt(newMonth, 10) - 1));
      if (parseInt(newDay, 10) > daysInMonth) {
        newDay = String(daysInMonth);
        setDay(String(daysInMonth));
      }

      const newDateStr = `${newYear}-${newMonth}-${newDay}`;
      const newDate = parse(newDateStr, "yyyy-MM-dd", new Date());

      if (isValid(newDate)) {
        onChange(format(newDate, "yyyy-MM-dd"));
      }
    } else if (!val) {
      onChange(undefined);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: format(new Date(2000, i, 1), "MMMM", { locale: ptBR }),
  }));

  const daysInSelectedMonth = (year && month) ? getDaysInMonth(new Date(parseInt(year, 10), parseInt(month, 10) - 1)) : 31;
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1).padStart(2, "0"));

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      <Select value={day} onValueChange={(val) => handleDateChange("day", val)}>
        <SelectTrigger aria-label="Dia">
          <SelectValue placeholder="Dia" />
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {days.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month} onValueChange={(val) => handleDateChange("month", val)}>
        <SelectTrigger aria-label="Mês">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={(val) => handleDateChange("year", val)}>
        <SelectTrigger aria-label="Ano">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {years.map((y) => (
            <SelectItem key={y} value={y}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}