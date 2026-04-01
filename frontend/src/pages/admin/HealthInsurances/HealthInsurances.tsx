import React, { useEffect, useState } from "react";

import { HealthInsurance } from "@/common/types";

import { Toast, EmptyState, Modal, Table, ActionGrid, PrimaryButton, FormField, Card } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";

import { HandleHealthInsuranceControllerResponse  } from "@/common/utils";
import { authFetch } from "@/common/utils/auth/AuthFetch";

import { API_BASE } from '@/lib/api';

export default function HealthInsurances() {

  /* Estado principal: arrancamos vacío para mostrar el estado vacío */
  const [items, setItems] = useState<HealthInsurance[]>([]);

  /*Pantallita de error o exito al terminar una accion*/
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);


  /* VER TODAS */
  useEffect(() => {
  (async () => {

      const res = await authFetch(`${API_BASE}/healthInsurance/getAll?includeInactive=false`);

      if (!res.ok){
        const toastData = await HandleHealthInsuranceControllerResponse(res);
        setToast(toastData);
      } else {
        const data: HealthInsurance[] = await res.json();
        setItems(data);

      }

  })();
}, []);

  /* ---- Agregar ---- */
  const [addForm, setAddForm] = useState("");
  const [addError, setAddError] = useState<{
    message: string;
    conflictingEntity?: { id: number; name: string };
  } | null>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = addForm.trim();
    if (!name) return;

    // Limpiar error previo
    setAddError(null);

    (async () => {
        const res = await authFetch(`${API_BASE}/healthInsurance/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
      
        if (res.ok) {
          // Recargar solo si fue exitoso
          const resGet = await authFetch(`${API_BASE}/healthInsurance/getAll?includeInactive=false`);
          const data: HealthInsurance[] = await resGet.json();
          setItems(data);
          
          const toastData = await HandleHealthInsuranceControllerResponse(res);
          setToast(toastData);
          
          // Limpiar el formulario
          setAddForm("");
        } else {
          // Manejar error
          const errorData = await res.json().catch(() => ({}));
          
          if (errorData.code === 'DUPLICATE_HEALTH_INSURANCE' && errorData.conflictingEntity) {
            setAddError({
              message: errorData.message,
              conflictingEntity: errorData.conflictingEntity
            });
          } else {
            // Para otros errores, mostrar en toast
            const toastData = await HandleHealthInsuranceControllerResponse(res);
            setToast(toastData);
          }
        }
    })();
  };

  /* ---- Editar ---- */
  const [editTarget, setEditTarget] = useState<HealthInsurance | null>(null);
  const [editForm, setEditForm] = useState("");
  const [editError, setEditError] = useState<{
    message: string;
    conflictingEntity?: { id: number; name: string };
  } | null>(null);

  const openEdit = (h: HealthInsurance) => {
    setEditTarget(h);
    setEditForm(h.name);
    setEditError(null);
  };
  const closeEdit = () => {
    setEditTarget(null);
    setEditForm("");
    setEditError(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const name = editForm.trim();
    if (!name) return;

    // Limpiar error previo
    setEditError(null);

    (async () => {
      const payload = {
        idHealthInsurance: editTarget.id, 
        name
      };

      const res = await authFetch(`${API_BASE}/healthInsurance/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        // Refrescamos localmente solo si fue exitoso
        setItems((prev) =>
          prev.map((h) => (h.id === editTarget.id ? { ...h, name } : h))
        );
        
        const toastData = await HandleHealthInsuranceControllerResponse(res);
        setToast(toastData);
        
        closeEdit();
      } else {
        // Manejar error
        const errorData = await res.json().catch(() => ({}));
        
        if (errorData.code === 'DUPLICATE_HEALTH_INSURANCE' && errorData.conflictingEntity) {
          setEditError({
            message: errorData.message,
            conflictingEntity: errorData.conflictingEntity
          });
        } else {
          // Para otros errores, mostrar en toast
          const toastData = await HandleHealthInsuranceControllerResponse(res);
          setToast(toastData);
        }
      }
    })();
  };

  /* ---- Eliminar (confirmación simple) ---- */
  const [deleteTarget, setDeleteTarget] = useState<HealthInsurance | null>(null);
  const openDelete = (h: HealthInsurance) => setDeleteTarget(h);
  const closeDelete = () => setDeleteTarget(null);
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    (async () => {
       
        const res = await authFetch(
          `${API_BASE}/healthInsurance/delete/${deleteTarget.id}`, 
          {
            method: "DELETE",
        });

      // Recargar
        const resGet = await authFetch(`${API_BASE}/healthInsurance/getAll?includeInactive=false`);
        const data: HealthInsurance[] = await resGet.json();
        setItems(data);

        const toastData = await HandleHealthInsuranceControllerResponse(res);
        setToast(toastData);

      setDeleteTarget(null);

    })();
  };

  /* ---- ESC para cerrar ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editTarget) return closeEdit();
      if (deleteTarget) return closeDelete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editTarget, deleteTarget]);

  const hasItems = items.length > 0;



  return (
    <Page>
      <SectionHeader title="Obras sociales" />

      {/* Estado vacío */}
      {!hasItems && (
        <EmptyState
          title="No hay obras sociales"
          description="Agregá la primera obra social para comenzar."
          icon={
            <svg className="w-12 h-12 text-cyan-600" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2a5 5 0 0 1 5 5v1h1a4 4 0 0 1 0 8h-1v1a5 5 0 0 1-10 0v-1H6a4 4 0 0 1 0-8h1V7a5 5 0 0 1 5-5Z"
              />
            </svg>
          }
        />
      )}

      {/* Tabla */}
      {hasItems && (
        <>
          <Card>
            <Table headers={["ID", "Nombre", "Acciones"]}>
              {items.map((h) => (
                <tr key={h.id} className="even:bg-gray-50 hover:bg-gray-100 transition">
                  <td className="px-4 py-3">{h.id}</td>
                  <td className="px-4 py-3">{h.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <PrimaryButton variant="outline" size="sm" onClick={() => openEdit(h)}>
                        Editar
                      </PrimaryButton>
                      <PrimaryButton variant="danger" size="sm" onClick={() => openDelete(h)}>
                        Eliminar
                      </PrimaryButton>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* Formulario inline para agregar */}
      <Card className="mt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Agregar obra social</h3>
        
        <form onSubmit={handleAddSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={addForm}
            onChange={(e) => {
              setAddForm(e.target.value);
              // Limpiar error cuando el usuario empieza a escribir
              if (addError) setAddError(null);
            }}
            placeholder="Nombre de la obra social"
            className="border rounded-lg p-3 flex-1 focus:ring-2 focus:ring-cyan-500"
          />
          <PrimaryButton type="submit">Añadir</PrimaryButton>

        </form>

         {/* Mostrar error si existe */}
        {addError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 font-semibold mb-2">
              {addError.message}
            </p>
            {addError.conflictingEntity && (
              <div className="text-sm text-gray-700">
                <p><strong>ID:</strong> {addError.conflictingEntity.id}</p>
                <p><strong>Nombre:</strong> {addError.conflictingEntity.name}</p>
              </div>
            )}
          </div>        
        )}
      </Card>


      {/* Modal: Editar */}
      {editTarget && (
        <Modal title="MODIFICAR DATOS OBRA SOCIAL" onClose={closeEdit}>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <strong>ID:</strong> {editTarget.id}
              </p>
            </div>
            
            <FormField label="Nombre" htmlFor="edit-nombre">
              <input
                id="edit-nombre"
                name="name"
                type="text"
                value={editForm}
                onChange={(e) => {
                  setEditForm(e.target.value);
                  // Limpiar error cuando el usuario empieza a escribir
                  if (editError) setEditError(null);
                }}
                className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-cyan-500"
                autoFocus
              />
            </FormField>

            <ActionGrid>
              <PrimaryButton type="submit">Guardar cambios</PrimaryButton>
              <PrimaryButton variant="danger" onClick={closeEdit}>
                Cancelar cambios
              </PrimaryButton>
            </ActionGrid>
          </form>

          {/* Mostrar error si existe */}
          {editError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-semibold mb-2">
                {editError.message}
              </p>
              {editError.conflictingEntity && (
                <div className="text-sm text-gray-700">
                  <p><strong>ID:</strong> {editError.conflictingEntity.id}</p>
                  <p><strong>Nombre:</strong> {editError.conflictingEntity.name}</p>
                </div>
              )}
            </div>
          )}
            

        </Modal>
      )}

      {/* Modal: Eliminar */}
      {deleteTarget && (
        <Modal title="¿Está seguro que desea eliminar la obra social?" onClose={closeDelete}>
          <div className="space-y-4">            
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm">
                <strong>ID:</strong> {deleteTarget.id}
              </p>
              <p className="text-sm">
                <strong>Nombre:</strong> {deleteTarget.name}
              </p>
            </div>

            <ActionGrid>
              <PrimaryButton variant="danger" onClick={handleDeleteConfirm}>
                ELIMINAR OBRA SOCIAL
              </PrimaryButton>
              <PrimaryButton variant="outline" onClick={closeDelete}>
                CANCELAR
              </PrimaryButton>

            </ActionGrid>
          </div>
        </Modal>
      )}

      {/* Toast (una sola vez) */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </Page>
  );


}