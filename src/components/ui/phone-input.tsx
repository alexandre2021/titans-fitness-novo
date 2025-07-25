import React from 'react';
import { Input } from './input';
import { formatarTelefone } from '@/utils/formatters';

interface PhoneInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const telefoneFormatado = formatarTelefone(e.target.value);
      onChange?.(telefoneFormatado);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder="(11) 99999-9999"
        maxLength={15}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';