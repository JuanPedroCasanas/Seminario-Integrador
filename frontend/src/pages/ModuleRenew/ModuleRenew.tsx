import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, EmptyState, Card, PrimaryButton } from "@/components/ui";
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

// Formatear hora para mostrar solo HH:mm (sin segundos)
const formatTime = (time: string | undefined): string => {
  if (!time) return '-';
  return time.split(':').slice(0, 2).join(':');
};

// Obtener mes siguiente
const getNextMonth = (): string => {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const monthName = nextMonth.toLocaleString('es-AR', { month: 'long' });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
};

type ModuleSelection = {
  module: Module;
  isSelected: boolean;
  isPaid: boolean;
};

export default function ModuleRenew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myProfessionalId = user?.professional?.id ?? user?.id;

  const [modules, setModules] = useState<Module[]>([]);
  const [moduleSelections, setModuleSelections] = useState<Map<number, ModuleSelection>>(new Map());
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [renewedModulesData, setRenewedModulesData] = useState<ModuleSelection[]>([]);

  // Obtener módulos del mes actual del profesional
  const getCurrentMonthModules = async (): Promise<Module[] | undefined> => {
    if (!myProfessionalId) return;
    
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    const res = await authFetch(`${API_BASE}/module/getByProfessional/${myProfessionalId}`);
    if (!res.ok) {
      const toastData = await HandleModuleControllerResponse(res);
      setToast(toastData);
      return;
    }
    const data: Module[] = await res.json();
    
    // Filtrar solo módulos del mes actual
    return Array.isArray(data) 
      ? data.filter(m => {
          const moduleMonth = typeof m.validMonth === 'string' ? Number(m.validMonth) : m.validMonth;
          return m?.id != null && moduleMonth === currentMonth && m.validYear === currentYear;
        })
      : [];
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const mods = await getCurrentMonthModules();
      if (mods) {
        setModules(mods);
        // Inicializar selecciones
        const selections = new Map<number, ModuleSelection>();
        mods.forEach(mod => {
          selections.set(mod.id!, {
            module: mod,
            isSelected: false,
            isPaid: false
          });
        });
        setModuleSelections(selections);
      }
    } catch (err) {
      console.error('Error loading modules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Ordenar módulos por consultorio (de menor a mayor)
  const sortedModules = [...modules].sort((a, b) => {
    const idA = a.consultingRoom?.id ?? 0;
    const idB = b.consultingRoom?.id ?? 0;
    return idA - idB;
  });

  // Formatear nombre del tipo de módulo
  const formatModuleTypeName = (name: string | undefined): string => {
    if (!name) return 'Tipo desconocido';
    
    // Convertir nombres cortos a nombres completos
    const nameMap: Record<string, string> = {
      'COMPLETO': 'Módulo Completo',
      'MEDIO': 'Medio Módulo',
      'SEXTO': 'Sexto de Módulo'
    };
    
    return nameMap[name.toUpperCase()] || name;
  };

  // Toggle selección de módulo
  const toggleModuleSelection = (moduleId: number) => {
    setModuleSelections(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(moduleId);
      if (current) {
        newMap.set(moduleId, {
          ...current,
          isSelected: !current.isSelected
        });
      }
      return newMap;
    });
  };

  // Toggle pago de módulo
  const toggleModulePayment = (moduleId: number) => {
    setModuleSelections(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(moduleId);
      if (current) {
        newMap.set(moduleId, {
          ...current,
          isPaid: !current.isPaid
        });
      }
      return newMap;
    });
  };

  // Renovar módulos seleccionados
  const handleRenewModules = async () => {
    const selectedModulesData = Array.from(moduleSelections.values())
      .filter(sel => sel.isSelected);

    const selectedModules = selectedModulesData.map(sel => ({
      id: sel.module.id!,
      isPaid: sel.isPaid
    }));

    if (selectedModules.length === 0) {
      setToast({ message: 'Debe seleccionar al menos un módulo para renovar', type: 'error' });
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/module/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleIds: selectedModules })
      });

      if (res.ok) {
        // Guardar datos para el modal de constancia
        setRenewedModulesData(selectedModulesData);
        setShowReceiptModal(true);
      } else {
        // Manejo específico de error de conflicto
        if (res.status === 409) {
          const data = await res.json();
          setToast({ 
            message: data.message || 'Ya existe un módulo en ese horario para el mes siguiente. Es posible que los módulos ya hayan sido renovados anteriormente.', 
            type: 'error' 
          });
        } else {
          const toastData = await HandleModuleControllerResponse(res);
          setToast(toastData);
        }
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error al renovar módulos', type: 'error' });
    }
  };

  // Calcular resumen de tipos de módulos renovados
  const calculateModuleTypesSummary = () => {
    const summary = new Map<string, { name: string; count: number; cost: number }>();
    
    renewedModulesData.forEach(sel => {
      const typeName = formatModuleTypeName(sel.module.moduleType?.name);
      const cost = sel.module.moduleType?.cost || 0;
      
      if (!summary.has(typeName)) {
        summary.set(typeName, { name: typeName, count: 0, cost });
      }
      
      const current = summary.get(typeName)!;
      current.count += 1;
    });
    
    return Array.from(summary.values());
  };

  // Calcular costos
  const calculateCosts = () => {
    let total = 0;
    let paid = 0;
    
    renewedModulesData.forEach(sel => {
      const cost = sel.module.moduleType?.cost || 0;
      total += cost;
      if (sel.isPaid) {
        paid += cost;
      }
    });
    
    return {
      total,
      paid,
      toPay: total - paid
    };
  };

  // Volver al portal
  const handleBackToPortal = () => {
    setShowReceiptModal(false);
    navigate('/professional-portal');
  };

  return (
    <Page>
      <SectionHeader 
        title="Renovar alquileres de mis módulos" 
        subtitle={`Mes a renovar: ${getNextMonth()}`}
      />

      {loading ? (
        <p className="mt-4 text-center">Cargando módulos...</p>
      ) : modules.length === 0 ? (
        <EmptyState
          title="No tenés módulos para renovar"
          description="No tenés módulos alquilados en el mes actual que puedan renovarse."
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
        <>
          <Card>
            <h3 className="text-base font-semibold text-gray-700 mb-4">
              Seleccione el o los módulos que desea renovar:
            </h3>

            <div className="space-y-3">
              {sortedModules.map(mod => {
                const selection = moduleSelections.get(mod.id!);
                if (!selection) return null;

                return (
                  <div 
                    key={mod.id} 
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox para seleccionar módulo */}
                      <input
                        type="checkbox"
                        checked={selection.isSelected}
                        onChange={() => toggleModuleSelection(mod.id!)}
                        className="mt-1 w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                      />

                      <div className="flex-1">
                        {/* Información del módulo */}
                        <p className="text-sm text-gray-800 font-medium mb-2">
                          {mod.consultingRoom?.description || 'Consultorio'} - {' '}
                          {DAY_LABELS[mod.day!] || 'Día'} {' '}
                          {formatTime(mod.startTime)}hs a {formatTime(mod.endTime)}hs - {' '}
                          {formatModuleTypeName(mod.moduleType?.name)} - {' '}
                          Costo ${mod.moduleType?.cost?.toLocaleString('es-AR') || '0'}
                        </p>

                        {/* Checkbox para pagar módulo - siempre visible */}
                        <label className="flex items-center space-x-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={selection.isPaid}
                            onChange={() => toggleModulePayment(mod.id!)}
                            className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                          />
                          <span className="text-gray-700">Pagar módulo a renovar</span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mensaje en rojo */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-red-600 font-medium mb-4">
                Los módulos no pagos deberán regularizarse posteriormente con la directora.
              </p>

              {/* Botón renovar */}
              <div className="flex justify-end">
                <PrimaryButton 
                  onClick={handleRenewModules}
                  disabled={!Array.from(moduleSelections.values()).some(sel => sel.isSelected)}
                >
                  Renovar módulos
                </PrimaryButton>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Modal de Constancia de Renovación */}
      {showReceiptModal && renewedModulesData.length > 0 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={handleBackToPortal}>
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Constancia de renovación</h2>
            
            <div className="space-y-4">
            {/* Mes de renovación */}
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-800">
                Mes: {getNextMonth()}
              </p>
            </div>

            {/* Layout: módulos a la izquierda, tabla a la derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Columna izquierda: Módulos renovados */}
              <div className="space-y-3">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {renewedModulesData.map((sel, idx) => (
                    <div 
                      key={idx}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs"
                    >
                      <p className="mb-1">
                        <strong>Consultorio:</strong> {sel.module.consultingRoom?.description || '-'}
                      </p>
                      <p className="mb-1">
                        <strong>Día:</strong> {DAY_LABELS[sel.module.day!] || '-'}
                      </p>
                      <p className="mb-1">
                        <strong>Horario:</strong> {formatTime(sel.module.startTime)}hs - {formatTime(sel.module.endTime)}hs
                      </p>
                      <p>
                        <strong>Estado:</strong> {' '}
                        <span className={sel.isPaid ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                          {sel.isPaid ? 'Pagado' : 'A pagar'}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columna derecha: Tabla resumen */}
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold border-b">Tipo módulo</th>
                        <th className="px-3 py-2 text-center font-semibold border-b">Cantidad</th>
                        <th className="px-3 py-2 text-right font-semibold border-b">Costo unitario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateModuleTypesSummary().map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2 text-center">{item.count}</td>
                          <td className="px-3 py-2 text-right">${item.cost.toLocaleString('es-AR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Resumen de costos */}
            <div className="bg-cyan-50 border-2 border-cyan-400 rounded-lg p-4 space-y-2">
              <p className="text-sm font-bold text-gray-800">
                Costo total: ${calculateCosts().total.toLocaleString('es-AR')}
              </p>
              <p className="text-sm font-semibold text-green-700">
                Costo pagado: ${calculateCosts().paid.toLocaleString('es-AR')}
              </p>
              <p className="text-sm font-semibold text-orange-700">
                Costo a pagar: ${calculateCosts().toPay.toLocaleString('es-AR')}
              </p>
            </div>

            {/* Botón volver */}
            <div className="flex justify-end pt-2">
              <PrimaryButton onClick={handleBackToPortal}>
                Volver
              </PrimaryButton>
            </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </Page>
  );
}
