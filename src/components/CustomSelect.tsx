import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export default function CustomSelect({ options, value, onChange, placeholder, className = '', icon }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder || 'Chọn...';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex w-full items-center justify-between gap-2
          rounded-xl border-[1.5px] px-3.5 py-2.5 text-sm font-semibold
          outline-none transition-all duration-200
          ${isOpen
            ? 'border-indigo-400 dark:border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.12)] bg-white dark:bg-slate-800'
            : 'border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600'
          }
        `}
      >
        <span className="flex items-center gap-2 truncate">
          {icon && <span className="text-indigo-500 shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={`truncate ${selectedOption ? 'text-zinc-800 dark:text-slate-100' : 'text-zinc-400 dark:text-slate-500'}`}>
            {displayLabel}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-indigo-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className={`
            absolute left-0 right-0 z-50 mt-1.5
            max-h-64 overflow-y-auto
            rounded-xl border border-zinc-200 dark:border-slate-700
            bg-white dark:bg-slate-800
            shadow-xl shadow-black/8 dark:shadow-black/30
            animate-in fade-in slide-in-from-top-1 duration-150
            py-1
          `}
          style={{
            animation: 'selectDropIn 0.15s ease-out',
          }}
        >
          {options.map(option => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm
                  transition-colors duration-100
                  ${isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-slate-700/50 font-medium'
                  }
                `}
              >
                {option.icon && <span className="shrink-0">{option.icon}</span>}
                <span className="flex-1 truncate">{option.label}</span>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-indigo-500" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
