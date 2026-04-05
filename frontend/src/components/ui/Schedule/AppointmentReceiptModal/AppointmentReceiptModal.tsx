import React from "react";
import { Modal, PrimaryButton, DialogActions, SummaryList } from "@/components/ui";
import { PopulatedAppointment } from "@/common/types";

type Props = {
  open: boolean;
  onClose: () => void;
  appointment: PopulatedAppointment | null;
  appointmentType: "único" | "sostenido";
  patientName?: string;
  isLegalGuardian?: boolean;
};

function toDDMMYYYY(iso?: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatTime24h(isoDateTime?: string) {
  if (!isoDateTime) return "";
  const date = new Date(isoDateTime);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDate(isoDateTime?: string) {
  if (!isoDateTime) return "";
  const date = new Date(isoDateTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return toDDMMYYYY(`${year}-${month}-${day}`);
}

function getDayName(isoDateTime?: string) {
  if (!isoDateTime) return "";
  const date = new Date(isoDateTime);
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dayNames[date.getDay()];
}

export const AppointmentReceiptModal: React.FC<Props> = ({
  open,
  onClose,
  appointment,
  appointmentType,
  patientName,
  isLegalGuardian = false,
}) => {
  if (!open || !appointment) return null;

  const professionalName = appointment.professional
    ? `${appointment.professional.firstName} ${appointment.professional.lastName}`
    : "";
  
  const consultingRoomDescription = appointment.consultingRoom?.description ?? "";

  const items: Array<{ label: string; value: string }> = [
    { label: "Turno", value: `${appointmentType === "sostenido" && appointment.series?.id ? appointment.series.id : appointment.id}` },
  ];

  // Para turno sostenido, mostrar el día de la semana en lugar de la fecha
  if (appointmentType === "sostenido") {
    items.push({ label: "Día", value: getDayName(appointment.startTime) });
  } else {
    items.push({ label: "Fecha", value: formatDate(appointment.startTime) });
  }

  items.push({ label: "Horario", value: formatTime24h(appointment.startTime) });

  // Si es tutor legal, agregar paciente a cargo
  if (isLegalGuardian && patientName) {
    items.push({ label: "Paciente a cargo", value: patientName });
  }

  items.push(
    { label: "Profesional", value: professionalName },
    { label: "Consultorio", value: consultingRoomDescription },
    { label: "Tipo", value: appointmentType === "único" ? "Único" : "Sostenido" }
  );

  return (
    <Modal title="Constancia de turno" onClose={onClose}>

      <SummaryList items={items} />

      <DialogActions>
        <PrimaryButton onClick={onClose}>Volver</PrimaryButton>
      </DialogActions>
    </Modal>
  );
};
