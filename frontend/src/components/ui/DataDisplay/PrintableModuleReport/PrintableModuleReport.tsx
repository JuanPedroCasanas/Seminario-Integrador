import { PrimaryButton } from "@/components/ui";
import { Module } from '@/common/types';

interface PrintableModuleReportProps {
  modules: Module[];
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
  dateFormatted: string;
  onBack: () => void;
}

export default function PrintableModuleReport({ 
  modules, 
  startMonth,
  startYear,
  endMonth,
  endYear,
  dateFormatted, 
  onBack 
}: PrintableModuleReportProps) {
  
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

  const monthLabel = (m: number): string => {
    const idx = m - 1;
    if (idx < 0 || idx > 11) return '-';
    const name = new Date(2000, idx, 1).toLocaleString('es-AR', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const formatPeriod = (): string => {
    return `${monthLabel(startMonth)} ${startYear} - ${monthLabel(endMonth)} ${endYear}`;
  };

  // Tipo para módulos consolidados (agrupados por renovaciones)
  type ConsolidatedModule = {
    id: string; // ID único para la agrupación
    consultingRoom: string;
    professionalName: string;
    moduleTypeName: string;
    startMonth: number;
    startYear: number;
    endMonth: number;
    endYear: number;
    cost: number;
    totalPaid: number;
    status: string;
    modules: Module[]; // Módulos originales que componen esta agrupación
  };

  // Función para crear una clave única que identifica módulos iguales (renovaciones)
  const getModuleKey = (module: Module): string => {
    return [
      module.professional?.id,
      module.day,
      module.consultingRoom?.id,
      module.moduleType?.id,
      module.startTime,
      module.endTime
    ].join('|');
  };

  // Consolidar módulos renovados
  const consolidateModules = (): ConsolidatedModule[] => {
    const moduleGroups = new Map<string, Module[]>();

    // Agrupar módulos por su clave única
    modules.forEach(module => {
      const key = getModuleKey(module);
      if (!moduleGroups.has(key)) {
        moduleGroups.set(key, []);
      }
      moduleGroups.get(key)!.push(module);
    });

    // Convertir grupos en módulos consolidados
    const consolidated: ConsolidatedModule[] = [];
    
    moduleGroups.forEach((groupModules, key) => {
      // Ordenar los módulos del grupo por fecha
      const sortedGroup = groupModules.sort((a, b) => {
        const dateA = (a.validYear ?? 0) * 12 + Number(a.validMonth ?? 0);
        const dateB = (b.validYear ?? 0) * 12 + Number(b.validMonth ?? 0);
        return dateA - dateB;
      });

      const firstModule = sortedGroup[0];
      const lastModule = sortedGroup[sortedGroup.length - 1];

      // Calcular costo y valor pagado total
      const cost = firstModule.moduleType?.cost ?? 0;
      const totalPaid = sortedGroup.reduce((sum, m) => sum + (m.status === 'paid' ? cost : 0), 0);

      // Determinar el estado general (si todos están pagados, es pagado, sino toBePaid)
      const allPaid = sortedGroup.every(m => m.status === 'paid');
      const status = allPaid ? 'paid' : 'toBePaid';

      consolidated.push({
        id: key,
        consultingRoom: firstModule.consultingRoom?.description ?? '—',
        professionalName: `${firstModule.professional?.firstName ?? ''} ${firstModule.professional?.lastName ?? ''}`.trim(),
        moduleTypeName: firstModule.moduleType?.name ?? '—',
        startMonth: Number(firstModule.validMonth),
        startYear: firstModule.validYear ?? 0,
        endMonth: Number(lastModule.validMonth),
        endYear: lastModule.validYear ?? 0,
        cost: cost,
        totalPaid: totalPaid,
        status: status,
        modules: sortedGroup
      });
    });

    return consolidated;
  };

  const consolidatedModules = consolidateModules();

  // Agrupar módulos consolidados por profesional
  type GroupedModules = {
    [professionalId: string]: {
      professionalName: string;
      modules: ConsolidatedModule[];
    };
  };

  const groupedByProfessional = consolidatedModules.reduce<GroupedModules>((acc, consModule) => {
    const profId = String(consModule.modules[0].professional?.id ?? 'unknown');
    if (!acc[profId]) {
      acc[profId] = {
        professionalName: consModule.professionalName,
        modules: []
      };
    }
    acc[profId].modules.push(consModule);
    return acc;
  }, {});

  // Ordenar profesionales alfabéticamente y sus módulos por consultorio y luego por fecha
  const sortedProfessionals = Object.entries(groupedByProfessional)
    .sort(([, a], [, b]) => a.professionalName.localeCompare(b.professionalName, 'es'))
    .map(([profId, data]) => {
      // Ordenar módulos primero por consultorio y luego por fecha dentro de cada profesional
      const sortedModules = data.modules.sort((a, b) => {
        // Primero comparar por consultorio
        const roomCompare = a.consultingRoom.localeCompare(b.consultingRoom, 'es');
        if (roomCompare !== 0) return roomCompare;
        
        // Si son del mismo consultorio, comparar por fecha (del más antiguo al más reciente)
        const dateA = a.startYear * 12 + a.startMonth;
        const dateB = b.startYear * 12 + b.startMonth;
        return dateA - dateB;
      });
      return [profId, { ...data, modules: sortedModules }] as const;
    });

  // Calcular valor alquiler y valor pagado
  const getModuleCost = (consModule: ConsolidatedModule): number => {
    // El costo total es el costo unitario por la cantidad de meses
    return consModule.cost * consModule.modules.length;
  };

  const getPaidValue = (consModule: ConsolidatedModule): number => {
    return consModule.totalPaid;
  };

  // Calcular subtotales por profesional
  const getSubtotals = (modules: ConsolidatedModule[]) => {
    const totalRent = modules.reduce((sum, m) => sum + getModuleCost(m), 0);
    const totalPaid = modules.reduce((sum, m) => sum + getPaidValue(m), 0);
    return { totalRent, totalPaid };
  };

  // Calcular totales generales
  const grandTotals = consolidatedModules.reduce(
    (acc, m) => ({
      totalRent: acc.totalRent + getModuleCost(m),
      totalPaid: acc.totalPaid + getPaidValue(m)
    }),
    { totalRent: 0, totalPaid: 0 }
  );

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getStatusLabel = (status?: string): string => {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'toBePaid':
        return 'Por pagar';
      case 'canceled':
        return 'Cancelado';
      default:
        return '—';
    }
  };

  const formatModuleTypeName = (name?: string): string => {
    if (!name) return '—';
    
    const upperName = name.toUpperCase();
    
    if (upperName.includes('SEXTO') || upperName.includes('1')) {
      return 'Sexto de módulo';
    }
    if (upperName.includes('TERCIO') || upperName.includes('MEDIO') || upperName.includes('3')) {
      return 'Medio módulo';
    }
    if (upperName.includes('COMPLETO') || upperName.includes('6') || upperName.includes('ENTERO')) {
      return 'Módulo completo';
    }
    
    return name;
  };

  return (
    <>
      <style>{printStyles}</style>
      <div style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }} className="px-8">
        <div className="bg-white p-10 shadow-lg rounded-lg print-content w-full">
          {/* Encabezado del informe */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Módulos utilizados</h1>
            <div className="space-y-3 text-lg text-gray-700">
              <p><span className="font-semibold">Fecha de emisión:</span> {dateFormatted}</p>
              <p><span className="font-semibold">Período de meses:</span> {formatPeriod()}</p>
            </div>
          </div>

          {/* Tabla de módulos o mensaje vacío */}
          {consolidatedModules.length === 0 ? (
            <div className="bg-gray-50 p-8 rounded-lg text-center my-8">
              <p className="text-gray-600 text-lg">
                No hay módulos utilizados en el período seleccionado.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 table-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-6 py-4 text-left font-bold text-base whitespace-nowrap min-w-[140px]">Consultorio</th>
                      <th className="border border-gray-300 px-6 py-4 text-left font-bold text-base whitespace-nowrap min-w-[180px]">Profesional</th>
                      <th className="border border-gray-300 px-6 py-4 text-left font-bold text-base whitespace-nowrap min-w-[200px]">Tipo de módulo</th>
                      <th className="border border-gray-300 px-6 py-4 text-left font-bold text-base whitespace-nowrap min-w-[160px]">Mes y año inicial</th>
                      <th className="border border-gray-300 px-6 py-4 text-left font-bold text-base whitespace-nowrap min-w-[160px]">Mes y año final</th>
                      <th className="border border-gray-300 px-6 py-4 text-right font-bold text-base whitespace-nowrap min-w-[140px]">Valor alquiler</th>
                      <th className="border border-gray-300 px-6 py-4 text-right font-bold text-base whitespace-nowrap min-w-[140px]">Valor pagado</th>
                      <th className="border border-gray-300 px-6 py-4 text-left font-bold text-base whitespace-nowrap min-w-[120px]">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProfessionals.map(([profId, { professionalName, modules: profModules }]) => {
                      const { totalRent, totalPaid } = getSubtotals(profModules);
                      
                      return (
                        <>
                          {profModules.map((consModule) => (
                            <tr key={consModule.id} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-6 py-4 text-base">
                                {consModule.consultingRoom}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-base">
                                {consModule.professionalName}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-base whitespace-nowrap">
                                {formatModuleTypeName(consModule.moduleTypeName)}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-base whitespace-nowrap">
                                {monthLabel(consModule.startMonth)} {consModule.startYear}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-base whitespace-nowrap">
                                {monthLabel(consModule.endMonth)} {consModule.endYear}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-right text-base font-medium whitespace-nowrap">
                                {formatCurrency(getModuleCost(consModule))}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-right text-base font-medium whitespace-nowrap">
                                {formatCurrency(getPaidValue(consModule))}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-base">
                                {getStatusLabel(consModule.status)}
                              </td>
                            </tr>
                          ))}
                          
                          {/* Fila de subtotal para cada profesional */}
                          <tr className="bg-cyan-50">
                            <td colSpan={5} className="border border-gray-300 px-6 py-4 text-right text-base font-bold">
                              Subtotal ({professionalName}):
                            </td>
                            <td className="border border-gray-300 px-6 py-4 text-right text-base font-bold whitespace-nowrap">
                              {formatCurrency(totalRent)}
                            </td>
                            <td className="border border-gray-300 px-6 py-4 text-right text-base font-bold whitespace-nowrap">
                              {formatCurrency(totalPaid)}
                            </td>
                            <td className="border border-gray-300 px-6 py-4"></td>
                          </tr>
                        </>
                      );
                    })}

                    {/* Fila de totales generales */}
                    <tr className="bg-cyan-100">
                      <td colSpan={5} className="border border-gray-300 px-6 py-5 text-right text-lg font-bold">
                        Totales Generales:
                      </td>
                      <td className="border border-gray-300 px-6 py-5 text-right text-lg font-bold whitespace-nowrap">
                        {formatCurrency(grandTotals.totalRent)}
                      </td>
                      <td className="border border-gray-300 px-6 py-5 text-right text-lg font-bold whitespace-nowrap">
                        {formatCurrency(grandTotals.totalPaid)}
                      </td>
                      <td className="border border-gray-300 px-6 py-5"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-8 space-y-3">
                <div className="text-xl font-semibold text-gray-900">
                  Total general del valor de alquiler: {formatCurrency(grandTotals.totalRent)}
                </div>
                <div className="text-xl font-semibold text-gray-900">
                  Total general del valor pagado: {formatCurrency(grandTotals.totalPaid)}
                </div>
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
