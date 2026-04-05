import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from '@/components/ui/Feedback/Toast';

import {
  getMonthMeta,
  toISO,
  isPast,
  deriveAvailableDaysForMonth,
  deriveFreeSlotsForDay,
  fullName,
  getLocalDateISOFromStart,
} from './appointmentSchedule.helpers';

import { HandleAppointmentControllerResponse, 
  HandleOccupationControllerResponse, 
  HandleProfessionalControllerResponse } from '@/common/utils';

import { AppointmentScheduleForm } from './AppointmentScheduleForm';
import { Appointment, Occupation, Patient, PopulatedAppointment, Professional, UserRole } from '@/common/types';
import { authFetch } from '@/common/utils/auth/AuthFetch';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/common/utils/auth/AuthContext';
import { AppointmentReceiptModal } from '@/components/ui';

export default function AppointmentSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === UserRole.Admin;
  const isPatient = user?.role === UserRole.Patient;
  const isLegalGuardian = user?.role === UserRole.LegalGuardian;

  const myPatientId = user?.patient?.id ?? user?.id ?? null;

  const myLegalGuardianId =  user?.legalGuardian?.id  ??
     (isLegalGuardian ? user?.id : null);


  // para el manejo de errores
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // para que funcione la fecha de hoy
  const todayRef = useRef(new Date());
  const today = todayRef.current;

  // Tipo de turno
  const [appointmentType, setAppointmentType] = useState<'único' | 'sostenido' | null>(null);

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
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [selectedDateISO, setSelectedDateISO] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  // Para turno sostenido
  const [selectedDay, setSelectedDay] = useState<number | null>(null); // DayOfWeek enum value
  const [selectedHour, setSelectedHour] = useState<number | null>(null); // Hour (0-23)

  // Turnos
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal de confirmación / constancia
  const [showReceipt, setShowReceipt] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState<PopulatedAppointment | null>(null);
  const [bookingState, setBookingState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');


// === carga según rol ===
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingPatients(true);

        // rol paciente
        if (isPatient) {
          if (!cancelled) {
            setPatients([]);
            setSelectedPatientId(myPatientId);
          }
          return;
        }

        // rol responsable legal
        if (isLegalGuardian) {
          const res = await authFetch(
            `${API_BASE}/patient/getByLegalGuardian/${myLegalGuardianId}?includeInactive=false`
          );
          if (!res.ok) return;

          const data: Patient[] = await res.json();
          if (!cancelled) {
            setPatients(data);
            setSelectedPatientId(null); // debe elegir
          }
          return;
        }

        // rol admin
        if (isAdmin) {
          const res = await authFetch(`${API_BASE}/patient/getAll`);
          if (!res.ok) return;

          const all: Patient[] = await res.json();
          const actives = all.filter(p => p.isActive);
          if (!cancelled) {
            setPatients(actives);
            setSelectedPatientId(null);
          }
        }
      } catch {
        if (!cancelled) {
          setToast({ message: "No se pudieron cargar los pacientes.", type: "error" });
        }
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isAdmin, isPatient, isLegalGuardian, user, myLegalGuardianId, myPatientId]);


  // Al cambiar de paciente: resetear todo lo dependiente
  useEffect(() => {
    // si no hay paciente, limpiar filtros y turnos
    setSelectedOccupationId(undefined);
    setProfessionals([]);
    setSelectedProfessionalId(null);
    setSelectedAppointmentId(null);
    setSelectedDateISO('');
    setSelectedSlot('');
    setSelectedDay(null);
    setSelectedHour(null);
    setAppointments([]);
  }, [selectedPatientId]);

  // Al cambiar tipo de turno: resetear selecciones
  useEffect(() => {
    setSelectedOccupationId(undefined);
    setProfessionals([]);
    setSelectedProfessionalId(null);
    setSelectedAppointmentId(null);
    setSelectedDateISO('');
    setSelectedSlot('');
    setSelectedDay(null);
    setSelectedHour(null);
    setAppointments([]);
  }, [appointmentType]);


  // especialidades (todas)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingMeta(true);
        const res = await authFetch(`${API_BASE}/occupation/getAll`, { method: 'GET' });
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

  // filtro de profesionales según especialidad
  useEffect(() => {
    setSelectedProfessionalId(null);
    setSelectedAppointmentId(null);
    setSelectedDateISO('');
    setSelectedSlot('');
    setSelectedDay(null);
    setSelectedHour(null);
    setProfessionals([]);

    if (!selectedOccupationId) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingProfessionals(true);
        const res = await authFetch(
          `${API_BASE}/professional/getProfessionalsByOccupation/${encodeURIComponent(String(selectedOccupationId))}?includeInactive=false`,
          { method: 'GET' },
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

  // ====== Turnos del mes (solo para ÚNICO) ======
  const currentMonthMeta = useMemo(() => getMonthMeta(today), [today]);
  useEffect(() => {
    if (appointmentType !== 'único') return;
    
    setSelectedDateISO('');
    setSelectedSlot('');
    if (!selectedProfessionalId) return;

    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoadingMonth(true);

        const res = await authFetch(`${API_BASE}/appointment/getAvailableAppointmentsByProfessional/${selectedProfessionalId}`, { 
          method: 'GET' 
        });

        if (!res.ok) {
          const toastData = await HandleAppointmentControllerResponse(res);
          if (!cancelled) setToast(toastData);
          return;
        }

        const all: Appointment[] = await res.json();
      
        const { year, month } = currentMonthMeta;
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);

        const inMonth = all.filter(a => {
          const iso = getLocalDateISOFromStart(a); // "YYYY-MM-DD" local
          const [Y, M, D] = iso.split('-').map(Number);
          const d = new Date(Y, M - 1, D);
          return d >= start && d <= end;
        });

        if (!cancelled) setAppointments(inMonth);
      } 
      catch {
        if (!cancelled) {
          setToast({ message: 'Error al cargar turnos.', type: 'error' });
          setAppointments([]);
        }
      } finally {
        if (!cancelled) setLoadingMonth(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedProfessionalId, currentMonthMeta, appointmentType]);

  // ====== Turnos del mes (para SOSTENIDO - para obtener días disponibles) ======
  useEffect(() => {
    if (appointmentType !== 'sostenido') return;
    
    setSelectedDay(null);
    setSelectedHour(null);
    if (!selectedProfessionalId) return;

    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoadingMonth(true);

        const res = await authFetch(`${API_BASE}/appointment/getAvailableAppointmentsByProfessional/${selectedProfessionalId}`, { 
          method: 'GET' 
        });

        if (!res.ok) {
          const toastData = await HandleAppointmentControllerResponse(res);
          if (!cancelled) setToast(toastData);
          return;
        }

        const all: Appointment[] = await res.json();
      
        const { year, month } = currentMonthMeta;
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);

        const inMonth = all.filter(a => {
          const iso = getLocalDateISOFromStart(a); // "YYYY-MM-DD" local
          const [Y, M, D] = iso.split('-').map(Number);
          const d = new Date(Y, M - 1, D);
          return d >= start && d <= end;
        });

        if (!cancelled) setAppointments(inMonth);
      } 
      catch {
        if (!cancelled) {
          setToast({ message: 'Error al cargar turnos.', type: 'error' });
          setAppointments([]);
        }
      } finally {
        if (!cancelled) setLoadingMonth(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedProfessionalId, currentMonthMeta, appointmentType]);

  // ====== Derivados de UI (para ÚNICO) ======
  const daysArray = useMemo(() => {
    const { daysInMonth, leadingBlanks } = currentMonthMeta;
    const items: (number | null)[] = [];
    for (let i = 0; i < leadingBlanks; i++) items.push(null);
    for (let d = 1; d <= daysInMonth; d++) items.push(d);
    return items;
  }, [currentMonthMeta]);

  const monthLabel = useMemo(() => {
    const { monthName } = currentMonthMeta;
    const cap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return `${cap} ${today.getFullYear()}`;
  }, [currentMonthMeta, today]);

  const availableDays = useMemo(() => {
    if (!selectedProfessionalId) return new Set<string>();
    return deriveAvailableDaysForMonth(appointments, selectedProfessionalId, today);
  }, [appointments, selectedProfessionalId, today]);

  const slots = useMemo(() => {
    if (!selectedProfessionalId || !selectedDateISO) return [];
    return deriveFreeSlotsForDay(appointments, selectedProfessionalId, selectedDateISO);
  }, [appointments, selectedProfessionalId, selectedDateISO]);


  const slotIdMap = useMemo(() => {
    // Mapea "HH:mm" (local) -> appointment.id del día seleccionado
    const map = new Map<string, number>();
    if (!selectedProfessionalId || !selectedDateISO) return map;

    // Recorremos los appointments del profesional en ese día (local)
    for (const a of appointments) {
      if (String(a.professional) !== String(selectedProfessionalId)) continue;
      if (getLocalDateISOFromStart(a) !== selectedDateISO) continue;
      if (a.status !== 'available') continue;

      // Convertir startTime UTC -> hora local HH:mm (igual a deriveFreeSlotsForDay)
      const d = new Date(a.startTime ?? '');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const hhmm = `${hh}:${mm}`;

      // Guardamos el id (si hay duplicados de hora por cualquier motivo, el último pisa al anterior)
      map.set(hhmm, a.id ?? 0);
    }
    return map;
  }, [appointments, selectedProfessionalId, selectedDateISO]);

  useEffect(() => {
    if (!selectedProfessionalId || !selectedDateISO) {
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
    const t = setTimeout(() => setLoadingSlots(false), 250);
    return () => clearTimeout(t);
  }, [selectedProfessionalId, selectedDateISO]);

  const canOpenCalendar = !loadingMeta && selectedProfessionalId !== null;

  function dayState(dayNum: number | null) {
    if (dayNum === null) return { disabled: true, available: false, iso: '' };
    const d = new Date(today.getFullYear(), today.getMonth(), dayNum);
    const iso = toISO(d);
    const isSunday = d.getDay() === 0;
    const past = isPast(d);
    const available = !!selectedProfessionalId && availableDays.has(iso);
    const disabled = past || isSunday || !available || !canOpenCalendar;
    return { disabled, available, iso };
  }

  // ====== Derivados para SOSTENIDO ======
  
  // Días disponibles para turno sostenido (agrupados por día de la semana)
  const availableDaysOfWeek = useMemo(() => {
    if (appointmentType !== 'sostenido' || !selectedProfessionalId) return [];
    
    const now = new Date();
    const daysMap = new Map<number, { count: number; available: number }>();
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    // Las fechas en la BD están en hora local (Argentina), así que las parseamos tal cual
    for (const a of appointments) {
      if (String(a.professional) !== String(selectedProfessionalId)) continue;
      
      const d = new Date(a.startTime ?? '');
      if (d <= now) continue; // Solo turnos futuros
      
      const dayOfWeek = d.getDay(); // Día en hora local
      
      // Solo días laborales (lunes a sábado)
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        if (!daysMap.has(dayOfWeek)) {
          daysMap.set(dayOfWeek, { count: 0, available: 0 });
        }
        const stats = daysMap.get(dayOfWeek)!;
        stats.count++;
        if (a.status === 'available') {
          stats.available++;
        }
      }
    }
    
    // Solo mostrar días donde al menos hay un horario con todos los turnos disponibles
    const validDays: Array<{ value: number; label: string }> = [];
    for (const [dayOfWeek, stats] of daysMap.entries()) {
      if (stats.available > 0) {
        validDays.push({ value: dayOfWeek, label: dayNames[dayOfWeek] });
      }
    }
    
    return validDays.sort((a, b) => a.value - b.value);
  }, [appointments, selectedProfessionalId, appointmentType]);

  // Horas disponibles para el día seleccionado en turno sostenido
  const availableHours = useMemo(() => {
    if (appointmentType !== 'sostenido' || !selectedProfessionalId || selectedDay === null) return [];
    
    const now = new Date();
    
    // Calcular cuántos días de ese tipo quedan en el mes actual (después de hoy)
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    let expectedDaysCount = 0;
    for (let day = now.getDate() + 1; day <= lastDayOfMonth; day++) {
      const testDate = new Date(currentYear, currentMonth, day);
      if (testDate.getDay() === selectedDay) {
        expectedDaysCount++;
      }
    }
    
    const hoursMap = new Map<number, { count: number; available: number }>();
    
    // Contar turnos por hora para el día seleccionado
    for (const a of appointments) {
      if (String(a.professional) !== String(selectedProfessionalId)) continue;
      
      const d = new Date(a.startTime ?? '');
      if (d <= now) continue; // Solo turnos futuros
      
      const dayOfWeek = d.getDay();
      
      if (dayOfWeek === selectedDay) {
        const hour = d.getHours();
        
        if (!hoursMap.has(hour)) {
          hoursMap.set(hour, { count: 0, available: 0 });
        }
        const stats = hoursMap.get(hour)!;
        stats.count++;
        if (a.status === 'available') {
          stats.available++;
        }
      }
    }
    
    // Solo mostrar horas donde:
    // 1. TODOS los turnos que existen están disponibles
    // 2. La cantidad de turnos disponibles coincide con la cantidad esperada de días
    const validHours: Array<{ value: number; label: string }> = [];
    for (const [hour, stats] of hoursMap.entries()) {
      if (
        stats.available === expectedDaysCount && 
        stats.count === stats.available
      ) {
        validHours.push({
          value: hour,
          label: `${String(hour).padStart(2, '0')}:00 hs`
        });
      }
    }
    
    return validHours.sort((a, b) => a.value - b.value);
  }, [appointments, selectedProfessionalId, selectedDay, appointmentType]);

  // ====== Confirmar turno ÚNICO ======
  async function onConfirmSingle() {
    if (!selectedOccupationId || !selectedProfessionalId || !selectedDateISO || !selectedSlot) return;
    setBookingState('submitting');
    setError(null);

    const payload = {
      idAppointment: selectedAppointmentId,
      idPatient: selectedPatientId,
    };

    try {
      
      if (!selectedPatientId) {
        setToast({
          message: "Seleccioná un paciente antes de confirmar el turno.",
          type: "error",
        });
        setBookingState('idle');
        return;
      }
      
      if (!selectedAppointmentId) {
        setToast({ message: 'Elegí un horario válido antes de confirmar.', type: 'error' });
        setBookingState('error');
        return;
      }

      const res = await authFetch(`${API_BASE}/appointment/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const toastData = await HandleAppointmentControllerResponse(res);
        setToast(toastData);
        setBookingState('error');
        return;
      }

      // Obtener el turno completo (populated) para mostrar en la constancia
      const result = await res.json();
      const appointmentId = result.appointment?.id;
      
      if (appointmentId && selectedPatientId) {
        // Usar endpoint del paciente que devuelve datos completos poblados
        const detailRes = await authFetch(`${API_BASE}/appointment/getAppointmentsByPatient/${selectedPatientId}`, { method: 'GET' });
        if (detailRes.ok) {
          const patientAppts: PopulatedAppointment[] = await detailRes.json();
          const fullAppt = patientAppts.find(a => a.id === appointmentId);
          if (fullAppt) {
            setBookedAppointment(fullAppt);
            setShowReceipt(true);
            setBookingState('success');
          }
        }
      }

    } catch {
      setToast({ message: 'No se pudo confirmar el turno.', type: 'error' });
      setBookingState('error');
    }
  }

  // ====== Confirmar turno SOSTENIDO ======
  async function onConfirmSeries() {
    if (!selectedProfessionalId || !selectedPatientId || selectedDay === null || selectedHour === null) return;
    setBookingState('submitting');
    setError(null);

    const { year, month } = currentMonthMeta;

    const payload = {
      idProfessional: selectedProfessionalId,
      idPatient: selectedPatientId,
      day: selectedDay, // DayOfWeek enum (1=lunes, 2=martes, etc.)
      hour: selectedHour, // 0-23
      validMonth: month + 1, // JavaScript month is 0-indexed, backend expects 1-indexed
      validYear: year,
    };

    console.log('🔍 DEBUG - Enviando payload:', payload);
    
    // Debug: ver TODOS los turnos del profesional (viernes 11:00, cualquier estado)
    console.log('🔍 DEBUG - TODOS los turnos del profesional (viernes 11:00):');
    appointments
      .filter(a => {
        if (String(a.professional) !== String(selectedProfessionalId)) return false;
        const d = new Date(a.startTime ?? '');
        return d.getDay() === selectedDay && d.getHours() === selectedHour;
      })
      .forEach(a => {
        const d = new Date(a.startTime ?? '');
        console.log(`  - ${a.startTime} → ${d.toLocaleString()} → Status: ${a.status} → ID: ${a.id}`);
      });
    
    console.log('🔍 DEBUG - Turnos disponibles para verificar:', appointments.filter(a => {
      const d = new Date(a.startTime ?? '');
      return d.getDay() === selectedDay && d.getHours() === selectedHour && a.status === 'available';
    }).length);
    
    // Debug: ver las fechas exactas de esos turnos
    const matchingAppts = appointments.filter(a => {
      const d = new Date(a.startTime ?? '');
      return d.getDay() === selectedDay && d.getHours() === selectedHour && a.status === 'available';
    });
    console.log('🔍 DEBUG - Fechas de los turnos coincidentes:');
    matchingAppts.forEach(a => {
      const d = new Date(a.startTime ?? '');
      console.log(`  - ${a.startTime} → Local: ${d.toLocaleString()} → Day: ${d.getDay()}, Hour: ${d.getHours()}`);
    });

    try {
      const res = await authFetch(`${API_BASE}/appointment/assignSeries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const toastData = await HandleAppointmentControllerResponse(res);
        setToast(toastData);
        setBookingState('error');
        return;
      }

      // Obtener el primer turno de la serie para mostrar en la constancia
      const result = await res.json();
      const appointments = result.appointment;
      
      if (appointments && appointments.length > 0 && selectedPatientId) {
        // Buscar el primer appointment de la serie con datos completos
        const firstApptId = appointments[0].id;
        
        // Usar endpoint del paciente que devuelve datos completos poblados
        const detailRes = await authFetch(`${API_BASE}/appointment/getAppointmentsByPatient/${selectedPatientId}`, { method: 'GET' });
        if (detailRes.ok) {
          const patientAppts: PopulatedAppointment[] = await detailRes.json();
          const fullAppt = patientAppts.find(a => a.id === firstApptId);
          if (fullAppt) {
            setBookedAppointment(fullAppt);
            setShowReceipt(true);
            setBookingState('success');
          }
        }
      }

    } catch {
      setToast({ message: 'No se pudo confirmar el turno sostenido.', type: 'error' });
      setBookingState('error');
    }
  }

  // ====== Navegar de vuelta al portal ======
  function handleBackToPortal() {
    setShowReceipt(false);
    setBookingState('idle');
    
    // Navegar según el rol
    if (isPatient) {
      navigate('/patient-portal');
    } else if (isLegalGuardian) {
      navigate('/legal-guardian-portal');
    } else if (isAdmin) {
      navigate('/');
    } else {
      navigate('/');
    }
  }

  const selectedPatientName = patients.find(p => p.id === selectedPatientId)
    ? `${patients.find(p => p.id === selectedPatientId)!.firstName} ${patients.find(p => p.id === selectedPatientId)!.lastName}`
    : "";

  return (
  <>
  <AppointmentScheduleForm
    // Tipo de turno
    appointmentType={appointmentType}
    onChangeAppointmentType={setAppointmentType}
    
    // Pacientes
    patients={patients}
    loadingPatients={loadingPatients}
    selectedPatientId={selectedPatientId}
    onChangePatient={setSelectedPatientId}
    showPatientSelect={!isPatient}
    
    // Especialidades y profesionales
    occupations={occupations}
    professionals={professionals}
    loadingMeta={loadingMeta}
    loadingProfessionals={loadingProfessionals}
    selectedOccupationId={selectedOccupationId}
    selectedProfessionalId={selectedProfessionalId}
    onChangeOccupation={setSelectedOccupationId}
    onChangeProfessional={setSelectedProfessionalId}
    
    // Para turno ÚNICO
    monthLabel={monthLabel}
    daysArray={daysArray}
    dayState={dayState}
    canOpenCalendar={canOpenCalendar}
    loadingMonth={loadingMonth}
    slots={slots}
    loadingSlots={loadingSlots}
    selectedDateISO={selectedDateISO}
    selectedSlot={selectedSlot}
    onPickDay={(iso) => {
      setSelectedDateISO(iso);
      setSelectedSlot('');
      setSelectedAppointmentId(null);
    }}
    onPickSlot={(hhmm: string) => {
      setSelectedSlot(hhmm);
      setSelectedAppointmentId(slotIdMap.get(hhmm) ?? null);
    }}
    
    // Para turno SOSTENIDO
    availableDaysOfWeek={availableDaysOfWeek}
    availableHours={availableHours}
    selectedDay={selectedDay}
    selectedHour={selectedHour}
    onChangeDay={setSelectedDay}
    onChangeHour={setSelectedHour}
    
    // Acciones
    onConfirmSingle={onConfirmSingle}
    onConfirmSeries={onConfirmSeries}
    onBack={handleBackToPortal}
    bookingState={bookingState}
    error={error}
  />

   {/* Toast 
    {toast && (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
      />
    )}*/}

    {/* Modal de constancia */}
    <AppointmentReceiptModal
      open={showReceipt}
      onClose={handleBackToPortal}
      appointment={bookedAppointment}
      appointmentType={appointmentType ?? 'único'}
      patientName={selectedPatientName}
      isLegalGuardian={isLegalGuardian}
    />
    
  </>

  );
}
