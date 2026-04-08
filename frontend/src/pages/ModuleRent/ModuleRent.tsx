import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Toast, PrimaryButton, FormField, Card, FilterBar,
  RentLegend, WeekGrid, Modal
 } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";

import { HandleModuleControllerResponse, HandleConsultingRoomControllerResponse, HandleProfessionalControllerResponse } from "@/common/utils";
import { ConsultingRoom, Professional, UserRole } from "@/common/types";
import { authFetch } from "@/common/utils/auth/AuthFetch";
import { API_BASE } from '@/lib/api';
import { useAuth } from "@/common/utils/auth/AuthContext";

export type DayKey = "lun" | "mar" | "mie" | "jue" | "vie" | "sab";
export type SlotState = "available" | "mine" | "reserved" | "unavailable";
export type SlotId = `${DayKey}-${string}`;
export type Availability = Record<DayKey, Record<string, SlotState>>;

const DAYS: DayKey[] = ["lun", "mar", "mie", "jue", "vie", "sab"];

const DAY_LABELS: Record<DayKey, string> = {
  lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves", vie: "Viernes", sab: "Sábado",
};

const HOURS = [
  "08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00",
  "18:00","19:00","20:00",
];

const isAllowed = (day: DayKey, hour: string): boolean => {
  const H = Number(hour.slice(0, 2));
  if (day === "sab") return H >= 8 && H <= 12;
  return H >= 14 && H <= 20; // Lunes a viernes: 14hs a 20hs
};

const add60 = (hhmm: string) => {
  const [hh, mm] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, hh, mm);
  d.setMinutes(d.getMinutes() + 60);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

const numToDay = (n: number): DayKey => DAYS[n-1] ?? "lun";

const buildBaseAvailability = (): Availability => {
  const base: Availability = { lun:{}, mar:{}, mie:{}, jue:{}, vie:{}, sab:{} };
  DAYS.forEach(d => {
    HOURS.forEach(h => {
      base[d][h] = isAllowed(d,h) ? "available" : "unavailable";
    });
  });
  return base;
};

// Tipos de módulos (misma lógica del backend con costos)
const MODULE_TYPES = [
  { name: 'Módulo Completo', duration: 6, cost: 50000 },
  { name: 'Medio Módulo', duration: 3, cost: 30000 },
  { name: 'Sexto de Módulo', duration: 1, cost: 20000 },
];

// Calcular horas entre dos horarios
const calculateHours = (startTime: string, endTime: string): number => {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  let diffMinutes = endTotalMinutes - startTotalMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }
  
  return diffMinutes / 60;
};

// Calcular tipos de módulos a alquilar
const calculateModuleTypes = (startTime: string, endTime: string): { name: string; amount: number; cost: number }[] => {
  let totalHours = calculateHours(startTime, endTime);
  const result: { name: string; amount: number; cost: number }[] = [];
  
  for (const moduleType of MODULE_TYPES) {
    const amount = Math.floor(totalHours / moduleType.duration);
    if (amount > 0) {
      result.push({ name: moduleType.name, amount, cost: moduleType.cost });
      totalHours -= amount * moduleType.duration;
    }
  }
  
  return result;
};

// Calcular costo total
const calculateTotalCost = (modules: { amount: number; cost: number }[]): number => {
  return modules.reduce((total, mod) => total + (mod.amount * mod.cost), 0);
};

export default function ModuleRent() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.Admin;
  const isProfessional = user?.role === UserRole.Professional;

  const myProfessionalId = user?.professional?.id ?? user?.id;


  const [consultingRoomId, setConsultingRoomId] = useState<number | undefined>(undefined);
  const [availability, setAvailability] = useState<Availability>(buildBaseAvailability);
  const [selected, setSelected] = useState<Set<SlotId>>(new Set());
  const [rangeStart, setRangeStart] = useState<SlotId | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [consultingRooms, setConsultingRooms] = useState<ConsultingRoom[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | undefined>(undefined);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // Estados para modales
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [rentedModules, setRentedModules] = useState<any[]>([]);
  const navigate = useNavigate();
  
  
  // === cargar consultorios ===
  useEffect(() => {
    const fetchConsultingRooms = async () => {
      const res = await authFetch(`${API_BASE}/consultingRoom/getAll?includeInactive=false`);

      if(!res.ok) {
        const toastData = await HandleConsultingRoomControllerResponse(res);
        setToast(toastData);
        return;
      }

      const data: ConsultingRoom[] = await res.json();
      setConsultingRooms(data);
      if (data.length) setConsultingRoomId(data[0].id);
    };
    fetchConsultingRooms();
  }, []);

// === cargar profesionales ===
  useEffect(() => {
    const fetchProfessionals = async () => {
      const res = await authFetch(`${API_BASE}/professional/getAll?includeInactive=false`);
      if (!res.ok) {
        const toastData = await HandleProfessionalControllerResponse(res);
        setToast(toastData);
        return;
      }
      const data: Professional[] = await res.json();

      if (isAdmin) {
        setProfessionals(data);
        setSelectedProfessionalId(prev => prev ?? data[0]?.id);
        return;
      }

      if (isProfessional) {
        const me = data.find(p => p.id === myProfessionalId) ?? null;
        setProfessionals(me ? [me] : []);
        setSelectedProfessionalId(me?.id);
        return;
      }

    };
    fetchProfessionals();
  }, [isAdmin, isProfessional, myProfessionalId]);

  
  // === Limpiar rangos al cambiar de dia/consultorio o clickear por tercera vez
  useEffect(() => {
    clearSelection();
    setRangeStart(null);
}, [consultingRoomId, selectedProfessionalId]);

// lo paso a useCallback ya que:
// Si un useEffect llama a una función definida en el componente → useCallback.
// y porque: Si una función está en un dependency array → debe ser estable.
  const fetchModules = React.useCallback(async () => {
    if (consultingRoomId == null || selectedProfessionalId == null) return;
      try {
        const res = await authFetch(`${API_BASE}/module/getCurrentMonthModulesByConsultingRoom/${consultingRoomId}`);

        if(!res.ok) {
          const toastData = await HandleModuleControllerResponse(res);
          setToast(toastData);
          return;
        }

        const resJson = await res.json();
        const next = buildBaseAvailability();

        resJson.forEach((mod:any) => {
          const day = numToDay(mod.day);
          let h = mod.startTime.slice(0,5);
          const end = mod.endTime.slice(0,5);
          while(h < end){
            if(HOURS.includes(h)){
              next[day][h] = mod.professional === selectedProfessionalId ? "mine" : "reserved";
            }
            h = add60(h);
          }
        });

        // Restricciones de horarios
        HOURS.forEach(h => {
          const hour = Number(h.slice(0,2));
          // Sábados: solo 8-12hs
          if(hour >= 13) next.sab[h] = "unavailable";
          // Lunes a viernes: solo 14-20hs
          DAYS.forEach(d => {
            if(d !== 'sab' && hour < 14) {
              next[d][h] = "unavailable";
            }
          });
        });

        setAvailability(next);
      } catch(err){ console.error(err); }
    }, [consultingRoomId, selectedProfessionalId]);

// === cargar módulos ===
  useEffect(() => {
    fetchModules();
  }, [fetchModules]);


  // === selección rango a reservar===
  const selectRange = (clickedId: SlotId) => {
    const [clickedDay, clickedHour] = clickedId.split("-") as [DayKey, string];

    // Caso: click en otro día o ya había selección previa
    if (!rangeStart || rangeStart.split("-")[0] !== clickedDay || availability[clickedDay][clickedHour] !== "available") {
      const state = availability[clickedDay][clickedHour];
      if (state !== "available") {
        clearSelection();
        return
      }

      setRangeStart(clickedId);
      setSelected(new Set([clickedId]));
      return;
    }

    // Caso normal: extender selección en el mismo día
    const [startDay, startHour] = rangeStart.split("-") as [DayKey, string];

    const startIndex = HOURS.indexOf(startHour);
    const endIndex = HOURS.indexOf(clickedHour);
    if (startIndex === -1 || endIndex === -1) return;

    const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

    const newSelected = new Set<SlotId>();
    for (let i = from; i <= to; i++) {
      const hour = HOURS[i];
      const state = availability[startDay][hour];

      if (state !== "available") break; // detener en bloqueado
      newSelected.add(`${startDay}-${hour}`);
    }

    setSelected(newSelected);
  };

  const clearSelection = () => { setSelected(new Set()); setRangeStart(null); };

  const isSelectable = (s:SlotState) => false; // Deshabilitado - ahora se usa el formulario

  // Nuevos estados para el formulario de alquiler
  const [selectedDay, setSelectedDay] = useState<DayKey | "">("");
  const [selectedStartTime, setSelectedStartTime] = useState<string>("");
  const [selectedEndTime, setSelectedEndTime] = useState<string>("");

  // Abrir modal de confirmaci\u00f3n
  const openConfirmModal = () => {
    if (!selectedDay || !selectedStartTime || !selectedEndTime) return;
    setShowConfirmModal(true);
  };

  // Confirmar alquiler (llama al backend)
  const onConfirmRent = async () => {
    if (!selectedDay || !selectedStartTime || !selectedEndTime || !consultingRoomId || !selectedProfessionalId) return;

    const payload = {
      day: DAYS.indexOf(selectedDay as DayKey) + 1,
      startTime: selectedStartTime,
      endTime: selectedEndTime,
      validMonth: new Date().getMonth() + 1,
      validYear: new Date().getFullYear(),
      idProfessional: selectedProfessionalId,
      idConsultingRoom: consultingRoomId,
      isPaid: isPaid
    };

    try {
      const res = await authFetch(`${API_BASE}/module/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setRentedModules(data.modules || []);
        setShowConfirmModal(false);
        setShowReceiptModal(true);
        await fetchModules();
      } else {
        const toastData = await HandleModuleControllerResponse(res);
        setToast(toastData);
        setShowConfirmModal(false);
      }
    } catch (err: any) {
      setToast({ message: err.message || "Error desconocido", type: "error" });
      setShowConfirmModal(false);
    }
  };

  // Cerrar todo y volver al portal
  const handleBackToPortal = () => {
    setShowReceiptModal(false);
    setShowConfirmModal(false);
    setSelectedDay("");
    setSelectedStartTime("");
    setSelectedEndTime("");
    setIsPaid(false);
    navigate('/professional-portal');
  };


  return (

    <Page>
      <SectionHeader 
        title="Alquiler de módulos" 
        subtitle={`Mes: ${new Date().toLocaleString('es-AR', { month: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleString('es-AR', { month: 'long' }).slice(1)}`}
      />

      {/* filtros */}
        <FilterBar>
          <div className="grid grid-cols-1 gap-4">
            {/* Botones de consultorios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Consultorio
              </label>
              <div className="flex flex-wrap gap-2">
                {consultingRooms.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setConsultingRoomId(c.id)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                      consultingRoomId === c.id
                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-cyan-400 hover:bg-cyan-50'
                    }`}
                  >
                    {c.description}
                  </button>
                ))}
              </div>
            </div>

            {isAdmin && (
              <FormField label="Profesional" htmlFor="sel-pro">
                <select
                  id="sel-pro"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  value={selectedProfessionalId ?? ""}
                  onChange={(e) => setSelectedProfessionalId(Number(e.target.value))}
                >
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </div>

          {/* Leyenda de estados */}
          <div className="mt-3">
            <RentLegend />
          </div>
        </FilterBar>

      {/* Grilla semanal de módulos */}
      <Card>
        <WeekGrid
          days={DAYS}
          dayLabels={DAY_LABELS}
          hours={HOURS}
          availability={availability}
          selected={selected}
          isSelectable={isSelectable}
          onClickSlot={(id) => {}} // Deshabilitado
          add60={add60}
        />
      </Card>

      {/* Formulario de alquiler */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Alquilar</h3>
        
        {/* Selector de día - Primera fila */}
        <div className="mb-4">
          <FormField label="Día:" htmlFor="sel-day">
            <select
              id="sel-day"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={selectedDay}
              onChange={(e) => {
                setSelectedDay(e.target.value as DayKey | "");
                setSelectedStartTime("");
                setSelectedEndTime("");
              }}
            >
              <option value="">Seleccionar día</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS[d]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Selectores de horarios y preview - Segunda fila */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selector de hora desde */}
            <FormField label="Horario desde:" htmlFor="sel-start-time">
              <select
                id="sel-start-time"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={selectedStartTime}
                onChange={(e) => {
                  setSelectedStartTime(e.target.value);
                  setSelectedEndTime("");
                }}
                disabled={!selectedDay}
              >
                <option value="">Seleccionar hora</option>
                {HOURS.filter(h => selectedDay && isAllowed(selectedDay as DayKey, h)).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Selector de hora hasta */}
            <FormField label="Horario hasta:" htmlFor="sel-end-time">
              <select
                id="sel-end-time"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={selectedEndTime}
                onChange={(e) => setSelectedEndTime(e.target.value)}
                disabled={!selectedStartTime}
              >
                <option value="">Seleccionar hora</option>
                {HOURS.filter(h => 
                  selectedDay && 
                  isAllowed(selectedDay as DayKey, h) &&
                  add60(h) > selectedStartTime
                ).map((h) => (
                  <option key={h} value={add60(h)}>
                    {add60(h)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Preview de tipos de módulos */}
          {selectedStartTime && selectedEndTime && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Usted va a alquilar:</h4>
              <ul className="space-y-2">
                {calculateModuleTypes(selectedStartTime, selectedEndTime).map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-cyan-600 mr-2">•</span>
                    <span className="text-gray-700 text-sm">
                      {item.amount > 1 ? `${item.amount} × ` : ''}{item.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Botón de alquilar */}
        <div className="mt-4">
          <PrimaryButton 
            onClick={openConfirmModal}
            disabled={!selectedDay || !selectedStartTime || !selectedEndTime}
          >
            Alquilar
          </PrimaryButton>
        </div>
      </Card>

      {/* Modal de Confirmación de Alquiler */}
      {showConfirmModal && selectedDay && selectedStartTime && selectedEndTime && (
        <Modal 
          title="¿Está seguro que desea confirmar el alquiler?" 
          onClose={() => setShowConfirmModal(false)}
        >
          <div className="space-y-4">
            {/* Datos del alquiler */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <p><strong>Mes:</strong> {new Date().toLocaleString('es-AR', { month: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleString('es-AR', { month: 'long' }).slice(1)}</p>
              <p><strong>Día semana:</strong> {DAY_LABELS[selectedDay as DayKey]}</p>
              <p><strong>Hora desde:</strong> {selectedStartTime}</p>
              <p><strong>Hora hasta:</strong> {selectedEndTime}</p>
              <p><strong>Consultorio:</strong> {consultingRooms.find(c => c.id === consultingRoomId)?.description || '-'}</p>
            </div>

            {/* Tabla de tipos de módulos */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Tipo de módulo</th>
                    <th className="px-4 py-2 text-center font-semibold">Cantidad</th>
                    <th className="px-4 py-2 text-right font-semibold">Costo unitario</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateModuleTypes(selectedStartTime, selectedEndTime).map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2 text-center">{item.amount}</td>
                      <td className="px-4 py-2 text-right">${item.cost.toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recuadro de costo total y pago */}
            <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-lg space-y-3">
              <p className="text-lg font-bold text-gray-800">
                Costo Total: ${calculateTotalCost(calculateModuleTypes(selectedStartTime, selectedEndTime)).toLocaleString('es-AR')}
              </p>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                />
                <span className="text-sm font-medium">Pagar módulos a alquilar</span>
              </label>
              <p className="text-xs text-red-600 font-medium">
                Los módulos no pagos deberán regularizarse posteriormente con la directora.
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3 justify-end pt-2">
              <PrimaryButton variant="outline" onClick={() => setShowConfirmModal(false)}>
                Volver
              </PrimaryButton>
              <PrimaryButton onClick={onConfirmRent}>
                Confirmar alquiler
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Constancia de Alquiler */}
      {showReceiptModal && selectedDay && selectedStartTime && selectedEndTime && (
        <Modal 
          title="Constancia de Alquiler" 
          onClose={handleBackToPortal}
        >
          <div className="space-y-4">
            {/* Datos del alquiler */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <p><strong>Consultorio:</strong> {consultingRooms.find(c => c.id === consultingRoomId)?.description || '-'}</p>
              <p><strong>Mes:</strong> {new Date().toLocaleString('es-AR', { month: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleString('es-AR', { month: 'long' }).slice(1)}</p>
              <p><strong>Día:</strong> {DAY_LABELS[selectedDay as DayKey]}</p>
              <p><strong>Horario:</strong> {selectedStartTime}hs - {selectedEndTime}hs</p>
              <p><strong>Estado:</strong> <span className={isPaid ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>{isPaid ? 'Pagado' : 'A pagar'}</span></p>
            </div>

            {/* Tabla de tipos de módulos */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Tipo de módulo</th>
                    <th className="px-4 py-2 text-center font-semibold">Cantidad</th>
                    <th className="px-4 py-2 text-right font-semibold">Costo unitario</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateModuleTypes(selectedStartTime, selectedEndTime).map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2 text-center">{item.amount}</td>
                      <td className="px-4 py-2 text-right">${item.cost.toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Costo total */}
            <div className="bg-cyan-50 border-2 border-cyan-400 p-4 rounded-lg">
              <p className="text-lg font-bold text-gray-800">
                Costo total: ${calculateTotalCost(calculateModuleTypes(selectedStartTime, selectedEndTime)).toLocaleString('es-AR')}
              </p>
            </div>

            {/* Botón */}
            <div className="flex justify-end pt-2">
              <PrimaryButton onClick={handleBackToPortal}>
                Volver
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast 
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}*/}
      
    </Page>



  );
}
