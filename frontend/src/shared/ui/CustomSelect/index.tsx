import Select, { type OnChangeValue, type StylesConfig } from 'react-select';
import styles from './index.module.scss';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: readonly SelectOption[];
  value?: OnChangeValue<SelectOption, boolean>;
  onChange?: (option: OnChangeValue<SelectOption, boolean>) => void;
  placeholder?: string;
  isDisabled?: boolean;
  className?: string;
  isMulti?: boolean;
  isClearable?: boolean;
  isSearchable?: boolean;
  isDark?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Выберите значение...',
  isDisabled = false,
  className = '',
  isMulti = false,
  isClearable = false,
  isSearchable = true,
  isDark = true,
}: CustomSelectProps) {
  const CONTROL_BG = '#303030';
  const CONTROL_BORDER = '#4d4b4b';
  const CONTROL_TEXT = '#fff';
  const CONTROL_MUTED = '#a3a3a3';
  const MENU_BG = '#282727';
  const OPTION_HOVER = '#303030';
  const OPTION_SELECTED = '#204633';
  const OPTION_SELECTED_HOVER = '#142c20';

  const customStyles: StylesConfig<SelectOption, boolean> = {
    control: (base, { isFocused, selectProps }) => ({
      ...base,
      backgroundColor: isDark ? CONTROL_BG : '#ffffff',
      borderColor: isFocused ? '#2eaf71' : isDark ? CONTROL_BORDER : '#d1d5db',
      borderWidth: '1px',
      borderRadius: '6px',
      boxShadow: 'none',
      transition: 'border-color 150ms ease-in-out',
      '&:hover': {
        borderColor: isFocused ? '#2eaf71' : isDark ? CONTROL_BORDER : '#9ca3af',
      },
      minHeight: '44px',
      ...(selectProps.isMulti ? {} : { height: '44px' }),
      paddingTop: '0px',
      paddingBottom: '0px',
    }),
    valueContainer: (base, { selectProps }) => ({
      ...base,
      paddingTop: '0px',
      paddingBottom: '0px',
      ...(selectProps.isMulti
        ? {
            minHeight: '44px',
            flexWrap: 'wrap',
          }
        : {
            height: '44px',
            overflow: 'hidden',
          }),
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: isDark ? MENU_BG : '#ffffff',
      border: isDark ? `1px solid ${CONTROL_BORDER}` : '1px solid #e5e7eb',
      borderRadius: '6px',
      boxShadow: isDark ? '0 10px 26px rgba(0, 0, 0, 0.28)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      marginTop: '8px',
    }),

    menuList: (base) => ({
      ...base,
      maxHeight: '300px',
      paddingTop: '8px',
      paddingBottom: '8px',
    }),

    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected
        ? OPTION_SELECTED
        : isFocused
          ? isDark
            ? OPTION_HOVER
            : '#f3f4f6'
          : 'transparent',
      color: isSelected ? '#ffffff' : isDark ? CONTROL_TEXT : '#1f2937',
      cursor: 'pointer',
      padding: '10px 12px',
      transition: 'background-color 0.15s ease',
      fontWeight: isSelected ? '500' : '400',
      '&:hover': {
        backgroundColor: isSelected ? OPTION_SELECTED_HOVER : isDark ? OPTION_HOVER : '#f3f4f6',
      },
    }),

    multiValue: (base) => ({
      ...base,
      backgroundColor: OPTION_SELECTED,
      borderColor: CONTROL_BORDER,
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '6px',
      padding: '1px',
    }),

    multiValueLabel: (base) => ({
      ...base,
      color: '#ffffff',
      padding: '2px 8px',
      fontSize: '13px',
    }),

    multiValueRemove: (base) => ({
      ...base,
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
      '&:hover': {
        backgroundColor: OPTION_SELECTED_HOVER,
        color: '#ffffff',
      },
    }),

    singleValue: (base) => ({
      ...base,
      color: isDark ? CONTROL_TEXT : '#1f2937',
    }),

    input: (base) => ({
      ...base,
      color: isDark ? CONTROL_TEXT : '#1f2937',
      margin: '0px',
    }),

    placeholder: (base) => ({
      ...base,
      color: isDark ? CONTROL_MUTED : '#6b7280',
    }),

    dropdownIndicator: (base) => ({
      ...base,
      color: isDark ? CONTROL_MUTED : '#6b7280',
      transition: 'color 0.15s ease',
      '&:hover': {
        color: isDark ? CONTROL_TEXT : '#1f2937',
      },
    }),

    clearIndicator: (base) => ({
      ...base,
      color: isDark ? CONTROL_MUTED : '#6b7280',
      cursor: 'pointer',
      transition: 'color 0.15s ease',
      '&:hover': {
        color: isDark ? '#ef4444' : '#dc2626',
      },
    }),

    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: isDark ? CONTROL_BORDER : '#e5e7eb',
    }),

    noOptionsMessage: (base) => ({
      ...base,
      color: isDark ? CONTROL_MUTED : '#6b7280',
    }),

    loadingMessage: (base) => ({
      ...base,
      color: isDark ? CONTROL_MUTED : '#6b7280',
    }),
  };

  return (
    <div className={`${styles.selectContainer} ${className}`}>
      <Select
        options={options}
        value={value}
        onChange={(nextValue) => {
          onChange?.(nextValue);
        }}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isMulti={isMulti}
        isClearable={isClearable}
        isSearchable={isSearchable}
        styles={customStyles}
        classNamePrefix="custom-select"
        noOptionsMessage={() => 'Нет доступных опций'}
        formatOptionLabel={(option) => option.label}
      />
    </div>
  );
}
