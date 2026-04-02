import { PrimaryButton } from "@/components/ui";
import { Professional, PopulatedAppointment } from '@/common/types';

interface PrintableReportProps {
  appointments: PopulatedAppointment[];
  professional: Professional | undefined;
  dateFormatted: string;
  onBack: () => void;
}

export default function PrintableReport({ 
  appointments, 
  professional, 
  dateFormatted, 
  onBack 
}: PrintableReportProps) {
  
  const printStyles = `
    @media print {
      /* Ocultar navegación, footer y elementos de la UI */
      header, nav, footer, .no-print {
        display: none !important;
      }
      
      /* Ocultar el contenedor Page y mostrar solo el contenido */
      body > div,
      #root {
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* Ajustar el contenido del informe para impresión */
      .print-content {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 20px !important;
        box-shadow: none !important;
      }
      
      /* Asegurar que la tabla se vea bien en impresión */
      table {
        page-break-inside: auto;
      }
      
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
  `;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Argentina/Buenos_Aires'
    });
  };

  const getAppointmentType = (appointment: PopulatedAppointment) => {
    return appointment.series ? 'Sostenido' : 'Único';
  };

  return (
    <>
      <style>{printStyles}</style>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white p-8 shadow-lg rounded-lg print-content">
          {/* Encabezado del informe */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Turnos Agendados</h1>
            <div className="space-y-2 text-gray-700">
              <p><span className="font-semibold">Fecha de emisión:</span> {dateFormatted}</p>
              <p>
                <span className="font-semibold">Profesional:</span>{' '}
                {professional?.firstName} {professional?.lastName}
              </p>
            </div>
          </div>

          {/* Tabla de turnos o mensaje vacío */}
          {appointments.length === 0 ? (
            <div className="bg-gray-50 p-8 rounded-lg text-center my-8">
              <p className="text-gray-600 text-lg">
                No hay turnos agendados para ese profesional para el día de la fecha.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                        Información del turno
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold w-64">
                        Firma Paciente/Responsable Legal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-4">
                          <div className="space-y-2">
                            <div>
                              <span className="font-semibold">Nombre del paciente: </span>
                              {apt.patient?.firstName} {apt.patient?.lastName}
                            </div>
                            <div>
                              <span className="font-semibold">Obra Social: </span>
                              {apt.healthInsurance?.name ?? 'Sin obra social'}
                            </div>
                            <div>
                              <span className="font-semibold">Tipo de turno: </span>
                              {getAppointmentType(apt)}
                            </div>
                            <div>
                              <span className="font-semibold">Consultorio: </span>
                              {apt.consultingRoom?.description ?? '—'}
                            </div>
                            <div>
                              <span className="font-semibold">Mail: </span>
                              {apt.patient?.user?.mail ?? '—'}
                            </div>
                            <div>
                              <span className="font-semibold">Horario: </span>
                              {formatTime(apt.startTime ?? '')}
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-4">
                          {/* Espacio en blanco para firma física */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 text-lg font-semibold text-gray-900">
                Cantidad total de turnos del día: {appointments.length}
              </div>
            </>
          )}

          {/* Botones Volver e Imprimir */}
          <div className="mt-8 flex gap-3 no-print">
            <PrimaryButton variant="outline" onClick={onBack}>
              Volver
            </PrimaryButton>
            <PrimaryButton onClick={() => window.print()}>
              Imprimir
            </PrimaryButton>
          </div>
        </div>
      </div>
    </>
  );
}
