import { Appointment } from "../../../model/entities/Appointment";
import { LegalGuardian } from "../../../model/entities/LegalGuardian";
import { Patient } from "../../../model/entities/Patient";
import { Professional } from "../../../model/entities/Professional";
import { wrap } from "@mikro-orm/core";

export interface DetailedAppointmentDTO {
  // Appointment
  id: number;
  startTime: Date;
  endTime: Date;
  status: string;

  healthInsurance: {
    id: number | undefined; 
    name: string | undefined;
  };


  patient: Patient | undefined;

  legalGuardian?: LegalGuardian | undefined;

  professional: Professional;

  consultingRoom: {
    id: number;
    description: string;
  };

  series?: {
    id: number;
    validMonth: number;
    validYear: number;
  } | undefined;
}

export function toDetailedAppointmentDTO(
  appointment: Appointment
): DetailedAppointmentDTO {
  // Obtener series usando wrap para asegurar que esté inicializada
  const series = appointment.series;
  const seriesData = series && wrap(series).isInitialized() ? {
    id: series.id,
    validMonth: series.validMonth,
    validYear: series.validYear,
  } : undefined;

  return {
    // Appointment
    id: appointment.id,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,

    // Health insurance
    healthInsurance: {
      id: appointment.healthInsurance?.id,
      name: appointment.healthInsurance?.name,
    },

    // Patient
    patient: appointment.patient,

    // Legal guardian (solo si existe)
    legalGuardian: appointment.legalGuardian,

    // Professional
    professional: appointment.professional,

    // Consulting room
    consultingRoom: {
      id: appointment.module.consultingRoom.id,
      description: appointment.module.consultingRoom.description,
    },

    // Series (solo si existe)
    series: seriesData,
  };
}

export function toDetailedAppointmentDTOList(
  appointments: Appointment[]
): DetailedAppointmentDTO[] {
  return appointments.map(toDetailedAppointmentDTO);
}
