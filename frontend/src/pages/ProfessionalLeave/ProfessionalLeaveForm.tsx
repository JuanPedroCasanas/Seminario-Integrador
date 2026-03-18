import React, { useState, useEffect, useMemo } from 'react';
import { FormField, Card, FilterBar, StickyCTA, ConfirmLeaveModal, DateRangeCalendar } from '@/components/ui';
import { Page, SectionHeader } from '@/components/Layout';
import { Professional } from '@/common/types';
import { authFetch } from '@/common/utils/auth/AuthFetch';
import { API_BASE } from '@/lib/api';

type Props = {
  showProfessionalSelect: boolean;
  selectedProfessionalId: number | null;
  startDate: string; // ISO "YYYY-MM-DD"
  endDate: string; // ISO "YYYY-MM-DD"
  today: Date;

  onChangeProfessional: (id: number) => void;
  onChangeStartDate: (date: string) => void;
  onChangeEndDate: (date: string) => void;

  onOpenConfirm: () => void;
  onCloseConfirm: () => void;
  onConfirm: () => void;
  confirmOpen: boolean;
  bookingState: 'idle' | 'submitting' | 'success' | 'error';
  canConfirm: boolean;
};

const fullName = (p?: Professional) => (p ? `${p.firstName} ${p.lastName}`.trim() : '');

export const ProfessionalLeaveForm: React.FC<Props> = (props) => {
  const {
    showProfessionalSelect,
    selectedProfessionalId,
    startDate,
    endDate,
    today,

    onChangeProfessional,
    onChangeStartDate,
    onChangeEndDate,

    onOpenConfirm,
    onCloseConfirm,
    onConfirm,
    confirmOpen,
    bookingState,
    canConfirm,
  } = props;

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(false);

  // Cargar profesionales si es admin
  useEffect(() => {
    if (!showProfessionalSelect) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingProfessionals(true);
        const res = await authFetch(`${API_BASE}/professional/getAll?includeInactive=false`);
        if (!res.ok) return;

        const pros: Professional[] = await res.json();
        if (!cancelled) setProfessionals(pros);
      } catch {
        // Silenciar error
      } finally {
        if (!cancelled) setLoadingProfessionals(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showProfessionalSelect]);

  // Formatear fechas para mostrar
  const formatDateRange = () => {
    if (!startDate || !endDate) return '';
    
    const formatDate = (iso: string) => {
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    };

    if (startDate === endDate) {
      return formatDate(startDate);
    }
    return `Del ${formatDate(startDate)} al ${formatDate(endDate)}`;
  };

  return (
    <Page>
      <SectionHeader title="Solicitar licencia" />

      {/* Filtros (solo si es admin) */}
      {showProfessionalSelect && (
        <FilterBar>
          <FormField label="Profesional" htmlFor="sel-pro">
            <select
              id="sel-pro"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={selectedProfessionalId ?? ''}
              onChange={(e) => onChangeProfessional(Number(e.target.value))}
              disabled={loadingProfessionals}
            >
              <option value="">
                {loadingProfessionals ? 'Cargando profesionales…' : 'Elegí un profesional'}
              </option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {fullName(p)}
                </option>
              ))}
            </select>
          </FormField>
        </FilterBar>
      )}

      {/* Calendario para seleccionar rango */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Seleccionar fechas de licencia</h3>
          <DateRangeCalendar
            today={today}
            startDate={startDate}
            endDate={endDate}
            onChangeStartDate={onChangeStartDate}
            onChangeEndDate={onChangeEndDate}
            disabled={!selectedProfessionalId}
          />

          {startDate && endDate && (
            <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
              <p className="text-sm text-cyan-800">
                <span className="font-semibold">Rango seleccionado:</span> {formatDateRange()}
              </p>
            </div>
          )}
        </div>

        <StickyCTA disabled={!canConfirm} onClick={onOpenConfirm}>
          Solicitar
        </StickyCTA>
      </Card>

      {/* Modal de confirmación */}
      <ConfirmLeaveModal
        open={confirmOpen}
        onClose={onCloseConfirm}
        onConfirm={onConfirm}
        bookingState={bookingState}
        summary={{
          professional: showProfessionalSelect
            ? fullName(professionals.find((p) => p.id === selectedProfessionalId))
            : undefined,
          dateRange: formatDateRange(),
        }}
      />
    </Page>
  );
};
