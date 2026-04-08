import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Professional, Occupation } from "@/common/types";

import { Toast, EmptyState, Modal, Table, DialogActions, PrimaryButton, Card, FormField, InputPassword } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";

import { HandleProfessionalControllerResponse } from "@/common/utils";
import { authFetch } from "@/common/utils/auth/AuthFetch";

import { API_BASE } from '@/lib/api';


/* ---- Utils ---- */

export default function Professionals() {
  const navigate = useNavigate();
  
  /** Estado principal: por defecto con algunos ejemplos */
  const [list, setList] = useState<Professional[]>([]);

  /** Lista de ocupaciones para el dropdown */
  const [occupations, setOccupations] = useState<Occupation[]>([]);

  /*Pantallita de error o exito al terminar una accion*/
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // para ver todos los profesionales
   useEffect(() => {
   (async () => {
 
       const res = await authFetch(`${API_BASE}/professional/getAll`);

      if (!res.ok){
        const toastData = await HandleProfessionalControllerResponse(res);
        setToast(toastData);
      } else {
        const data: Professional[] = await res.json();
        setList(data);
      }

   })()
 }, []); 

  // para obtener todas las ocupaciones
  useEffect(() => {
    (async () => {
      const res = await authFetch(`${API_BASE}/occupation/getAll`);
      if (res.ok) {
        const data: Occupation[] = await res.json();
        setOccupations(data);
      }
    })();
  }, []); 

  /* ---- Crear Profesional ---- */
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [newProfessional, setNewProfessional] = useState({
    firstName: "",
    lastName: "",
    mail: "",
    telephone: "",
    password: "",
    idOccupation: "",
  });

  const openCreateModal = () => setCreateModalOpen(true);
  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setShowPwd(false);
    setNewProfessional({
      firstName: "",
      lastName: "",
      mail: "",
      telephone: "",
      password: "",
      idOccupation: "",
    });
  };

  const handleCreateProfessional = async () => {
    const res = await authFetch(`${API_BASE}/professional/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: newProfessional.firstName,
        lastName: newProfessional.lastName,
        mail: newProfessional.mail,
        telephone: newProfessional.telephone,
        password: newProfessional.password,
        idOccupation: Number(newProfessional.idOccupation),
      }),
    });

    const toastData = await HandleProfessionalControllerResponse(res);
    setToast(toastData);

    if (res.ok) {
      // Recargar la lista
      const resGet = await authFetch(`${API_BASE}/professional/getAll`);
      if (resGet.ok) {
        const data: Professional[] = await resGet.json();
        setList(data);
      }
      closeCreateModal();
    }
  };

  
  /* ---- Eliminar ---- */
  const [deleteTarget, setDeleteTarget] = useState<Professional | null>(null);
  const openDelete = (p: Professional) => setDeleteTarget(p);
  const closeDelete = () => setDeleteTarget(null);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    (async () => {
        const res = await authFetch(
          `${API_BASE}/professional/delete/${deleteTarget.id}`, 
          {
            method: "DELETE",
        });

      // Recargar
        const resGet = await authFetch(`${API_BASE}/professional/getAll`);
        const data: Professional[] = await resGet.json();
        setList(data); 

        const toastData = await HandleProfessionalControllerResponse(res);
        setToast(toastData);

      setDeleteTarget(null);

    })();
  };


  /* ---- Descartar cambios ---- */
  const [discardCtx, setDiscardCtx] = useState<{ open: boolean; context?: "edit" }>({
    open: false,
  });
  const closeDiscard = () => setDiscardCtx({ open: false });

  
  /* ---- ESC para cerrar ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (discardCtx.open) return closeDiscard();
      if (deleteTarget) return closeDelete();
      if (createModalOpen) return closeCreateModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ deleteTarget, discardCtx.open, createModalOpen]);

  const hasItems = list.length > 0;

  /* ---- Render ---- */
  return (
    <Page>
      <SectionHeader title="Listado de profesionales" />

      {/* Estado vacío */}
      {!hasItems && (
        <EmptyState
          title="Aún no hay profesionales registrados"
          description="Agregá el primer profesional para comenzar."
          icon={
            <svg className="w-12 h-12 text-cyan-600" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5m-8.5 8a8.5 8.5 0 0 1 17 0z"
              />
            </svg>
          }
          action={<PrimaryButton onClick={openCreateModal}>Agregar profesional</PrimaryButton>}
        />
      )}

      {/* Botones de acción */}
      {hasItems && (
        <div className="flex gap-3 mb-4">
          <PrimaryButton onClick={openCreateModal}>
            Crear nuevo profesional
          </PrimaryButton>
          <PrimaryButton variant="outline" onClick={() => navigate('/admin/professionals-leaves')}>
            Ver licencias
          </PrimaryButton>
        </div>
      )}

      {/* Tabla */}
      {hasItems && (
        <Card>
          <Table headers={["ID", "Nombre", "Apellido", "Especialidad", "Mail", "Teléfono", "Estado", "Acciones"]}>
            {[...list] 
              .sort((a, b) => Number(a.id) - Number(b.id)) // orden ascendente por ID
              .map((p) => (
                <tr key={p.id} className="even:bg-gray-50 hover:bg-gray-100 transition">
                  <td className="px-4 py-3">{p.id}</td>
                  <td className="px-4 py-3">{p.firstName}</td>
                  <td className="px-4 py-3">{p.lastName}</td>
                  <td className="px-4 py-3">{p.occupation?.name ?? "—"}</td>
                <td className="px-4 py-3">{p.user?.mail ?? "—"}</td>
                  <td className="px-4 py-3">{p.telephone ?? "—"}</td>
                  <td className="px-4 py-3">
                    {!p.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-1 text-sm rounded-full border bg-rose-50 text-rose-800 border-rose-300">
                        Inhabilitado
                      </span>
                    ) : p.isOnLeave ? (
                      <span className="inline-flex items-center px-2.5 py-1 text-sm rounded-full border bg-amber-50 text-amber-800 border-amber-300">
                        De Licencia
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 text-sm rounded-full border bg-emerald-50 text-emerald-800 border-emerald-300">
                        Disponible
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <PrimaryButton variant="outline" size="sm" onClick={() => navigate('/edit-profile', { state: { selectedUserId: p.user?.id } })}>
                        Editar
                      </PrimaryButton>
                      <PrimaryButton variant="danger" size="sm" onClick={() => openDelete(p)}>
                        Inhabilitar
                      </PrimaryButton>
                    </div>
                  </td>
                </tr>
              ))}
          </Table>
        </Card>
      )}

      {/* Modal: Crear Profesional */}
      {createModalOpen && (
        <Modal title="ALTA PROFESIONAL" onClose={closeCreateModal}>
          <div className="space-y-4">
            <FormField label="Nombre" htmlFor="firstName">
              <input
                id="firstName"
                name="firstName"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500"
                value={newProfessional.firstName}
                onChange={(e) => setNewProfessional({ ...newProfessional, firstName: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Apellido" htmlFor="lastName">
              <input
                id="lastName"
                name="lastName"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500"
                value={newProfessional.lastName}
                onChange={(e) => setNewProfessional({ ...newProfessional, lastName: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Mail" htmlFor="mail">
              <input
                id="mail"
                name="mail"
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500"
                value={newProfessional.mail}
                onChange={(e) => setNewProfessional({ ...newProfessional, mail: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Teléfono" htmlFor="telephone">
              <input
                id="telephone"
                name="telephone"
                type="tel"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500"
                value={newProfessional.telephone}
                onChange={(e) => setNewProfessional({ ...newProfessional, telephone: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Contraseña" htmlFor="password">
              <InputPassword
                id="password"
                name="password"
                value={newProfessional.password}
                onChange={(e) => setNewProfessional({ ...newProfessional, password: e.target.value })}
                showPwd={showPwd}
                toggleShowPwd={() => setShowPwd(v => !v)}
              />
            </FormField>

            <FormField label="Especialidad" htmlFor="idOccupation">
              <select
                id="idOccupation"
                name="idOccupation"
                value={newProfessional.idOccupation}
                onChange={(e) => setNewProfessional({ ...newProfessional, idOccupation: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black"
                required
              >
                <option value="">Seleccione una especialidad</option>
                {occupations.map((occ) => (
                  <option key={occ.id} value={occ.id}>
                    {occ.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <DialogActions>
            <PrimaryButton onClick={handleCreateProfessional}>
              Registrar profesional
            </PrimaryButton>
            <PrimaryButton variant="outline" onClick={closeCreateModal}>
              Cancelar
            </PrimaryButton>
          </DialogActions>
        </Modal>
      )}

      {/* Modal: Inhabilitar */}
      {deleteTarget && (
        <Modal title="¿Está seguro que desea inhabilitar al profesional?" onClose={closeDelete}>
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Inhabilitar el profesional hará que los módulos alquilados y todos los turnos del profesional sean cancelados
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex">
                <span className="font-medium text-gray-700 w-24">Nombre:</span>
                <span className="text-gray-900">{deleteTarget.firstName}</span>
              </div>
              <div className="flex">
                <span className="font-medium text-gray-700 w-24">Apellido:</span>
                <span className="text-gray-900">{deleteTarget.lastName}</span>
              </div>
              <div className="flex">
                <span className="font-medium text-gray-700 w-24">Mail:</span>
                <span className="text-gray-900">{deleteTarget.user?.mail ?? "—"}</span>
              </div>
            </div>
          </div>
          
          <DialogActions>
            <PrimaryButton variant="danger" onClick={handleDeleteConfirm}>
              Inhabilitar profesional
            </PrimaryButton>
            <PrimaryButton variant="outline" onClick={closeDelete}>
              Cancelar
            </PrimaryButton>
          </DialogActions>
        </Modal>
      )}

      {/* Toast 
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}*/}
    </Page>


  );
}
