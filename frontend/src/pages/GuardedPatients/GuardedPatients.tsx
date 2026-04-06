import React, { useEffect, useMemo, useState } from "react";

import { Toast, Modal, Table, SummaryList, 
  DialogActions, PrimaryButton, FormField, Card, FilterBar } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";

import {
  HandlePatientControllerResponse,
  HandleLegalGuardianControllerResponse
} from '@/common/utils';
import { LegalGuardian, Patient, UserRole } from "@/common/types";
import { authFetch } from "@/common/utils/auth/AuthFetch";
import { API_BASE } from '@/lib/api';
import { useAuth } from "@/common/utils/auth/AuthContext";


// ---- Utils ----
const formatDate = (iso: string) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const validatePatient = (p: Partial<Patient>) => {
  const errors: Record<string, string> = {};
  if (!p.firstName?.trim()) errors.firstName = "Nombre obligatorio.";
  if (!p.lastName?.trim()) errors.lastName = "Apellido obligatorio.";
  if (!p.birthdate) errors.birthdate = "Fecha de nacimiento obligatoria.";
  return errors;
};

export default function GuardedPatients() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.Admin;
  const isLegalGuardian = user?.role === UserRole.LegalGuardian;

  // no se si es legal este tipo de búsqueda. Pero los fetchs en este caso funcionan directamtente con el id de legalGuardian, y no con el id de usuario.
  const myLegalGuardianId =user?.legalGuardian?.id ??  user?.id ;


  const [patients, setPatients] = useState<Patient[]>([]);
  const [legalGuardians, setLegalGuardians] = useState<LegalGuardian[]>([]);
  const [selectedGuardianId, setSelectedGuardianId] = useState<number | null>(null);

  // ---------- Agregar ----------
  const [addForm, setAddForm] = useState<Partial<Patient>>({
    firstName: "",
    lastName: "",
    birthdate: "",
  }); 

  /*Pantallita de error o exito al terminar una accion*/
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const addErrors = useMemo(() => validatePatient(addForm), [addForm]);

// Carga de responsables legales (según rol)
useEffect(() => {
  (async () => {
    const res = await authFetch(`${API_BASE}/legalGuardian/getAll?includeInactive=false`);
    if (!res.ok) {
      const toastData = await HandleLegalGuardianControllerResponse(res);
      setToast(toastData);
      return;
    }
    const data: LegalGuardian[] = await res.json();

    if (isAdmin) {
      setLegalGuardians(data);
      setSelectedGuardianId(prev => (prev ?? data[0]?.id ?? null));
      return;
    }

    if (isLegalGuardian) {
      setLegalGuardians([]); // no necesita selector
      setSelectedGuardianId(myLegalGuardianId ?? null);

      return;
    }

  })();
}, [isAdmin, isLegalGuardian, myLegalGuardianId]);


  //Carga de lista de pacientes
  useEffect(() => {
     if (!selectedGuardianId) return;
     (async () => {

         const res = await authFetch(`${API_BASE}/patient/getByLegalGuardian/${selectedGuardianId}?includeInactive=false`);
  
        if (!res.ok){
          const toastData = await HandlePatientControllerResponse(res);
          setToast(toastData);
        } else {
          const data: Patient[] = await res.json();
          setPatients(data);
        }
  
     })()
   }, [selectedGuardianId]); 



  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(addErrors).length) return;

    const payload = {
      firstName: (addForm.firstName ?? "").trim(),
      lastName: (addForm.lastName ?? "").trim(),
      birthdate: addForm.birthdate ?? "",
      idLegalGuardian: selectedGuardianId,
    };

    const res = await authFetch(`${API_BASE}/patient/addDepPatient`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if(res.ok) {
      const resGet = await authFetch(`${API_BASE}/patient/getByLegalGuardian/${selectedGuardianId}?includeInactive=false`);
      const data: Patient[] = await resGet.json();
      setPatients(data); 
      // Limpiar el formulario
      setAddForm({ firstName: "", lastName: "", birthdate: "" });
    }
    const toastData = await HandlePatientControllerResponse(res);
    setToast(toastData);
  };

  const handleCancelAdd = () => {
    setAddForm({ firstName: "", lastName: "", birthdate: "" });
  };

  // ---------- Editar ----------
  const [editTarget, setEditTarget] = useState<Patient | null>(null);
  const [editStep, setEditStep] = useState<"form" | "confirm">("form");
  const [editForm, setEditForm] = useState<Partial<Patient>>({});
  const editErrors = useMemo(() => validatePatient(editForm), [editForm]);

  const openEdit = (p: Patient) => {
    const initial = {
      firstName: p.firstName,
      lastName: p.lastName,
      birthdate: p.birthdate,
    };
    setEditTarget(p);
    setEditForm(initial);
    setEditStep("form");
  };
  const closeEdit = React.useCallback(() => {
    setEditTarget(null);
    setEditForm({});
  }, []);

  const tryCloseEdit = React.useCallback(() => {
    closeEdit();
  }, [closeEdit]);

  const handleEditContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(editErrors).length) return;
    setEditStep("confirm");
  };
  const handleEditConfirm = async () => {
    if (!editTarget) return;

    const payload = {
      idPatient: editTarget.id,
      firstName: (editForm.firstName ?? "").trim(),
      lastName: (editForm.lastName ?? "").trim(),
      birthdate: editForm.birthdate ?? "",
    };


    const res = await authFetch(`${API_BASE}/patient/updateDepPatient`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const resGet = await authFetch(`${API_BASE}/patient/getByLegalGuardian/${selectedGuardianId}?includeInactive=false`);
      const data: Patient[] = await resGet.json();
      setPatients(data); 
    }
    closeEdit();
    const toastData = await HandlePatientControllerResponse(res);
    setToast(toastData);
  };



  // ---------- ESC para cerrar  ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editTarget) return tryCloseEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editTarget, tryCloseEdit]);

  // ---------- Derivados para render ----------
  const hasPatients = patients.length > 0;


  return (

    <Page>
      <SectionHeader title="Pacientes a cargo" />

      {/* Selector de responsable legal only for the admin! */}
      {isAdmin && (
        <FilterBar>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Responsable legal" htmlFor="guardian">
              <select
                id="guardian"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={selectedGuardianId ?? ""}
                onChange={(e) => setSelectedGuardianId(Number(e.target.value))}
              >
                {[...legalGuardians]
                  .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {`Id: ${g.id}, ${g.lastName} ${g.firstName}`}
                    </option>
                  ))}
              </select>
            </FormField>
          </div>
        </FilterBar>
      )}

      {/* Formulario para agregar paciente */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Añadir paciente a cargo</h2>
        <form onSubmit={handleAddPatient} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Nombre" htmlFor="add-firstName">
              <input
                id="add-firstName"
                type="text"
                value={addForm.firstName ?? ""}
                onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
                className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-cyan-500"
                aria-invalid={!!addErrors.firstName}
                aria-describedby={addErrors.firstName ? "add-firstName-err" : undefined}
              />
              {addErrors.firstName && (
                <p id="add-firstName-err" className="text-red-600 text-sm mt-1">
                  {addErrors.firstName}
                </p>
              )}
            </FormField>

            <FormField label="Apellido" htmlFor="add-lastName">
              <input
                id="add-lastName"
                type="text"
                value={addForm.lastName ?? ""}
                onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
                className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-cyan-500"
                aria-invalid={!!addErrors.lastName}
                aria-describedby={addErrors.lastName ? "add-lastName-err" : undefined}
              />
              {addErrors.lastName && (
                <p id="add-lastName-err" className="text-red-600 text-sm mt-1">
                  {addErrors.lastName}
                </p>
              )}
            </FormField>

            <FormField label="Fecha de nacimiento" htmlFor="add-fecha">
              <input
                id="add-fecha"
                type="date"
                value={addForm.birthdate ?? ""}
                onChange={(e) => setAddForm((f) => ({ ...f, birthdate: e.target.value }))}
                className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-cyan-500"
                aria-invalid={!!addErrors.birthdate}
                aria-describedby={addErrors.birthdate ? "add-fecha-err" : undefined}
              />
              {addErrors.birthdate && (
                <p id="add-fecha-err" className="text-red-600 text-sm mt-1">
                  {addErrors.birthdate}
                </p>
              )}
            </FormField>
          </div>
          
          <div className="flex gap-3">
            <PrimaryButton type="submit">Agregar paciente</PrimaryButton>
            <PrimaryButton variant="outline" type="button" onClick={handleCancelAdd}>
              Cancelar
            </PrimaryButton>
          </div>
        </form>
      </Card>

      {/* Listado de pacientes */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Listado de pacientes a cargo</h2>
        {!hasPatients ? (
          <p className="text-gray-500 text-center py-8">No hay pacientes a cargo.</p>
        ) : (
          <Table headers={["Nombre", "Apellido", "Fecha de nacimiento", "Acciones"]}>
            {[...patients]
              .sort((a, b) => (a.firstName ?? '').localeCompare(b.firstName ?? '', "es", { sensitivity: "base" }))
              .map((p) => (
                <tr key={p.id} className="even:bg-gray-50 hover:bg-gray-100 transition">
                  <td className="px-4 py-3">{p.firstName}</td>
                  <td className="px-4 py-3">{p.lastName}</td>
                  <td className="px-4 py-3">
                    {(p.birthdate ?? '').split('T')[0] || ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <PrimaryButton variant="outline" size="sm" onClick={() => openEdit(p)}>
                        Editar
                      </PrimaryButton>
                    </div>
                  </td>
                </tr>
              ))}
          </Table>
        )}
      </Card>

      {/* Modal: Editar */}
      {editTarget && (
        <Modal title={editStep === "form" ? "Editar paciente a cargo" : "Confirmar cambios"} onClose={tryCloseEdit}>
          {editStep === "form" ? (
            <form onSubmit={handleEditContinue} className="space-y-4" noValidate>
              <FormField label="Nombre" htmlFor="edit-firstName">
                <input
                  id="edit-firstName"
                  type="text"
                  value={editForm.firstName ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-cyan-500"
                  aria-invalid={!!editErrors.firstName}
                  aria-describedby={editErrors.firstName ? "edit-firstName-err" : undefined}
                  autoFocus
                />
                {editErrors.firstName && (
                  <p id="edit-firstName-err" className="text-red-600 text-sm mt-1">
                    {editErrors.firstName}
                  </p>
                )}
              </FormField>

              <FormField label="Apellido" htmlFor="edit-lastName">
                <input
                  id="edit-lastName"
                  type="text"
                  value={editForm.lastName ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-cyan-500"
                  aria-invalid={!!editErrors.lastName}
                  aria-describedby={editErrors.lastName ? "edit-lastName-err" : undefined}
                />
                {editErrors.lastName && (
                  <p id="edit-lastName-err" className="text-red-600 text-sm mt-1">
                    {editErrors.lastName}
                  </p>
                )}
              </FormField>

              <FormField label="Fecha de nacimiento" htmlFor="edit-fecha">
                <input
                  id="edit-fecha"
                  type="date"
                  value={editForm.birthdate ? editForm.birthdate.split("T")[0] : ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, birthdate: e.target.value }))}
                  className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-cyan-500"
                  aria-invalid={!!editErrors.birthdate}
                  aria-describedby={editErrors.birthdate ? "edit-fecha-err" : undefined}
                />
                {editErrors.birthdate && (
                  <p id="edit-fecha-err" className="text-red-600 text-sm mt-1">
                    {editErrors.birthdate}
                  </p>
                )}
              </FormField>

              <DialogActions>
                <PrimaryButton type="submit">Editar paciente</PrimaryButton>
                <PrimaryButton variant="outline" onClick={tryCloseEdit}>
                  Cancelar
                </PrimaryButton>
              </DialogActions>
            </form>
          ) : (
            <>
              <SummaryList
                items={[
                  { label: "ID", value: String(editTarget.id) },
                  { label: "Nombre", value: editForm.firstName ?? "" },
                  { label: "Apellido", value: editForm.lastName ?? "" },
                  { label: "Fecha de nacimiento", value: formatDate(editForm.birthdate ?? "") },
                ]}
              />
              <DialogActions>
                <PrimaryButton variant="outline" onClick={() => setEditStep("form")}>
                  Volver
                </PrimaryButton>
                <PrimaryButton onClick={handleEditConfirm}>Confirmar</PrimaryButton>
              </DialogActions>
            </>
          )}
        </Modal>
      )}

      {/* Toast 
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}*/}
    </Page>

  );
}