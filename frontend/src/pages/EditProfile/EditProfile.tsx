import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // si no usás Router, ver nota más abajo

import { Toast, ActionGrid, PrimaryButton, FormField, Card, InputPassword, Modal } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";

import {
  HandleErrorResponse,
  HandleProfessionalControllerResponse,
  HandlePatientControllerResponse,
  HandleLegalGuardianControllerResponse,
  HandleUserControllerResponse
} from '@/common/utils';

import { HealthInsurance, User, UserRole } from "@/common/types";
import { authFetch } from "@/common/utils/auth/AuthFetch";
import { API_BASE } from '@/lib/api';
import { useAuth } from "@/common/utils/auth/AuthContext";
import { useLogout } from "@/common/utils/auth/UseLogout";
import { redirectByRole } from "@/common/utils/auth/RoleRedirect";


export default function EditProfile() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.Admin;
  const logout = useLogout();
  const location = useLocation();

  // ----- Usuario seleccionado -----
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // ----- Estado: credenciales -----
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ----- Estado: modal de confirmación -----
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ----- Estado: perfil -----
  const [firstName, setFirstName] = useState<string | undefined>("");
  const [lastName, setLastName] = useState<string | undefined>("");
  const [birthdate, setBirthdate] = useState<string | undefined>("");
  const [telephone, setTelephone] = useState<string | undefined>("");

  //Especialidad
  const [occupationName, setOccupationName] = useState("");
  //OS
  const [healthInsurances, setHealthInsurances] = useState<HealthInsurance[]>([]);
  const [selectedHealthInsuranceId, setSelectedHealthInsuranceId] = useState<number | undefined>(undefined);

  //Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  //Usuarios
  const[users, setUsers] = useState<User[]>([]);

  //Popular OSs
  useEffect(() => {
    (async () => {
  
        const res = await authFetch(`${API_BASE}/healthInsurance/getAll?includeInactive=false`);
  
        if (!res.ok){
          const toastData = await HandleErrorResponse(res);
          setToast(toastData);
        } else {
          const data: HealthInsurance[] = await res.json();
          setHealthInsurances(data);
  
        }
  
    })();
  }, []);

  //Popular Usuarios: sólo para admin
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
        const res = await authFetch(`${API_BASE}/user/getAll?includeInactive=false`);
  
        if (!res.ok){
          const toastData = await HandleErrorResponse(res);
          setToast(toastData);
        } else {
          const data: User[] = await res.json();
          setUsers(data);
        }
    })();
  }, []);

  // Pre-seleccionar usuario si viene desde otra página (ej: desde Professionals)
  useEffect(() => {
    const state = location.state as { selectedUserId?: number } | null;
    if (state?.selectedUserId && users.length > 0) {
      const userToSelect = users.find(u => u.id === state.selectedUserId);
      if (userToSelect) {
        setSelectedUser(userToSelect);
      }
    }
  }, [users, location.state]);


  //Autocompletar campos a partir del selected user
  useEffect(() => {
    if (!selectedUser) {
      setFirstName("");
      setLastName("");
      setTelephone("");
      setSelectedHealthInsuranceId(undefined);
      return;
    }

    // Prioridad: patient > legalGuardian > professional
    if (selectedUser.patient) {
      setFirstName(selectedUser.patient.firstName);
      setLastName(selectedUser.patient.lastName);
      setTelephone(selectedUser.patient.telephone);
      setBirthdate(selectedUser.patient.birthdate?.split("T")[0] || "");
      setSelectedHealthInsuranceId(selectedUser.patient.healthInsurance);
    } else if (selectedUser.legalGuardian) {
      setFirstName(selectedUser.legalGuardian.firstName);
      setLastName(selectedUser.legalGuardian.lastName);
      setTelephone(selectedUser.legalGuardian.telephone);
      setBirthdate(selectedUser.legalGuardian.birthdate?.split("T")[0] || "");
      setSelectedHealthInsuranceId(selectedUser.legalGuardian.healthInsurance);
    } else if (selectedUser.professional) {
      setFirstName(selectedUser.professional.firstName);
      setLastName(selectedUser.professional.lastName);
      setTelephone(selectedUser.professional.telephone || "");
      setOccupationName(selectedUser.professional.occupation?.name || "");
      // Para profesionales no aplicaría healthInsurance
      setSelectedHealthInsuranceId(undefined);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (!isAdmin && user){
      setSelectedUser(user as User);
    }

  }, [isAdmin, user]);


  // ----- Envíos -----
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedUser) return;
    // Abrir modal de confirmación en lugar de enviar directamente
    setShowConfirmModal(true);
  };

  const handleConfirmModification = async () => {
    if(!selectedUser) return;
    //Payload general para todas las clases
    let payload = {
          firstName: (firstName ?? "").trim(),
          lastName: (lastName ?? "").trim(),
          telephone: (telephone ?? "").trim(),
          idHealthInsurance: undefined as number | undefined,
          birthdate: "",
          idProfessional: undefined as number | undefined,
          idPatient: undefined as number | undefined,
          idLegalGuardian: undefined as number | undefined,
        };

    //Payloads y rutas especificas

    let route: string = "";

    if(selectedUser.patient) {
      payload.birthdate = (birthdate ?? "").trim();
      payload.idPatient = selectedUser.patient.id;
      payload.idHealthInsurance = selectedHealthInsuranceId;
      route = "/patient/updateIndPatient";
    }

    if(selectedUser.legalGuardian) {
      payload.birthdate = (birthdate ?? "").trim();
      payload.idLegalGuardian = selectedUser.legalGuardian.id;
      payload.idHealthInsurance = selectedHealthInsuranceId;
      route = "/legalGuardian/update";
    }

    if(selectedUser.professional) {
      payload.idProfessional = selectedUser.professional.id;
      route = "/professional/update";
    }

    if(!route) {
      return
    }
    const res = await authFetch(`${API_BASE}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let toastData;

    if(selectedUser.patient) {
      toastData = await HandlePatientControllerResponse(res);
    }

    if(selectedUser.legalGuardian) {
      toastData = await HandleLegalGuardianControllerResponse(res);
    }

    if(selectedUser.professional) {
      toastData = await HandleProfessionalControllerResponse(res);
    }
    if(toastData) {
      setToast(toastData);
    }

    // Actualizar contraseña si se ingresó una
    if (password.trim()) {
      const passwordPayload = {
        idUser: selectedUser.id,
        newPassword: password.trim(),
      };
      
      const passwordRes = await authFetch(`${API_BASE}/user/updatePasswordDirect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordPayload),
      });

      const passwordToast = await HandleUserControllerResponse(passwordRes);
      if (passwordToast) {
        setToast(passwordToast);
      }
    }

    setShowConfirmModal(false);

    // Redirigir al portal correspondiente
    if (res.ok) {
      const redirectPath = redirectByRole(selectedUser.role);
      setTimeout(() => {
        navigate(redirectPath);
      }, 1500);
    }
  };

  // ----- Cancelar edición -----
  const navigate = useNavigate();
  const handleCancel = () => {
    const redirectPath = redirectByRole(selectedUser?.role || "");
    navigate(redirectPath);
  };

  // Cerrar modal con ESC
  useEffect(() => {
    if (!showConfirmModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowConfirmModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showConfirmModal]);

  return (

    <Page>
        <main className="grid min-h-screen">
          <section className="max-w-3xl mx-auto p-4 sm:p-6">
            <SectionHeader title={isAdmin ? "Modificar datos profesional" : selectedUser ? `Datos ${selectedUser.role === "patient" ? "Paciente" : selectedUser.role === "professional" ? "Profesional" : selectedUser.role === "legalGuardian" ? "Responsable Legal" : ""}` : "Editar mi perfil"} />
          </section>


            {selectedUser && (
            <section className="space-y-6">
                {/* === Formulario de perfil unificado === */}
                <form className="space-y-4" onSubmit={handleSubmitProfile} noValidate>
                <Card>
                    <fieldset className="space-y-4">
                    
                    <FormField label="Tipo de usuario" htmlFor="userType">
                        <input
                            id="userType"
                            type="text"
                            value={selectedUser.role === "patient" ? "Paciente" : selectedUser.role === "professional" ? "Profesional" : selectedUser.role === "legalGuardian" ? "Responsable Legal" : selectedUser.role}
                            readOnly
                            className="border rounded-lg p-3 w-full bg-gray-100"
                        />
                    </FormField>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="Nombre" htmlFor="nombre">
                            <input
                                id="nombre"
                                type="text"
                                placeholder="Nombre"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="border rounded-lg p-3 w-full"
                            />
                        </FormField>
                        <FormField label="Apellido" htmlFor="apellido">
                        <input
                            id="apellido"
                            type="text"
                            placeholder="Apellido"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="border rounded-lg p-3 w-full"
                        />
                        </FormField>
                    </div>

                    <FormField label="Email" htmlFor="email">
                        <input
                            id="email"
                            type="email"
                            value={selectedUser.mail}
                            readOnly
                            className="border rounded-lg p-3 w-full bg-gray-100"
                        />
                    </FormField>

                    <FormField label="Teléfono" htmlFor="telefono">
                        <input
                        id="telefono"
                        type="tel"
                        placeholder="+54 9 11 1234-5678"
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                        className="border rounded-lg p-3 w-full"
                        />
                    </FormField>

                    {(selectedUser.legalGuardian || selectedUser.patient) && (
                        <>
                        <FormField label="Fecha de nacimiento" htmlFor="add-fecha">
                            <input
                            id="add-fecha"
                            type="date"
                            value={birthdate ?? ""}
                            readOnly
                            className="border rounded-lg p-3 w-full bg-gray-100"
                            />
                        </FormField>

                        <FormField label="Obra Social" htmlFor="healthInsurance">
                            <select
                            id="healthInsurance"
                            value={selectedHealthInsuranceId ?? ""}
                            onChange={(e) => setSelectedHealthInsuranceId(Number(e.target.value))}
                            className="border rounded-lg p-3 w-full"
                            >
                            <option value="">Seleccionar…</option>
                            {healthInsurances.map((h) => (
                                <option key={h.id} value={h.id}>
                                {h.name}
                                </option>
                            ))}
                            </select>
                        </FormField>
                        </>
                    )}

                    {selectedUser.professional && (
                        <FormField label="Especialidad" htmlFor="occupation">
                        <select id="occupation" disabled value={occupationName} className="border rounded-lg p-3 w-full bg-gray-100">
                            <option>{occupationName || "Sin especialidad"}</option>
                        </select>
                        </FormField>
                    )}

                    <FormField label="Contraseña" htmlFor="password">
                        <InputPassword
                            id="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            showPwd={showPassword}
                            toggleShowPwd={() => setShowPassword(!showPassword)}
                        />
                    </FormField>

                    <div className="flex justify-center">
                        
                    
                    <ActionGrid>
                        <PrimaryButton type="submit">
                            {selectedUser.role === "professional" ? "Guardar Cambios" : "Modificar Perfil"}
                        </PrimaryButton>
                        <PrimaryButton type="button" onClick={handleCancel} variant="danger">Cancelar Cambios</PrimaryButton>
                    </ActionGrid>

                    </div>

                    </fieldset>
                </Card>
                </form>

            </section>
            )}

            {/* === Modal cambiar contraseña === */}
            
            {showConfirmModal && selectedUser && (
            <Modal title="¿Está seguro que desea modificar los datos de su perfil?" onClose={() => setShowConfirmModal(false)}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-700 italic">
                        Modificar los datos hará que los datos anteriores sean reemplazados por los nuevos
                    </p>

                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <p className="text-sm"><strong>Tipo de usuario:</strong> {selectedUser.role === "patient" ? "Paciente" : selectedUser.role === "professional" ? "Profesional" : selectedUser.role === "legalGuardian" ? "Responsable Legal" : selectedUser.role}</p>
                        <p className="text-sm"><strong>Nombre:</strong> {firstName}</p>
                        <p className="text-sm"><strong>Apellido:</strong> {lastName}</p>
                        <p className="text-sm"><strong>Email:</strong> {selectedUser.mail}</p>
                        <p className="text-sm"><strong>Teléfono:</strong> {telephone}</p>
                        
                        {(selectedUser.legalGuardian || selectedUser.patient) && (
                            <>
                            <p className="text-sm"><strong>Fecha de nacimiento:</strong> {birthdate}</p>
                            <p className="text-sm"><strong>Obra Social:</strong> {healthInsurances.find(h => h.id === selectedHealthInsuranceId)?.name || "No seleccionada"}</p>
                            </>
                        )}
                        
                        {selectedUser.professional && (
                            <p className="text-sm"><strong>Especialidad:</strong> {occupationName}</p>
                        )}
                        
                        <p className="text-sm"><strong>Contraseña:</strong> {password ? "***************" : "Sin cambios"}</p>
                    </div>

                    <ActionGrid>
                        <PrimaryButton onClick={handleConfirmModification}>
                            Confirmar modificación
                        </PrimaryButton>
                        <PrimaryButton onClick={() => setShowConfirmModal(false)} variant="outline">
                            Cancelar
                        </PrimaryButton>
                    </ActionGrid>
                </div>
            </Modal>
            )}

        </main>

        {/* ===== TOAST ===== 
        {toast && (
        <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
        />
        )}*/}

    </Page>

  );
}