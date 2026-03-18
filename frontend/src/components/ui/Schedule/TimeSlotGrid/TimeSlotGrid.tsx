import React from 'react';

type Props = {
  hours: number[];
  selectedWeekday: number | null;
  selectedHour: number | null;
  availability: Map<string, boolean>;
  onSelect: (hour: number) => void;
  disabled?: boolean;
};

export const TimeSlotGrid: React.FC<Props> = ({
  hours,
  selectedWeekday,
  selectedHour,
  availability,
  onSelect,
  disabled = false,
}) => {
  if (disabled) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Primero seleccioná un día de la semana
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2">
        {hours.map((hour) => {
          const key = `${selectedWeekday}-${hour}`;
          const isAvailable = availability.get(key) ?? false;
          const isSelected = selectedHour === hour;

          return (
            <button
              key={hour}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && onSelect(hour)}
              className={[
                'px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                isSelected
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-md focus:ring-cyan-500'
                  : isAvailable
                  ? 'bg-green-50 text-green-700 border-green-300 hover:border-green-500 hover:bg-green-100 focus:ring-green-500'
                  : 'bg-red-50 text-red-400 border-red-200 cursor-not-allowed',
              ].join(' ')}
            >
              {hour}:00
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-green-300 bg-green-50"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-red-200 bg-red-50"></div>
          <span>No disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-cyan-600 bg-cyan-600"></div>
          <span>Seleccionado</span>
        </div>
      </div>
    </div>
  );
};
