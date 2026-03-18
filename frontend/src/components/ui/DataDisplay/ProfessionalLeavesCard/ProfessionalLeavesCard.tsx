import React, { useState } from 'react';
import { EmptyState, PrimaryButton } from '@/components/ui';

// Tipo temporal hasta que esté el backend
type LeaveStatus = 'vigente' | 'cancelada';

type ProfessionalLeave = {
  id: number;
  startDate: string; // ISO
  endDate: string; // ISO
  status: LeaveStatus;
};

// Datos mock para visualización (eliminar cuando esté el backend)
const MOCK_LEAVES: ProfessionalLeave[] = [
  {
    id: 1,
    startDate: '2026-03-25',
    endDate: '2026-03-28',
    status: 'vigente',
  },
  {
    id: 2,
    startDate: '2026-04-10',
    endDate: '2026-04-15',
    status: 'vigente',
  },
  {
    id: 3,
    startDate: '2026-02-01',
    endDate: '2026-02-05',
    status: 'cancelada',
  },
];

const STATUS_LABEL_ES: Record<LeaveStatus, string> = {
  vigente: 'Vigente',
  cancelada: 'Cancelada',
};

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const formatDateRange = (start: string, end: string) => {
  if (start === end) {
    return formatDate(start);
  }
  return `Del ${formatDate(start)} al ${formatDate(end)}`;
};

export default function ProfessionalLeavesCard() {
  // TODO: Cuando esté el backend, reemplazar por useEffect con fetch real
  const [leaves] = useState<ProfessionalLeave[]>(MOCK_LEAVES);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loading = false; // TODO: agregar loading real cuando esté el backend

  // Función para cancelar licencia
  const cancelLeave = async (idLeave: number) => {
    if (!confirm('¿Confirmás cancelar esta licencia?')) return;

    setUpdatingId(idLeave);

    try {
      // TODO: Cuando esté el backend, hacer la llamada aquí
      // const res = await authFetch(`${API_BASE}/leave/cancel`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ idLeave }),
      // });

      // Simulación (eliminar cuando esté el backend)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Actualizar estado cuando esté el backend
      console.log('Licencia cancelada (simulado):', idLeave);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const renderLeaveItem = (leave: ProfessionalLeave) => {
    const isVigente = leave.status === 'vigente';
    const isUpdating = updatingId === leave.id;

    return (
      <li
        key={leave.id}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm hover:bg-gray-50 transition"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-900 font-medium">
              {formatDateRange(leave.startDate, leave.endDate)}
            </p>
            <p className="text-[12px] text-gray-500">ID licencia: {leave.id}</p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            {/* Estado */}
            <span
              className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border',
                isVigente
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-600 border-red-200',
              ].join(' ')}
            >
              {STATUS_LABEL_ES[leave.status]}
            </span>

            {/* Botón cancelar (solo si está vigente) */}
            {isVigente && (
              <PrimaryButton
                size="sm"
                variant="outline"
                disabled={isUpdating}
                onClick={() => cancelLeave(leave.id)}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                {isUpdating ? 'Cancelando…' : 'Cancelar licencia'}
              </PrimaryButton>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div>
      <div className="p-4 sm:p-5">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Mis licencias</h3>

        {/* Loading */}
        {loading && <div className="text-sm text-gray-600">Cargando licencias…</div>}

        {/* Vacío */}
        {!loading && leaves.length === 0 && (
          <EmptyState
            title="No tenés licencias"
            description="Cuando solicites una licencia, va a aparecer acá."
            icon={
              <svg className="w-12 h-12 text-cyan-600" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM7 12h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"
                />
              </svg>
            }
          />
        )}

        {/* Lista de licencias */}
        {!loading && leaves.length > 0 && (
          <ul className="space-y-3">{leaves.map(renderLeaveItem)}</ul>
        )}
      </div>
    </div>
  );
}
