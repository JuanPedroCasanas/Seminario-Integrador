import { useEffect, useState } from 'react';
import { Toast, PrimaryButton, Card, FormField, PrintableModuleReport } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";
import { Module } from '@/common/types';
import { authFetch } from '@/common/utils/auth/AuthFetch';
import { API_BASE } from '@/lib/api';

export default function ModuleList() {
  const [showReport, setShowReport] = useState(false);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [filteredModules, setFilteredModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Obtener mes y año actual
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();

  // Filtros de fecha
  const [startMonth, setStartMonth] = useState<number>(1);
  const [startYear, setStartYear] = useState<number>(currentYear);
  const [endMonth, setEndMonth] = useState<number>(currentMonth);
  const [endYear, setEndYear] = useState<number>(currentYear);

  const todayFormatted = today.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const monthLabel = (m: number): string => {
    const idx = m - 1;
    if (idx < 0 || idx > 11) return '-';
    const name = new Date(2000, idx, 1).toLocaleString('es-AR', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Generar arrays de meses y años
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [2025, 2026];

  // Cargar todos los módulos
  useEffect(() => {
    (async () => {
      const res = await authFetch(`${API_BASE}/module/getAll`);
      if (!res.ok) {
        setToast({ message: 'Error al cargar módulos', type: 'error' });
        return;
      }
      const data: Module[] = await res.json();
      setAllModules(data.filter(m => m?.id != null));
    })();
  }, []);

  const handleGenerateReport = () => {
    // Validar que el rango sea válido
    const startDate = startYear * 12 + startMonth;
    const endDate = endYear * 12 + endMonth;

    if (startDate > endDate) {
      setToast({ message: 'El mes inicial debe ser anterior al mes final', type: 'error' });
      return;
    }

    // Filtrar módulos por rango de fechas
    const filtered = allModules.filter((module) => {
      const moduleDate = (module.validYear ?? 0) * 12 + Number(module.validMonth ?? 0);
      return moduleDate >= startDate && moduleDate <= endDate;
    });

    setFilteredModules(filtered);
    setShowReport(true);
  };

  const handleBack = () => {
    setShowReport(false);
    setFilteredModules([]);
  };

  // Vista de selección de filtros
  if (!showReport) {
    return (
      <Page>
        <SectionHeader title="Módulos utilizados" />
        
          <Card>
            <div className="space-y-8">
              <div>
                <p className="text-lg text-gray-600">
                  Generar informe con los datos hasta el mes corriente: {monthLabel(currentMonth)}
                </p>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">Filtro de meses:</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                  {/* Mes inicio */}
                  <FormField label=" " htmlFor="start-month">
                    <select
                      id="start-month"
                      value={startMonth}
                      onChange={(e) => setStartMonth(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-4 text-base text-black"
                    >
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {monthLabel(m)}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {/* Año inicio */}
                  <FormField label=" " htmlFor="start-year">
                    <select
                      id="start-year"
                      value={startYear}
                      onChange={(e) => setStartYear(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-4 text-base text-black"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {/* Separador */}
                  <div className="text-center text-3xl font-bold text-gray-500 pb-4">-</div>

                  {/* Mes fin */}
                  <FormField label=" " htmlFor="end-month">
                    <select
                      id="end-month"
                      value={endMonth}
                      onChange={(e) => setEndMonth(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-4 text-base text-black"
                    >
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {monthLabel(m)}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {/* Año fin */}
                  <FormField label=" " htmlFor="end-year">
                    <select
                      id="end-year"
                      value={endYear}
                      onChange={(e) => setEndYear(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-4 text-base text-black"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>

              <PrimaryButton 
                onClick={handleGenerateReport} 
                disabled={loading}
              >
                {loading ? 'Generando...' : 'Imprimir informe'}
              </PrimaryButton>
            </div>
          </Card>

        {/*{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}*/}
      </Page>
    );
  }

  // Vista del informe
  return (
    <Page>
      <PrintableModuleReport 
        modules={filteredModules}
        startMonth={startMonth}
        startYear={startYear}
        endMonth={endMonth}
        endYear={endYear}
        dateFormatted={todayFormatted}
        onBack={handleBack}
      />
      {/* 
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />} */}
    </Page>
  );
}