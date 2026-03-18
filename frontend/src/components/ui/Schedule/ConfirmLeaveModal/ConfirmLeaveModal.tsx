import React from 'react';
import { PrimaryButton, SummaryList, DialogActions, Modal } from '@/components/ui'

type BookingState = 'idle' | 'submitting' | 'success' | 'error';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookingState: BookingState;
  summary: {
    professional?: string;
    dateRange?: string;
  };
};

export const ConfirmLeaveModal: React.FC<Props> = ({
  open,
  onClose,
  onConfirm,
  bookingState,
  summary,
}) => {
  if (!open) return null;

  const { professional, dateRange } = summary;

  const isSubmitting = bookingState === 'submitting';
  const isSuccess = bookingState === 'success';
  const isError = bookingState === 'error';

  return (
    <Modal
      title={isSuccess ? 'Licencia solicitada' : 'Confirmar solicitud de licencia'}
      onClose={onClose}
    >
      {/* Body */}
      {!isSuccess ? (
        <>
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ Atención
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Al confirmar esta licencia, todos los turnos reservados en el rango de fechas seleccionado serán <strong>cancelados automáticamente</strong>.
            </p>
          </div>

          <SummaryList
            items={[
              ...(professional ? [{ label: 'Profesional', value: professional }] : []),
              { label: 'Período', value: dateRange ?? '' },
            ]}
          />

          {isError && (
            <p className="text-red-600 text-sm mt-2">
              Ocurrió un error al solicitar la licencia.
            </p>
          )}
        </>
      ) : (
        <div className="text-center py-2">
          <div className="w-16 h-16 mx-auto rounded-full border border-cyan-300 bg-cyan-50 text-cyan-600 grid place-items-center text-2xl mb-2">
            ✓
          </div>
          <p className="text-[#213547] font-medium">Licencia solicitada correctamente</p>
          <p className="text-sm text-gray-600 mt-1">
            La licencia fue registrada para el período seleccionado.
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
              {isSubmitting ? 'Solicitando…' : 'Confirmar licencia'}
            </PrimaryButton>
          </>
        ) : (
          <PrimaryButton onClick={onClose}>Aceptar</PrimaryButton>
        )}
      </DialogActions>
    </Modal>
  );
};
