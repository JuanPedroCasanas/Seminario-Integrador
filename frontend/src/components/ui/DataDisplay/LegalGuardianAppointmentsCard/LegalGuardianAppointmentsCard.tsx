// LegalGuardianAppointmentsCard
import { useEffect, useMemo, useState } from "react";
import { EmptyState, Toast, PrimaryButton, Modal } from "@/components/ui";
import { API_BASE } from "@/lib/api";
import { authFetch } from "@/common/utils/auth/AuthFetch";
import { HandleAppointmentControllerResponse } from "@/common/utils";
import { useAuth } from "@/common/utils/auth/AuthContext";
import type { PopulatedAppointment, Professional } from "@/common/types";

const capitalize = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// Helper para obtener nombre completo del profesional
const fullNameProfessional = (p?: Professional) =>
  `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim();

// Helper para obtener nombre completo del paciente
const fullNamePatient = (a: PopulatedAppointment) =>
  `${(a as any)?.patient?.firstName ?? ""} ${(a as any)?.patient?.lastName ?? ""}`.trim();

// Helper para formatear fecha: "dd/mm/yyyy"
const formatDateES = (iso: string) => {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper para formatear solo horario en 24hs: "14:30"
const formatTimeES = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// Helper para obtener día de la semana: "Lunes"
const getDayOfWeekES = (iso: string) => {
  const d = new Date(iso);
  return capitalize(d.toLocaleDateString("es-AR", { weekday: "long" }));
};

export default function LegalGuardianAppointmentsCard() {
  const { user } = useAuth();
  const myLegalGuardianId = user?.legalGuardian?.id ?? user?.id;

  const [appointments, setAppointments] = useState<PopulatedAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Estado para el modal de cancelación
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<PopulatedAppointment | null>(null);
  const [canceling, setCanceling] = useState(false);

  // Carga inicial
  useEffect(() => {
    const load = async () => {
      if (!myLegalGuardianId) return;

      setLoading(true);
      try {
        const res = await authFetch(
          `${API_BASE}/appointment/getAppointmentsByLegalGuardian/${myLegalGuardianId}`,
        );

        if (!res.ok) {
          const toastData = await HandleAppointmentControllerResponse(res);
          setToast(toastData);
          return;
        }

        const data = await res.json();
        setAppointments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setToast({ message: "Error al cargar los turnos", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [myLegalGuardianId]);

  // Filtrar solo próximos turnos con estado "scheduled" (reservado)
  const upcomingScheduled = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter((a) => a.startTime && new Date(a.startTime).getTime() >= now)
      .filter((a) => a.status === "scheduled")
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  }, [appointments]);

  // Agrupar turnos: sostenidos (con series) vs únicos (sin series)
  const { seriesMap, singles } = useMemo(() => {
    const seriesMap = new Map<number, PopulatedAppointment[]>();
    const singles: PopulatedAppointment[] = [];

    for (const a of upcomingScheduled) {
      if (a.series?.id) {
        const existing = seriesMap.get(a.series.id) || [];
        existing.push(a);
        seriesMap.set(a.series.id, existing);
      } else {
        singles.push(a);
      }
    }

    return { seriesMap, singles };
  }, [upcomingScheduled]);

  // Abrir modal de confirmación
  const openCancelModal = (appointment: PopulatedAppointment) => {
    setAppointmentToCancel(appointment);
    setCancelModalOpen(true);
  };

  // Cerrar modal
  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setAppointmentToCancel(null);
  };

  // Confirmar cancelación
  const confirmCancelAppointment = async () => {
    if (!appointmentToCancel?.id) return;

    setCanceling(true);
    try {
      // Si es un turno sostenido, cancelar todos los turnos de la serie
      if (appointmentToCancel.series?.id) {
        const seriesAppointments = appointments.filter(
          a => a.series?.id === appointmentToCancel.series?.id
        );

        // Cancelar cada turno de la serie
        for (const appointment of seriesAppointments) {
          if (appointment.id) {
            await authFetch(`${API_BASE}/appointment/updateStatus`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idAppointment: appointment.id, status: "canceled" as const }),
            });
          }
        }

        setToast({ message: "Serie de turnos cancelada exitosamente", type: "success" });
        
        // Remover todos los turnos de la serie
        setAppointments(prev => 
          prev.filter(a => a.series?.id !== appointmentToCancel.series?.id)
        );
      } else {
        // Turno único
        const res = await authFetch(`${API_BASE}/appointment/updateStatus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idAppointment: appointmentToCancel.id,
            status: "canceled" as const,
          }),
        });

        if (!res.ok) {
          const toastData = await HandleAppointmentControllerResponse(res);
          setToast(toastData);
          return;
        }

        const data = await res.json();
        setToast({
          message: data?.message ?? "Turno cancelado exitosamente",
          type: "success",
        });

        // Remover el turno de la lista
        setAppointments((prev) =>
          prev.filter((a) => a.id !== appointmentToCancel.id)
        );
      }

      closeCancelModal();
    } catch (err) {
      console.error(err);
      setToast({ message: "Error al cancelar el turno", type: "error" });
    } finally {
      setCanceling(false);
    }
  };

  // Renderizar turno único
  const renderSingleAppointment = (a: PopulatedAppointment) => {
    const isSeries = !!a.series?.id;
    return (
      <div
        key={a.id}
        className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm"
      >
        <div className="space-y-1 mb-3">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Turno {a.id}</span>
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Fecha:</span>{" "}
            {a.startTime ? formatDateES(a.startTime) : "—"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Horario:</span>{" "}
            {a.startTime ? formatTimeES(a.startTime) : "—"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Paciente a cargo:</span>{" "}
            {fullNamePatient(a) || "—"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Profesional:</span>{" "}
            {fullNameProfessional(a.professional)}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Consultorio:</span>{" "}
            {a.consultingRoom?.description ?? "—"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Tipo:</span>{" "}
            {isSeries ? "Sostenido" : "Único"}
          </p>
        </div>
        <PrimaryButton
          size="sm"
          variant="outline"
          onClick={() => openCancelModal(a)}
          className="w-full border-red-600 text-red-600 hover:bg-red-50"
        >
          Cancelar turno
        </PrimaryButton>
      </div>
    );
  };

  // Renderizar serie de turnos sostenidos (mostrar solo uno representativo)
  const renderSeriesAppointment = (
    seriesId: number,
    seriesAppointments: PopulatedAppointment[]
  ) => {
    const first = seriesAppointments[0];
    if (!first) return null;

    return (
      <div
        key={`series-${seriesId}`}
        className="rounded-lg border border-cyan-400 bg-cyan-50 p-4 shadow-sm"
      >
        <div className="space-y-1 mb-3">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Turno {first.series?.id}</span>
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Día:</span>{" "}
            {first.startTime ? getDayOfWeekES(first.startTime) : "—"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Horario:</span>{" "}
            {first.startTime ? formatTimeES(first.startTime) : "—"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Paciente a cargo:</span>{" "}
            {fullNamePatient(first) || "—"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Profesional:</span>{" "}
            {fullNameProfessional(first.professional)}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Consultorio:</span>{" "}
            {first.consultingRoom?.description ?? "—"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Tipo:</span> Sostenido
          </p>
        </div>
        <PrimaryButton
          size="sm"
          variant="outline"
          onClick={() => openCancelModal(first)}
          className="w-full border-red-600 text-red-600 hover:bg-red-50"
        >
          Cancelar turno
        </PrimaryButton>
      </div>
    );
  };

  return (
    <div>
      {/* Loading */}
      {loading && <div className="text-sm text-gray-600">Cargando turnos…</div>}

      {/* Vacío */}
      {!loading && upcomingScheduled.length === 0 && (
        <EmptyState
          title="No hay turnos reservados"
          description="Cuando reserves turnos para tus pacientes, van a aparecer acá."
          icon={
            <svg
              className="w-12 h-12 text-cyan-600"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5m-8.5 8a8.5 8.5 0 0 1 17 0z"
              />
            </svg>
          }
        />
      )}

      {/* Lista de turnos */}
      {!loading && upcomingScheduled.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Turnos únicos */}
          {singles.map(renderSingleAppointment)}

          {/* Turnos sostenidos (una tarjeta por serie) */}
          {Array.from(seriesMap.entries()).map(([seriesId, apps]) =>
            renderSeriesAppointment(seriesId, apps)
          )}
        </div>
      )}

      {/* Modal de confirmación */}
      {cancelModalOpen && appointmentToCancel && (
        <Modal
          title="¿Está seguro que desea cancelar el turno?"
          onClose={closeCancelModal}
        >
          <div className="space-y-1 mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Turno {appointmentToCancel.series?.id || appointmentToCancel.id}</span>
            </p>
            <p className="text-sm text-gray-800">
              <span className="font-medium">Paciente a cargo:</span>{" "}
              {fullNamePatient(appointmentToCancel) || "—"}
            </p>
            <p className="text-sm text-gray-800">
              <span className="font-medium">
                {appointmentToCancel.series?.id ? "Día:" : "Fecha:"}
              </span>{" "}
              {appointmentToCancel.startTime
                ? appointmentToCancel.series?.id
                  ? getDayOfWeekES(appointmentToCancel.startTime)
                  : formatDateES(appointmentToCancel.startTime)
                : "—"}
            </p>
            <p className="text-sm text-gray-800">
              <span className="font-medium">Horario:</span>{" "}
              {appointmentToCancel.startTime
                ? formatTimeES(appointmentToCancel.startTime)
                : "—"}
            </p>
            <p className="text-sm text-gray-800">
              <span className="font-medium">Profesional:</span>{" "}
              {fullNameProfessional(appointmentToCancel.professional)}
            </p>
            <p className="text-sm text-gray-800">
              <span className="font-medium">Consultorio:</span>{" "}
              {appointmentToCancel.consultingRoom?.description ?? "—"}
            </p>
            <p className="text-sm text-gray-800">
              <span className="font-medium">Tipo:</span>{" "}
              {appointmentToCancel.series?.id ? "Sostenido" : "Único"}
            </p>
          </div>

          <div className="flex gap-3">
            <PrimaryButton
              onClick={confirmCancelAppointment}
              disabled={canceling}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {canceling ? "Cancelando…" : "Cancelar turno"}
            </PrimaryButton>
            <PrimaryButton
              onClick={closeCancelModal}
              variant="outline"
              disabled={canceling}
              className="flex-1"
            >
              Volver
            </PrimaryButton>
          </div>
        </Modal>
      )}

      {/* Toast 
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}*/}
      
    </div>
  );
}
