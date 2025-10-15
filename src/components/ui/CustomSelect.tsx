import React, { useMemo } from 'react';
import Select, {
  Props as SelectProps,
  type GroupBase,
  type ClassNamesConfig,
  type StylesConfig,
} from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { cn } from '@/lib/utils';

// Define a standard option type
export interface CustomSelectOption {
  label: string;
  value: string | number;
}

// Extend the props to include our custom ones if any
export type CustomSelectProps<
  Option extends CustomSelectOption,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
> = SelectProps<Option, IsMulti, Group> & {
  isCreatable?: boolean;
  formatCreateLabel?: (inputValue: string) => React.ReactNode;
};

function CustomSelectComponent<
  Option extends CustomSelectOption,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({
  className,
  isCreatable,
  ...props
}: CustomSelectProps<Option, IsMulti, Group>) {
  const classNames: ClassNamesConfig<Option, IsMulti, Group> = useMemo(
    () => ({
      control: (state) =>
        cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          state.isFocused && 'outline-none ring-2 ring-ring ring-offset-2',
          className
        ),
      valueContainer: () => 'p-0 gap-1',
      input: () => 'm-0 p-0 text-sm',
      placeholder: () => 'text-muted-foreground',
      singleValue: () => 'text-foreground',
      indicatorSeparator: () => 'bg-transparent',
      dropdownIndicator: (state) =>
        cn('text-muted-foreground transition-transform', state.selectProps.menuIsOpen && 'rotate-180'),
      menu: () =>
        'my-2 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md z-[9999]',
      menuList: () => 'max-h-60 p-1',
      option: (state) =>
        cn(
          'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none',
          state.isFocused && 'bg-primary/10 text-primary',
          state.isSelected && 'bg-primary text-primary-foreground',
          state.isDisabled && 'pointer-events-none opacity-50'
        ),
      noOptionsMessage: () => 'p-2 text-sm text-muted-foreground',
    }),
    [className]
  );

  const customStyles: StylesConfig<Option, IsMulti, Group> = useMemo(
    () => ({
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    }),
    []
  );

  const commonProps = {
    unstyled: true,
    classNames: classNames,
    styles: customStyles,
    isSearchable: false,
    blurInputOnSelect: true,
    captureMenuScroll: false,
    menuPosition: "fixed" as const,
    menuPortalTarget: document.body,
    ...props,
  };

  if (isCreatable) {
    return (
      <CreatableSelect
        {...commonProps}
      />
    );
  }

  return <Select {...commonProps} />;
}

const CustomSelect = React.memo(CustomSelectComponent) as typeof CustomSelectComponent;

export default CustomSelect;