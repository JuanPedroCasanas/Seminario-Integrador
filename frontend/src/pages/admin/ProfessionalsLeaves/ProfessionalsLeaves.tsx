import { useEffect, useState } from "react";
import { Professional, Leave } from "@/common/types";
import { Toast, EmptyState, Table, Card } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";
import { authFetch } from "@/common/utils/auth/AuthFetch";
import { API_BASE } from '@/lib/api';

type LeaveWithProfessional = Leave & {
  professionalName: string;
};

export default function ProfessionalsLeaves() {
  const [leaves, setLeaves] = useState<LeaveWithProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      // Obtener todos los profesionales
      const profRes = await authFetch(`${API_BASE}/professional/getAll`);
      if (!profRes.ok) {
        setToast({ message: 'Error al cargar profesionales', type: 'error' });
        setLoading(false);
        return;
      }

      const professionals: Professional[] = await profRes.json();

      // Obtener licencias de cada profesional
      const allLeaves: LeaveWithProfessional[] = [];

      for (const prof of professionals) {
        if (!prof.id) continue;

        try {
          const leaveRes = await authFetch(`${API_BASE}/leave/getByProfessional/${prof.id}`);
          if (leaveRes.ok) {
            const data = await leaveRes.json();
            const profLeaves = data.leaves || [];
            
            // Agregar nombre del profesional a cada licencia
            profLeaves.forEach((leave: Leave) => {
              allLeaves.push({
                ...leave,
                professionalName: `${prof.firstName} ${prof.lastName}`,
              });
            });
          }
        } catch (error) {
          console.error(`Error loading leaves for professional ${prof.id}:`, error);
        }
      }

      // Ordenar por profesional y luego por fecha desde
      allLeaves.sort((a, b) => {
        const nameCompare = a.professionalName.localeCompare(b.professionalName, 'es');
        if (nameCompare !== 0) return nameCompare;

        // Si son del mismo profesional, ordenar por fecha desde (más antigua primero)
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });

      setLeaves(allLeaves);
    } catch (error) {
      console.error('Error loading leaves:', error);
      setToast({ message: 'Error al cargar las licencias', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusLabel = (isActive: boolean): string => {
    return isActive ? 'Activa' : 'Cancelada';
  };

  const getStatusColor = (isActive: boolean): string => {
    return isActive 
      ? 'text-green-700 bg-green-50 px-3 py-1 rounded-full font-medium'
      : 'text-red-700 bg-red-50 px-3 py-1 rounded-full font-medium';
  };

  return (
    <Page>
      <SectionHeader title="Licencias por profesional" />

      {loading ? (
        <p className="mt-4">Cargando licencias...</p>
      ) : leaves.length === 0 ? (
        <EmptyState
          title="No hay licencias registradas"
          description="Aún no se han solicitado licencias."
          icon={
            <svg className="w-12 h-12 text-cyan-600" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5m-8.5 8a8.5 8.5 0 0 1 17 0z"
              />
            </svg>
          }
        />
      ) : (
        <Card>
          <Table headers={["Profesional", "Fecha desde", "Fecha hasta", "Estado"]}>
            {leaves.map((leave, index) => (
              <tr key={`${leave.id}-${index}`} className="even:bg-gray-50 hover:bg-gray-100 transition">
                <td className="px-4 py-3">{leave.professionalName}</td>
                <td className="px-4 py-3">{formatDate(leave.startDate)}</td>
                <td className="px-4 py-3">{formatDate(leave.endDate)}</td>
                <td className="px-4 py-3">
                  <span className={getStatusColor(leave.isActive)}>
                    {getStatusLabel(leave.isActive)}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </Page>
  );
}
