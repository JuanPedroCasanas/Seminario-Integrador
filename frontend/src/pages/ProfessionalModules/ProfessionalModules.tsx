import { useEffect, useState } from 'react';
import { Toast, EmptyState, Table, Card } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";
import { HandleModuleControllerResponse } from '@/common/utils';
import type { Module } from '@/common/types';
import { authFetch } from '@/common/utils/auth/AuthFetch';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/common/utils/auth/AuthContext';

// Mapeo de días de la semana
const DAY_LABELS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

const monthLabel = (m: string | number): string => {
  const idx = Number(m) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx > 11) return '-';
  const name = new Date(2000, idx, 1).toLocaleString('es-AR', { month: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// Formatear hora para mostrar solo HH:mm (sin segundos)
const formatTime = (time: string | undefined): string => {
  if (!time) return '-';
  // Si viene en formato HH:mm:ss, tomar solo HH:mm
  return time.split(':').slice(0, 2).join(':');
};

export default function ProfessionalModules() {
  const { user } = useAuth();
  const myProfessionalId = user?.professional?.id ?? user?.id;

  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const getModules = async (): Promise<Module[] | undefined> => {
    if (!myProfessionalId) return;
    
    const res = await authFetch(`${API_BASE}/module/getByProfessional/${myProfessionalId}`);
    if (!res.ok) {
      const toastData = await HandleModuleControllerResponse(res);
      setToast(toastData);
      return;
    }
    const data: Module[] = await res.json();
    return Array.isArray(data) ? (data as Module[]).filter((m) => m?.id != null) : [];
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const mods = await getModules();
      if (mods) setModules(mods);
    } catch (err) {
      console.error('Error loading modules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <Page>
      <SectionHeader 
        title="Mis Módulos" 
        subtitle="Visualización de módulos alquilados"
      />

      {loading ? (
        <p className="mt-4 text-center">Cargando módulos...</p>
      ) : modules.length === 0 ? (
        <EmptyState
          title="No tenés módulos alquilados"
          description="Todavía no alquilaste ningún módulo."
          icon={
            <svg className="w-12 h-12 text-cyan-600" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zm0-12H5V5h14v2z"
              />
            </svg>
          }
        />
      ) : (
        <Card>
          <Table headers={["Id", "Consultorio", "Día", "Hora desde", "Hora hasta", "Tipo de módulo", "Mes/Año"]}>
            {modules
              .sort((a, b) => {
                // Ordenar primero por día de la semana
                if ((a.day ?? 0) !== (b.day ?? 0)) {
                  return (a.day ?? 0) - (b.day ?? 0);
                }
                // Luego por ID
                return (a.id ?? 0) - (b.id ?? 0);
              })
              .map((m) => (
                <tr key={m.id} className="even:bg-gray-50 hover:bg-gray-100 transition">
                  <td className="px-4 py-3">{m.id}</td>
                  <td className="px-4 py-3">{m.consultingRoom?.description ?? '-'}</td>
                  <td className="px-4 py-3">{DAY_LABELS[m.day ?? 0] ?? '-'}</td>
                  <td className="px-4 py-3">{formatTime(m.startTime)}</td>
                  <td className="px-4 py-3">{formatTime(m.endTime)}</td>
                  <td className="px-4 py-3">{m.moduleType?.name ?? '-'}</td>
                  <td className="px-4 py-3">
                    {m.validMonth ? `${monthLabel(m.validMonth)}/${m.validYear ?? ''}` : '-'}
                  </td>
                </tr>
              ))}
          </Table>
        </Card>
      )}

      {/* Toast 
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}*/}
    </Page>
  );
}
