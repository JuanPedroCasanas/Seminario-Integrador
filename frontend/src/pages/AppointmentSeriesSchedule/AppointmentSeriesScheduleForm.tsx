import React from 'react';
import { FormField, Card, FilterBar, StickyCTA, ConfirmSeriesModal, WeekdaySelector, TimeSlotGrid } from '@/components/ui';
import { Page, SectionHeader } from '@/components/Layout';
import { Occupation, Patient, Professional } from '@/common/types';

type Weekday = { value: number; label: string };

type Props = {
  patients: Patient[];
  occupations: Occupation[];
  professionals: Professional[];
  loadingMeta: boolean;
  loadingProfessionals: boolean;
  loadingPatients: boolean;
  loadingAppointments: boolean;

  weekdays: Weekday[];
  hours: number[];
  availability: Map<string, boolean>;

  showPatientSelect: boolean;

  selectedOccupationId: number | undefined;
  selectedProfessionalId: number | null;
  selectedPatientId: number | null;
  selectedWeekday: number | null;
  selectedHour: number | null;
  validMonth: number;
  validYear: number;

  selectedOccupationName?: string;
  selectedProfessionalFullName?: string;

  onChangePatient: (id: number) => void;
  onChangeOccupation: (id: number) => void;
  onChangeProfessional: (id: number) => void;
  onChangeWeekday: (day: number) => void;
  onChangeHour: (hour: number) => void;

  onOpenConfirm: () => void;
  onCloseConfirm: () => void;
  onConfirm: () => void;
  confirmOpen: boolean;
  bookingState: 'idle' | 'submitting' | 'success' | 'error';
  canConfirm: boolean;
};

const fullName = (p?: Patient) => (p ? `${p.firstName} ${p.lastName}`.trim() : '');

export const AppointmentSeriesScheduleForm: React.FC<Props> = (props) => {
  const {
    occupations,
    professionals,
    patients,
    loadingMeta,
    loadingProfessionals,
    loadingPatients,
    loadingAppointments,

    weekdays,
    hours,
    availability,

    showPatientSelect,

    selectedOccupationId,
    selectedProfessionalId,
    selectedPatientId,
    selectedWeekday,
    selectedHour,
    validMonth,
    validYear,

    selectedOccupationName,
    selectedProfessionalFullName,

    onChangeOccupation,
    onChangeProfessional,
    onChangePatient,
    onChangeWeekday,
    onChangeHour,

    onOpenConfirm,
    onCloseConfirm,
    onConfirm,
    confirmOpen,
    bookingState,
    canConfirm,
  } = props;

  // Generar meses disponibles
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  const monthLabel = months.find((m) => m.value === validMonth)?.label ?? '';

  return (
    <Page>
      <SectionHeader title="Reservá turno sostenido" />

      {/* Filtros */}
      <FilterBar>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Paciente */}
          {showPatientSelect && (
            <FormField label="Paciente" htmlFor="sel-patient">
              <select
                id="sel-patient"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={selectedPatientId ?? ''}
                onChange={(e) => onChangePatient(Number(e.target.value))}
                disabled={loadingPatients}
              >
                <option value="">Seleccioná un paciente a cargo</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {/* Especialidad */}
          <FormField label="Especialidad" htmlFor="sel-occ">
            <select
              id="sel-occ"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={selectedOccupationId ?? ''}
              onChange={(e) => onChangeOccupation(Number(e.target.value))}
              disabled={loadingMeta || !selectedPatientId}
            >
              <option value="">
                {loadingMeta ? 'Cargando…' : 'Elegí una especialidad'}
              </option>
              {occupations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* Profesional */}
          <FormField label="Profesional" htmlFor="sel-pro">
            <select
              id="sel-pro"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={selectedProfessionalId ?? ''}
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
                  ? 'Cargando…'
                  : !selectedOccupationId
                  ? 'Primero elegí especialidad'
                  : loadingProfessionals
                  ? 'Cargando profesionales…'
                  : professionals.length
                  ? 'Elegí un profesional'
                  : 'Sin profesionales disponibles'}
              </option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Info de mes y año (solo lectura) */}
        <div className="mt-3 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
          <p className="text-sm text-cyan-800">
            <span className="font-semibold">ⓘ Válido para:</span> {monthLabel} {validYear}
          </p>
          <p className="text-xs text-cyan-700 mt-1">
            Los turnos sostenidos se reservan para el mes en curso.
          </p>
        </div>
      </FilterBar>

      {/* Día de la semana */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Día de la semana
          </h3>
          <WeekdaySelector
            weekdays={weekdays}
            selectedWeekday={selectedWeekday}
            onSelect={onChangeWeekday}
            disabled={!selectedProfessionalId}
          />
        </div>
      </Card>

      {/* Grilla de horarios */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Horario recurrente
          </h3>
          {loadingAppointments ? (
            <div className="text-sm text-gray-600 text-center py-8">
              Cargando horarios disponibles…
            </div>
          ) : (
            <TimeSlotGrid
              hours={hours}
              selectedWeekday={selectedWeekday}
              selectedHour={selectedHour}
              availability={availability}
              onSelect={onChangeHour}
              disabled={!selectedProfessionalId || selectedWeekday === null}
            />
          )}
        </div>

        <StickyCTA disabled={!canConfirm} onClick={onOpenConfirm}>
          Confirmar turno sostenido
        </StickyCTA>
      </Card>

      {/* Modal de confirmación */}
      <ConfirmSeriesModal
        open={confirmOpen}
        onClose={onCloseConfirm}
        onConfirm={onConfirm}
        bookingState={bookingState}
        summary={{
          paciente:
            patients.find((p) => p.id === selectedPatientId)
              ? fullName(patients.find((p) => p.id === selectedPatientId))
              : '',
          especialidad: selectedOccupationName ?? '',
          profesional: selectedProfessionalFullName ?? '',
          weekday: weekdays.find((w) => w.value === selectedWeekday)?.label ?? '',
          hour: selectedHour !== null ? `${selectedHour}:00hs` : '',
          month: monthLabel,
          year: validYear.toString(),
        }}
      />
    </Page>
  );
};
