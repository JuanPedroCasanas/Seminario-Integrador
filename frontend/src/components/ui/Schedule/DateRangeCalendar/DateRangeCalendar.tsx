import React, { useMemo } from 'react';

type Props = {
  today: Date;
  startDate: string; // ISO "YYYY-MM-DD"
  endDate: string; // ISO "YYYY-MM-DD"
  onChangeStartDate: (date: string) => void;
  onChangeEndDate: (date: string) => void;
  disabled?: boolean;
};

const pad = (n: number) => n.toString().padStart(2, '0');

const toISO = (d: Date): string => {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};

export const DateRangeCalendar: React.FC<Props> = ({
  today,
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
  disabled = false,
}) => {
  const monthMeta = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();
    const jsDayToMonStart = (d: number) => (d === 0 ? 7 : d); // L=1..D=7
    const leadingBlanks = jsDayToMonStart(first.getDay()) - 1;
    const monthName = today.toLocaleString('es-AR', { month: 'long' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return { year, month, first, last, daysInMonth, leadingBlanks, monthName: capitalizedMonth };
  }, [today]);

  const daysArray = useMemo(() => {
    const { daysInMonth, leadingBlanks } = monthMeta;
    const items: (number | null)[] = [];
    for (let i = 0; i < leadingBlanks; i++) items.push(null);
    for (let d = 1; d <= daysInMonth; d++) items.push(d);
    return items;
  }, [monthMeta]);

  const handleDayClick = (dayNum: number) => {
    if (disabled) return;

    const { year, month } = monthMeta;
    const clickedDate = new Date(year, month, dayNum);
    const clickedISO = toISO(clickedDate);

    // Si ya hay un rango completo, empezar uno nuevo
    if (startDate && endDate) {
      onChangeStartDate(clickedISO);
      onChangeEndDate('');
      return;
    }

    // Si no hay fecha de inicio, setearla
    if (!startDate) {
      onChangeStartDate(clickedISO);
      return;
    }

    // Si hay fecha de inicio pero no de fin
    const startDateObj = new Date(startDate);
    
    if (clickedDate < startDateObj) {
      // Click antes del inicio: nuevo inicio
      onChangeStartDate(clickedISO);
      onChangeEndDate('');
    } else {
      // Click después o igual: es el fin
      onChangeEndDate(clickedISO);
    }
  };

  const dayState = (dayNum: number | null) => {
    if (dayNum === null) return { disabled: true, selected: false, inRange: false, iso: '' };

    const { year, month } = monthMeta;
    const d = new Date(year, month, dayNum);
    const iso = toISO(d);

    // Verificar si es domingo
    const isSunday = d.getDay() === 0;

    // Verificar si está en el pasado
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isPast = d < todayNormalized;

    const isDisabled = disabled || isSunday || isPast;

    // Verificar si está seleccionado (inicio o fin)
    const isSelected = iso === startDate || iso === endDate;

    // Verificar si está en el rango
    let isInRange = false;
    if (startDate && endDate) {
      isInRange = iso >= startDate && iso <= endDate;
    }

    return { disabled: isDisabled, selected: isSelected, inRange: isInRange, iso };
  };

  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-2">
        <h4 className="text-sm font-semibold text-gray-800">
          {monthMeta.monthName} {monthMeta.year}
        </h4>
      </div>

      {/* Grilla del calendario */}
      <div className="grid grid-cols-7 gap-1">
        {/* Encabezados de días */}
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-gray-600 py-1">
            {day}
          </div>
        ))}

        {/* Días del mes */}
        {daysArray.map((dayNum, i) => {
          if (dayNum === null) {
            return <div key={`blank-${i}`} className="aspect-square" />;
          }

          const { disabled: isDisabled, selected, inRange } = dayState(dayNum);

          return (
            <button
              key={dayNum}
              type="button"
              disabled={isDisabled}
              onClick={() => handleDayClick(dayNum)}
              className={[
                'aspect-square rounded text-xs font-medium transition-all',
                'focus:outline-none focus:ring-1 focus:ring-cyan-500',
                isDisabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : selected
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : inRange
                  ? 'bg-cyan-100 text-cyan-800'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-cyan-400 hover:bg-cyan-50',
              ].join(' ')}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-cyan-600"></div>
          <span>Inicio/Fin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-cyan-100"></div>
          <span>En el rango</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gray-100"></div>
          <span>No disponible</span>
        </div>
      </div>
    </div>
  );
};
