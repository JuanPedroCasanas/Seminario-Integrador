import { useEffect, useState } from 'react';
import { Page, SectionHeader } from '@/components/Layout';
import { PrimaryButton, Toast, Modal, FormField } from '@/components/ui';
import { Leave } from '@/common/types';
import { authFetch } from '@/common/utils/auth/AuthFetch';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/common/utils/auth/AuthContext';

export default function ProfessionalLeaves() {
  const { user } = useAuth();
  const professionalId = user?.professional?.id ?? user?.id ?? null;

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal de solicitud
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal de confirmación de solicitud
  const [confirmRequestModalOpen, setConfirmRequestModalOpen] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Modal de cancelación
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [leaveToCancel, setLeaveToCancel] = useState<Leave | null>(null);
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Cargar licencias
  useEffect(() => {
    if (!professionalId) return;
    
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch(`${API_BASE}/leave/getByProfessional/${professionalId}`);
        if (res.ok) {
          const data = await res.json();
          setLeaves(Array.isArray(data.leaves) ? data.leaves : []);
        } else {
          setToast({ message: 'Error al cargar licencias', type: 'error' });
        }
      } catch (error) {
        setToast({ message: 'Error de conexión', type: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [professionalId]);

  // Abrir modal de confirmación de solicitud
  const handleOpenConfirmRequest = () => {
    if (!startDate || !endDate) {
      setToast({ message: 'Complete ambas fechas', type: 'error' });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setToast({ message: 'La fecha de inicio debe ser anterior a la fecha final', type: 'error' });
      return;
    }

    setRequestModalOpen(false);
    setConfirmRequestModalOpen(true);
  };

  // Confirmar solicitud de licencia
  const handleConfirmRequest = async () => {
    if (!professionalId) return;

    setSubmittingRequest(true);
    try {
      const res = await authFetch(`${API_BASE}/leave/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          idProfessional: professionalId
        })
      });

      if (res.ok) {
        const response = await res.json();
        const newLeave: Leave = response.leave;
        setLeaves([...leaves, newLeave]);
        setToast({ message: 'Licencia solicitada correctamente', type: 'success' });
        setStartDate('');
        setEndDate('');
        setConfirmRequestModalOpen(false);
      } else {
        const error = await res.json();
        setToast({ message: error.message || 'Error al solicitar licencia', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error de conexión', type: 'error' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Abrir modal de cancelación
  const handleOpenCancelModal = (leave: Leave) => {
    setLeaveToCancel(leave);
    setCancelModalOpen(true);
  };

  // Confirmar cancelación de licencia
  const handleConfirmCancel = async () => {
    if (!leaveToCancel) return;

    setSubmittingCancel(true);
    try {
      const res = await authFetch(`${API_BASE}/leave/cancel/${leaveToCancel.id}`, {
        method: 'POST'
      });

      if (res.ok) {
        setLeaves(leaves.map(l => 
          l.id === leaveToCancel.id ? { ...l, isActive: false } : l
        ));
        setToast({ message: 'Licencia cancelada correctamente', type: 'success' });
        setCancelModalOpen(false);
        setLeaveToCancel(null);
      } else {
        setToast({ message: 'Error al cancelar licencia', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error de conexión', type: 'error' });
    } finally {
      setSubmittingCancel(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusLabel = (leave: Leave) => {
    return leave.isActive ? 'Vigente' : 'Cancelada';
  };

  const getStatusColor = (leave: Leave) => {
    return leave.isActive 
      ? 'text-green-600 font-semibold' 
      : 'text-red-600 font-semibold';
  };

  return (
    <Page>
      <SectionHeader title="Mis licencias" />

      <div className="max-w-5xl mx-auto">
        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : leaves.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <p className="text-gray-600">No tiene licencias registradas</p>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Fecha desde
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Fecha hasta
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(leave.startDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(leave.endDate)}
                    </td>
                    <td className={`px-6 py-4 text-sm ${getStatusColor(leave)}`}>
                      {getStatusLabel(leave)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {leave.isActive ? (
                        <button
                          onClick={() => handleOpenCancelModal(leave)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 font-bold text-2xl w-8 h-8 rounded inline-flex items-center justify-center transition-colors"
                          title="Cancelar licencia"
                        >
                          ✕
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <PrimaryButton onClick={() => setRequestModalOpen(true)}>
            SOLICITAR NUEVA LICENCIA
          </PrimaryButton>
        </div>
      </div>

      {/* Modal: Solicitar nueva licencia */}
      {requestModalOpen && (
        <Modal
          onClose={() => {
            setRequestModalOpen(false);
            setStartDate('');
            setEndDate('');
          }}
          title="Solicitud de licencias"
        >
        <div className="space-y-4">
          <FormField label="Fecha desde:" htmlFor="startDate">
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </FormField>

          <FormField label="Fecha hasta:" htmlFor="endDate">
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </FormField>

          <div className="flex gap-3 justify-end mt-6">
            <PrimaryButton onClick={handleOpenConfirmRequest}>
              SOLICITAR
            </PrimaryButton>
          </div>
        </div>
      </Modal>
      )}

      {/* Modal: Confirmar solicitud de licencia */}
      {confirmRequestModalOpen && (
        <Modal
          onClose={() => setConfirmRequestModalOpen(false)}
          title="¿Está seguro que desea confirmar la licencia?"
        >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Confirmar la licencia hará que todos los turnos en ese rango de fechas sean cancelados.
          </p>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Fecha inicio:</span> {startDate ? formatDate(startDate) : '-'}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Fecha final:</span> {endDate ? formatDate(endDate) : '-'}
            </p>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <PrimaryButton
              variant="outline"
              onClick={() => setConfirmRequestModalOpen(false)}
              disabled={submittingRequest}
            >
              VOLVER
            </PrimaryButton>
            <PrimaryButton
              onClick={handleConfirmRequest}
              disabled={submittingRequest}
            >
              {submittingRequest ? 'Procesando...' : 'CONFIRMAR LICENCIA'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>
      )}

      {/* Modal: Cancelar licencia */}
      {cancelModalOpen && (
        <Modal
          onClose={() => {
            setCancelModalOpen(false);
            setLeaveToCancel(null);
          }}
          title="¿Está seguro que desea cancelar la licencia?"
        >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Cancelar la licencia no hará que los turnos ya cancelados por la misma vuelvan a su estado anterior.
          </p>

          {leaveToCancel && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm">
                <span className="font-semibold">Fecha inicio:</span> {formatDate(leaveToCancel.startDate)}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Fecha final:</span> {formatDate(leaveToCancel.endDate)}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end mt-6">
            <PrimaryButton
              variant="outline"
              onClick={() => {
                setCancelModalOpen(false);
                setLeaveToCancel(null);
              }}
              disabled={submittingCancel}
            >
              VOLVER
            </PrimaryButton>
            <PrimaryButton
              onClick={handleConfirmCancel}
              disabled={submittingCancel}
            >
              {submittingCancel ? 'Procesando...' : 'CANCELAR LICENCIA'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>
      )}

      {/*
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      */}
    </Page>
  );
}
