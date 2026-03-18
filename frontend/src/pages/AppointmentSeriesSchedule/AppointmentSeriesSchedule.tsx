import React, { useEffect, useMemo, useState } from 'react';
import { Toast } from '@/components/ui/Feedback/Toast';
import { HandleAppointmentControllerResponse, HandleOccupationControllerResponse, HandleProfessionalControllerResponse } from '@/common/utils';
import { AppointmentSeriesScheduleForm } from './AppointmentSeriesScheduleForm';
import { Appointment, Occupation, Patient, Professional, UserRole } from '@/common/types';
import { authFetch } from '@/common/utils/auth/AuthFetch';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/common/utils/auth/AuthContext';

// Días de la semana (1=lunes, 6=sábado)
const WEEKDAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

// Horarios de 8 a 20hs
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // [8, 9, 10, ..., 20]

export default function AppointmentSeriesSchedule() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.Admin;
  const isPatient = user?.role === UserRole.Patient;
  const isLegalGuardian = user?.role === UserRole.LegalGuardian;

  const myPatientId = user?.patient?.id ?? user?.id ?? null;
  const myLegalGuardianId = user?.legalGuardian?.id ?? (isLegalGuardian ? user?.id : null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Catálogos
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingProfessionals, setLoadingProfessionals] = useState(false);

  // Pacientes
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Filtros / selección
  const [selectedOccupationId, setSelectedOccupationId] = useState<Occupation['id'] | undefined>(undefined);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  // Mes y año fijos (mes actual)
  const validMonth = new Date().getMonth() + 1; // 1-12
  const validYear = new Date().getFullYear();

  // Turnos disponibles del profesional
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookingState, setBookingState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Carga según rol
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingPatients(true);

        if (isPatient) {
          if (!cancelled) {
            setPatients([]);
            setSelectedPatientId(myPatientId);
          }
          return;
        }

        if (isLegalGuardian) {
          const res = await authFetch(
            `${API_BASE}/patient/getByLegalGuardian/${myLegalGuardianId}?includeInactive=false`
          );
          if (!res.ok) return;

          const data: Patient[] = await res.json();
          if (!cancelled) {
            setPatients(data);
            setSelectedPatientId(null);
          }
          return;
        }

        if (isAdmin) {
          const res = await authFetch(`${API_BASE}/patient/getAll?includeInactive=false`);
          if (!res.ok) return;

          const data: Patient[] = await res.json();
          if (!cancelled) {
            setPatients(data);
            setSelectedPatientId(null);
          }
        }
      } catch {
        // Silenciar error
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPatient, isLegalGuardian, isAdmin, myPatientId, myLegalGuardianId]);

  // Cargar especialidades
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await authFetch(`${API_BASE}/occupation/getAll?includeInactive=false`);
        if (!res.ok) {
          const toastData = await HandleOccupationControllerResponse(res);
          if (!cancelled) setToast(toastData);
          return;
        }
        const occs: Occupation[] = await res.json();
        if (!cancelled) setOccupations(occs);
      } catch {
        if (!cancelled) setToast({ message: 'No se pudieron cargar las especialidades.', type: 'error' });
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Filtro de profesionales según especialidad
  useEffect(() => {
    setSelectedProfessionalId(null);
    setSelectedWeekday(null);
    setSelectedHour(null);
    setProfessionals([]);
    setAppointments([]);

    if (!selectedOccupationId) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingProfessionals(true);
        const res = await authFetch(
          `${API_BASE}/professional/getProfessionalsByOccupation/${encodeURIComponent(String(selectedOccupationId))}?includeInactive=false`,
          { method: 'GET' }
        );
        if (!res.ok) {
          const toastData = await HandleProfessionalControllerResponse(res);
          if (!cancelled) setToast(toastData);
          return;
        }
        const pros: Professional[] = await res.json();
        if (!cancelled) setProfessionals(pros);
      } catch {
        if (!cancelled) {
          setToast({ message: 'No se pudieron cargar los profesionales.', type: 'error' });
          setProfessionals([]);
        }
      } finally {
        if (!cancelled) setLoadingProfessionals(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedOccupationId]);

  // Limpiar selección de hora cuando cambia el día de la semana
  useEffect(() => {
    setSelectedHour(null);
  }, [selectedWeekday]);

  // Cargar turnos disponibles del profesional en el mes actual
  useEffect(() => {
    setAppointments([]);
    if (!selectedProfessionalId) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingAppointments(true);

        const res = await authFetch(
          `${API_BASE}/appointment/getAvailableAppointmentsByProfessional/${selectedProfessionalId}`,
          { method: 'GET' }
        );

        if (!res.ok) {
          const toastData = await HandleAppointmentControllerResponse(res);
          if (!cancelled) setToast(toastData);
          return;
        }

        const all: Appointment[] = await res.json();

        // me parece que esto no debería ser necesario, dado que los turnos son solo de los modulos
        // ocupados, y eso es en el mes actual 
        // Filtrar por mes/año actual
        const start = new Date(validYear, validMonth - 1, 1);
        const end = new Date(validYear, validMonth, 0, 23, 59, 59);

        const inMonth = all.filter((a) => {
          const d = new Date(a.startTime ?? '');
          return d >= start && d <= end;
        });

        if (!cancelled) setAppointments(inMonth);
      } catch {
        if (!cancelled) {
          setToast({ message: 'Error al cargar horarios disponibles.', type: 'error' });
          setAppointments([]);
        }
      } finally {
        if (!cancelled) setLoadingAppointments(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedProfessionalId, validMonth, validYear]);

  // Calcular disponibilidad de cada combinación día/hora
  const availability = useMemo(() => {
    const map = new Map<string, boolean>();

    if (!selectedProfessionalId || appointments.length === 0) return map;

    const now = new Date();

    // Para cada combinación weekday-hour, verificar si TODOS los turnos están disponibles
    for (const weekday of WEEKDAYS) {
      for (const hour of HOURS) {
        const key = `${weekday.value}-${hour}`;

        // Buscar turnos que coincidan con este día de la semana y hora, POSTERIORES A AHORA
        const matchingAppointments = appointments.filter((a) => {
          const d = new Date(a.startTime ?? '');
          // getDay() devuelve 0=domingo, 1=lunes, etc. Necesitamos convertir
          const jsDay = d.getDay(); // 0-6
          const ourWeekday = jsDay === 0 ? 7 : jsDay; // 1-7, donde 1=lunes, 7=domingo

          return ourWeekday === weekday.value && d.getHours() === hour && d > now;
        });

        // Está disponible solo si:
        // 1. Hay al menos 1 turno en ese día/hora después de hoy
        // 2. TODOS están con status 'available'
        const isAvailable =
          matchingAppointments.length > 0 &&
          matchingAppointments.every((a) => a.status === 'available');

        map.set(key, isAvailable);
      }
    }

    return map;
  }, [appointments, selectedProfessionalId]);

  // Confirmar reserva de turno sostenido
  async function onConfirm() {
    if (!selectedProfessionalId || !selectedPatientId || selectedWeekday === null || selectedHour === null) {
      setToast({ message: 'Completá todos los campos antes de confirmar.', type: 'error' });
      return;
    }

    setBookingState('submitting');

    const payload = {
      idProfessional: selectedProfessionalId,
      idPatient: selectedPatientId,
      day: selectedWeekday,
      hour: selectedHour,
      validMonth: validMonth,
      validYear: validYear,
    };

    try {
      const res = await authFetch(`${API_BASE}/appointment/assignSeries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const toastData = await HandleAppointmentControllerResponse(res);
      setToast(toastData);

      if (!res.ok) {
        setBookingState('error');
        return;
      }

      setBookingState('success');
    } catch {
      setToast({ message: 'No se pudo confirmar el turno sostenido.', type: 'error' });
      setBookingState('error');
    }
  }

  const canConfirm =
    selectedPatientId &&
    selectedProfessionalId &&
    selectedWeekday !== null &&
    selectedHour !== null;

  return (
    <>
      <AppointmentSeriesScheduleForm
        patients={patients}
        loadingPatients={loadingPatients}
        selectedPatientId={selectedPatientId}
        onChangePatient={setSelectedPatientId}
        occupations={occupations}
        professionals={professionals}
        loadingMeta={loadingMeta}
        loadingProfessionals={loadingProfessionals}
        showPatientSelect={!isPatient}
        selectedOccupationId={selectedOccupationId}
        selectedProfessionalId={selectedProfessionalId}
        selectedWeekday={selectedWeekday}
        selectedHour={selectedHour}
        validMonth={validMonth}
        validYear={validYear}
        weekdays={WEEKDAYS}
        hours={HOURS}
        availability={availability}
        loadingAppointments={loadingAppointments}
        selectedOccupationName={occupations.find((s) => s.id === selectedOccupationId)?.name}
        selectedProfessionalFullName={
          professionals.find((p) => p.id === selectedProfessionalId)
            ? `${professionals.find((p) => p.id === selectedProfessionalId)!.firstName} ${professionals.find((p) => p.id === selectedProfessionalId)!.lastName}`
            : ''
        }
        onChangeOccupation={setSelectedOccupationId}
        onChangeProfessional={setSelectedProfessionalId}
        onChangeWeekday={setSelectedWeekday}
        onChangeHour={setSelectedHour}
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
