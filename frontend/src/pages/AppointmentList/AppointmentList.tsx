import { useEffect, useState } from 'react';
import { Toast, PrimaryButton, Card, FormField, PrintableReport } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";
import { Professional, PopulatedAppointment } from '@/common/types';
import { authFetch } from '@/common/utils/auth/AuthFetch';
import { HandleProfessionalControllerResponse } from '@/common/utils';
import { API_BASE } from '@/lib/api';

export default function AppointmentList() {
  const [showReport, setShowReport] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null);
  const [appointments, setAppointments] = useState<PopulatedAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Obtener fecha de hoy en formato YYYY-MM-DD (zona horaria local)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const todayFormatted = today.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Cargar profesionales activos
  useEffect(() => {
    (async () => {
      const res = await authFetch(`${API_BASE}/professional/getAll?includeInactive=false`);
      if (!res.ok) {
        const toastData = await HandleProfessionalControllerResponse(res);
        setToast(toastData);
        return;
      }
      const data: Professional[] = await res.json();
      setProfessionals(data.filter(p => p.isActive));
    })();
  }, []);

  const selectedProfessional = professionals.find(p => p.id === selectedProfessionalId);

  const handleGenerateReport = async () => {
    if (!selectedProfessionalId) {
      setToast({ message: 'Seleccione un profesional', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(
        `${API_BASE}/appointment/getScheduledByProfessionalAndDate/${selectedProfessionalId}?date=${todayStr}`
      );

      if (!res.ok) {
        setToast({ message: 'Error al obtener turnos', type: 'error' });
        setLoading(false);
        return;
      }

      const data: PopulatedAppointment[] = await res.json();
      setAppointments(data);
      setShowReport(true);
    } catch (error) {
      setToast({ message: 'Error al generar informe', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowReport(false);
    setAppointments([]);
  };

  // Vista de selección de profesional
  if (!showReport) {
    return (
      <Page>
        <SectionHeader title="Turnos Agendados" />
        
        <Card>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Generar informe para el día de la fecha
              </h3>
              <p className="text-gray-600">{todayFormatted}</p>
            </div>

            <FormField label="Seleccionar profesional" htmlFor="professional">
              <select
                id="professional"
                name="professional"
                value={selectedProfessionalId ?? ''}
                onChange={(e) => setSelectedProfessionalId(Number(e.target.value) || null)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black"
              >
                <option value="">Seleccione un profesional</option>
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.firstName} {prof.lastName}
                  </option>
                ))}
              </select>
            </FormField>

            <PrimaryButton 
              onClick={handleGenerateReport} 
              disabled={!selectedProfessionalId || loading}
            >
              {loading ? 'Generando...' : 'Imprimir informe'}
            </PrimaryButton>
          </div>
        </Card>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </Page>
    );
  }

  // Vista del informe
  return (
    <Page>
      <PrintableReport 
        appointments={appointments}
        professional={selectedProfessional}
        dateFormatted={todayFormatted}
        onBack={handleBack}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </Page>
  );
}