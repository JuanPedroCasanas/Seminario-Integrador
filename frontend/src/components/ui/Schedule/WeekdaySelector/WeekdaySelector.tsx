import React from 'react';

type Weekday = { value: number; label: string };

type Props = {
  weekdays: Weekday[];
  selectedWeekday: number | null;
  onSelect: (day: number) => void;
  disabled?: boolean;
};

export const WeekdaySelector: React.FC<Props> = ({
  weekdays,
  selectedWeekday,
  onSelect,
  disabled = false,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
      {weekdays.map((weekday) => {
        const isSelected = selectedWeekday === weekday.value;
        return (
          <button
            key={weekday.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(weekday.value)}
            className={[
              'px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2',
              disabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                : isSelected
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:border-cyan-400 hover:bg-cyan-50',
            ].join(' ')}
          >
            {weekday.label}
          </button>
        );
      })}
    </div>
  );
};
