import React from 'react';
import { PrimaryButton, SummaryList, DialogActions, Modal } from '@/components/ui';

type BookingState = 'idle' | 'submitting' | 'success' | 'error';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookingState: BookingState;
  summary: {
    paciente?: string;
    especialidad?: string;
    profesional?: string;
    weekday?: string; // Ej: "Lunes"
    hour?: string; // Ej: "14:00hs"
    month?: string; // Ej: "Enero"
    year?: string; // Ej: "2026"
  };
};

export const ConfirmSeriesModal: React.FC<Props> = ({
  open,
  onClose,
  onConfirm,
  bookingState,
  summary,
}) => {
  if (!open) return null;

  const { paciente, especialidad, profesional, weekday, hour, month, year } = summary;

  const isSubmitting = bookingState === 'submitting';
  const isSuccess = bookingState === 'success';
  const isError = bookingState === 'error';

  return (
    <Modal
      title={isSuccess ? 'Turno sostenido confirmado' : 'Confirmar turno sostenido'}
      onClose={onClose}
    >
      {/* Body */}
      {!isSuccess ? (
        <>
          <div className="mb-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
            <p className="text-sm text-cyan-800 font-medium">
              ⓘ Estás por reservar un turno sostenido
            </p>
            <p className="text-xs text-cyan-700 mt-1">
              Se reservarán TODOS los {weekday?.toLowerCase()} del mes seleccionado a las {hour}.
            </p>
          </div>

          <SummaryList
            items={[
              { label: 'Paciente', value: paciente ?? '' },
              { label: 'Especialidad', value: especialidad ?? '' },
              { label: 'Profesional', value: profesional ?? '' },
              { label: 'Día recurrente', value: `Todos los ${weekday?.toLowerCase()}` ?? '' },
              { label: 'Hora', value: hour ?? '' },
              { label: 'Válido para', value: `${month} ${year}` },
            ]}
          />

          {isError && (
            <p className="text-red-600 text-sm mt-2">
              Ocurrió un error al confirmar el turno sostenido.
            </p>
          )}
        </>
      ) : (
        <div className="text-center py-2">
          <div className="w-16 h-16 mx-auto rounded-full border border-cyan-300 bg-cyan-50 text-cyan-600 grid place-items-center text-2xl mb-2">
            ✓
          </div>
          <p className="text-[#213547] font-medium">Turno sostenido confirmado</p>
          <p className="text-sm text-gray-600 mt-1">
            Tus turnos fueron registrados correctamente.
          </p>
        </div>
      )}

      {/* Actions */}
      <DialogActions>
        {!isSuccess ? (
          <>
            <PrimaryButton variant="outline" onClick={onClose}>
              Cancelar
            </PrimaryButton>
            <PrimaryButton onClick={onConfirm} disabled={isSubmitting}>
              {isSubmitting ? 'Confirmando…' : 'Confirmar todos'}
            </PrimaryButton>
          </>
        ) : (
          <PrimaryButton onClick={onClose}>Aceptar</PrimaryButton>
        )}
      </DialogActions>
    </Modal>
  );
};
