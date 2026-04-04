import React from "react";

import { FormField, Card, FilterBar,
  CalendarGrid, SlotsCarousel, StickyCTA, PrimaryButton
 } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";

import { fullName } from "./appointmentSchedule.helpers";
import { Occupation, Patient, Professional } from "@/common/types";

type Props = {
  // Tipo de turno
  appointmentType: 'único' | 'sostenido' | null;
  onChangeAppointmentType: (type: 'único' | 'sostenido') => void;

  // Pacientes
  patients: Patient[];
  loadingPatients: boolean;
  selectedPatientId: number | null;
  onChangePatient: (id: number) => void;
  showPatientSelect: boolean;

  // Especialidades y profesionales
  occupations: Occupation[];
  professionals: Professional[];
  loadingMeta: boolean;
  loadingProfessionals: boolean;
  selectedOccupationId: number | undefined;
  selectedProfessionalId: number | null;
  onChangeOccupation: (id: number) => void;
  onChangeProfessional: (id: number) => void;

  // Para turno ÚNICO
  monthLabel: string;
  daysArray: (number | null)[];
  dayState: (dayNum: number | null) => { disabled: boolean; available: boolean; iso: string };
  canOpenCalendar: boolean;
  loadingMonth: boolean;
  slots: string[];
  loadingSlots: boolean;
  selectedDateISO: string;
  selectedSlot: string;
  onPickDay: (iso: string) => void;
  onPickSlot: (h: string) => void;

  // Para turno SOSTENIDO
  availableDaysOfWeek: Array<{ value: number; label: string }>;
  availableHours: Array<{ value: number; label: string }>;
  selectedDay: number | null;
  selectedHour: number | null;
  onChangeDay: (day: number) => void;
  onChangeHour: (hour: number) => void;

  // Acciones
  onConfirmSingle: () => void;
  onConfirmSeries: () => void;
  onBack: () => void;
  bookingState: "idle" | "submitting" | "success" | "error";
  error?: string | null;
};

export const AppointmentScheduleForm: React.FC<Props> = (props) => {
  const {
    appointmentType,
    onChangeAppointmentType,

    patients,
    loadingPatients,
    selectedPatientId,
    onChangePatient,
    showPatientSelect,

    occupations,
    professionals,
    loadingMeta,
    loadingProfessionals,
    selectedOccupationId,
    selectedProfessionalId,
    onChangeOccupation,
    onChangeProfessional,

    monthLabel,
    daysArray,
    dayState,
    canOpenCalendar,
    loadingMonth,
    slots,
    loadingSlots,
    selectedDateISO,
    selectedSlot,
    onPickDay,
    onPickSlot,

    availableDaysOfWeek,
    availableHours,
    selectedDay,
    selectedHour,
    onChangeDay,
    onChangeHour,

    onConfirmSingle,
    onConfirmSeries,
    onBack,
    bookingState,
    error,
  } = props;

  const isSubmitting = bookingState === 'submitting';

  // Estado local para el tipo de turno temporal (antes de confirmar)
  const [tempAppointmentType, setTempAppointmentType] = React.useState<'único' | 'sostenido' | null>(null);

  // Validación para turno único
  const ctaDisabledSingle = !(selectedOccupationId && selectedProfessionalId && selectedDateISO && selectedSlot);
  
  // Validación para turno sostenido
  const ctaDisabledSeries = !(selectedOccupationId && selectedProfessionalId && selectedDay !== null && selectedHour !== null);

  // Si no se ha seleccionado tipo de turno, mostrar selector
  if (!appointmentType) {
    const canContinue = tempAppointmentType && (!showPatientSelect || selectedPatientId);

    return (
      <Page>
        <SectionHeader title="Reservar turno" />
        
        <Card>
          <div className="py-8">
            
            {/* Selector de paciente (solo para responsable legal) */}
            {showPatientSelect && (
              <div className="mb-8 max-w-md mx-auto">
                <FormField label="Seleccioná el paciente que asistirá al turno" htmlFor="sel-patient-initial">
                  <select
                    id="sel-patient-initial"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    value={selectedPatientId ?? ""}
                    onChange={(e) => onChangePatient(Number(e.target.value))}
                    disabled={loadingPatients}
                  >
                    <option value="">Seleccioná un paciente</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-6 text-[#213547]">
                Seleccioná el tipo de turno
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
                <button
                  onClick={() => setTempAppointmentType('único')}
                  className={`p-6 border-2 rounded-lg transition-all text-left ${
                    tempAppointmentType === 'único'
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-gray-300 hover:border-cyan-500 hover:bg-cyan-50'
                  }`}
                >
                  <div className="text-xl font-semibold mb-2 text-[#213547]">Turno Único</div>
                  <p className="text-sm text-gray-600">
                    Reservá un turno individual para una fecha y horario específico.
                  </p>
                </button>
                
                <button
                  onClick={() => setTempAppointmentType('sostenido')}
                  className={`p-6 border-2 rounded-lg transition-all text-left ${
                    tempAppointmentType === 'sostenido'
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-gray-300 hover:border-cyan-500 hover:bg-cyan-50'
                  }`}
                >
                  <div className="text-xl font-semibold mb-2 text-[#213547]">Turno Sostenido</div>
                  <p className="text-sm text-gray-600">
                    Reservá turnos recurrentes para el mismo día y hora durante el mes.
                  </p>
                </button>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-center gap-4 max-w-md mx-auto">
                <PrimaryButton 
                  variant="outline" 
                  onClick={onBack}
                >
                  Volver
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    if (tempAppointmentType) {
                      onChangeAppointmentType(tempAppointmentType);
                    }
                  }}
                  disabled={!canContinue}
                >
                  Continuar
                </PrimaryButton>
              </div>
            </div>
          </div>
        </Card>
      </Page>
    );
  }

  // Renderizado para TURNO ÚNICO
  if (appointmentType === 'único') {
    return (
      <Page>
        <SectionHeader title="Reservar turno único" />

        {/* Filtros */}
        <FilterBar>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* Paciente */}
            {showPatientSelect && (
              <FormField label="Paciente a cargo" htmlFor="sel-patient">
                <select
                  id="sel-patient"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  value={selectedPatientId ?? ""}
                  onChange={(e) => onChangePatient(Number(e.target.value))}
                  disabled={loadingPatients}
                >
                  <option value="">Seleccioná un paciente</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {/* Especialidad */}
            <FormField label="Especialidad" htmlFor="sel-occ-single">
              <select
                id="sel-occ-single"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={selectedOccupationId ?? ""}
                onChange={(e) => onChangeOccupation(Number(e.target.value))}
                disabled={loadingMeta || !selectedPatientId}
              >
                <option value="">
                  {loadingMeta ? "Cargando…" : "Elegí una especialidad"}
                </option>
                {occupations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Profesional */}
            <FormField label="Profesional" htmlFor="sel-pro-single">
              <select
                id="sel-pro-single"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={selectedProfessionalId ?? ""}
                onChange={(e) => onChangeProfessional(Number(e.target.value))}
                disabled={
                  loadingMeta ||
                  !selectedPatientId ||
                  !selectedOccupationId ||
                  loadingProfessionals ||
                  professionals.length === 0
                }
              >
                <option value="">
                  {loadingMeta
                    ? "Cargando…"
                    : !selectedOccupationId
                    ? "Primero elegí especialidad"
                    : loadingProfessionals
                    ? "Cargando profesionales…"
                    : professionals.length
                    ? "Elegí un profesional"
                    : "Sin profesionales disponibles"}
                </option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </FilterBar>

        {/* Calendario y Slots */}
        <Card>
          <CalendarGrid
            size="sm"
            monthLabel={monthLabel}
            daysArray={daysArray}
            dayState={dayState}
            selectedDateISO={selectedDateISO}
            canOpenCalendar={canOpenCalendar}
            loadingMonth={loadingMonth}
            onPickDay={onPickDay}
          />

          <SlotsCarousel
            slots={slots}
            selectedSlot={selectedSlot}
            loading={loadingSlots}
            onPickSlot={onPickSlot}
          />

          {/* Error */}
          {error && (
            <p className="text-red-600 text-sm mt-2">
              {error}
            </p>
          )}

          {/* CTA */}
          <StickyCTA 
            disabled={ctaDisabledSingle || isSubmitting} 
            onClick={onConfirmSingle}
          >
            {isSubmitting ? 'Reservando…' : 'Reservar'}
          </StickyCTA>
        </Card>
      </Page>
    );
  }

  // Renderizado para TURNO SOSTENIDO
  if (appointmentType === 'sostenido') {
    const currentMonth = new Date().toLocaleString('es-AR', { month: 'long' });
    const capitalizedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);

    return (
      <Page>
        <SectionHeader title="Reservar turno sostenido" />

          <div className="text-center mb-4">
            <p className="text-base text-[#213547]">
              <span className="font-semibold">MES:</span> {capitalizedMonth}
            </p>
          </div>
      

        {/* Filtros */}
        <FilterBar>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Paciente */}
            {showPatientSelect && (
              <FormField label="Paciente a cargo" htmlFor="sel-patient-series">
                <select
                  id="sel-patient-series"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  value={selectedPatientId ?? ""}
                  onChange={(e) => onChangePatient(Number(e.target.value))}
                  disabled={loadingPatients}
                >
                  <option value="">Seleccioná un paciente</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {/* Especialidad */}
            <FormField label="Especialidad" htmlFor="sel-occ-series">
              <select
                id="sel-occ-series"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={selectedOccupationId ?? ""}
                onChange={(e) => onChangeOccupation(Number(e.target.value))}
                disabled={loadingMeta || !selectedPatientId}
              >
                <option value="">
                  {loadingMeta ? "Cargando…" : "Elegí una especialidad"}
                </option>
                {occupations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Profesional */}
            <FormField label="Profesional" htmlFor="sel-pro-series">
              <select
                id="sel-pro-series"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={selectedProfessionalId ?? ""}
                onChange={(e) => onChangeProfessional(Number(e.target.value))}
                disabled={
                  loadingMeta ||
                  !selectedPatientId ||
                  !selectedOccupationId ||
                  loadingProfessionals ||
                  professionals.length === 0
                }
              >
                <option value="">
                  {loadingMeta
                    ? "Cargando…"
                    : !selectedOccupationId
                    ? "Primero elegí especialidad"
                    : loadingProfessionals
                    ? "Cargando profesionales…"
                    : professionals.length
                    ? "Elegí un profesional"
                    : "Sin profesionales disponibles"}
                </option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Día */}
            <FormField label="Día" htmlFor="sel-day-series">
              <select
                id="sel-day-series"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={selectedDay ?? ""}
                onChange={(e) => onChangeDay(Number(e.target.value))}
                disabled={!selectedProfessionalId || loadingMonth || availableDaysOfWeek.length === 0}
              >
                <option value="">
                  {loadingMonth
                    ? "Cargando…"
                    : !selectedProfessionalId
                    ? "Primero elegí un profesional"
                    : availableDaysOfWeek.length === 0
                    ? "Sin días disponibles"
                    : "Elegí un día"}
                </option>
                {availableDaysOfWeek.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Hora */}
            <FormField label="Hora" htmlFor="sel-hour-series">
              <select
                id="sel-hour-series"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={selectedHour ?? ""}
                onChange={(e) => onChangeHour(Number(e.target.value))}
                disabled={selectedDay === null || availableHours.length === 0}
              >
                <option value="">
                  {selectedDay === null
                    ? "Primero elegí un día"
                    : availableHours.length === 0
                    ? "Sin horarios disponibles"
                    : "Elegí un horario"}
                </option>
                {availableHours.map((hour) => (
                  <option key={hour.value} value={hour.value}>
                    {hour.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </FilterBar>

        {/* Error */}
        {error && (
          <Card>
            <p className="text-red-600 text-sm">
              {error}
            </p>
          </Card>
        )}

        {/* CTA */}
        <Card>
          <StickyCTA 
            disabled={ctaDisabledSeries || isSubmitting} 
            onClick={onConfirmSeries}
          >
            {isSubmitting ? 'Reservando…' : 'Reservar'}
          </StickyCTA>
        </Card>
      </Page>
    );
  }

  return null;
};

