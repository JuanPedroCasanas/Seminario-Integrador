import React, { useState, useRef } from 'react';
import { Toast } from '@/components/ui/Feedback/Toast';
import { ProfessionalLeaveForm } from './ProfessionalLeaveForm';
import { useAuth } from '@/common/utils/auth/AuthContext';
import { UserRole } from '@/common/types';

export default function ProfessionalLeave() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.Admin;
  const isProfessional = user?.role === UserRole.Professional;

  const myProfessionalId = user?.professional?.id ?? user?.id ?? null;

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // para que funcione la fecha de hoy
  const todayRef = useRef(new Date());
  const today = todayRef.current;

  // Selección
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(
    isProfessional ? myProfessionalId : null
  );
  const [startDate, setStartDate] = useState<string>(''); // ISO "YYYY-MM-DD"
  const [endDate, setEndDate] = useState<string>(''); // ISO "YYYY-MM-DD"

  // Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookingState, setBookingState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Confirmar licencia
  async function onConfirm() {
    if (!selectedProfessionalId || !startDate || !endDate) {
      setToast({ message: 'Completá todos los campos antes de confirmar.', type: 'error' });
      return;
    }

    setBookingState('submitting');

    // TODO: Cuando esté el backend, hacer la llamada aquí
    // const payload = {
    //   idProfessional: selectedProfessionalId,
    //   startDate,
    //   endDate,
    // };

    try {
      // Simulación de éxito (eliminar cuando esté el backend)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setToast({ message: 'Licencia solicitada correctamente (simulado).', type: 'success' });
      setBookingState('success');
      
      // Limpiar formulario
      setStartDate('');
      setEndDate('');
    } catch {
      setToast({ message: 'No se pudo solicitar la licencia.', type: 'error' });
      setBookingState('error');
    }
  }

  const canConfirm = selectedProfessionalId && startDate && endDate;

  return (
    <>
      <ProfessionalLeaveForm
        showProfessionalSelect={isAdmin}
        selectedProfessionalId={selectedProfessionalId}
        startDate={startDate}
        endDate={endDate}
        today={today}
        onChangeProfessional={setSelectedProfessionalId}
        onChangeStartDate={setStartDate}
        onChangeEndDate={setEndDate}
        onOpenConfirm={() => setConfirmOpen(true)}
        onCloseConfirm={() => {
          setConfirmOpen(false);
          setBookingState('idle');
        }}
        onConfirm={onConfirm}
        confirmOpen={confirmOpen}
        bookingState={bookingState}
        canConfirm={!!canConfirm}
      />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
