import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Toast, FormField,  InputPassword, PrimaryButton, NavButton, ActionGrid } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";

import {
  HandleProfessionalControllerResponse,
  HandlePatientControllerResponse,
  HandleLegalGuardianControllerResponse,
  HandleOccupationControllerResponse,
  HandleHealthInsuranceControllerResponse,
} from '@/common/utils';
import { HealthInsurance, Occupation } from "@/common/types";
import { API_BASE } from '@/lib/api';

type Role = "Paciente" | "Profesional" | "Responsable Legal" | "";

export default function Register() {

  const navigate = useNavigate();

const [form, setForm] = useState<{
  mail: string;
  password: string;
  firstName: string;
  lastName: string;
  fechaNacimiento: string;
  telefono: string;
  role: Role;
}>({
  mail: "",
  password: "",
  firstName: "",
  lastName: "",
  fechaNacimiento: "",
  telefono: "",
  role: "Paciente",
});

  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [healthInsurances, setHealthInsurances] = useState<HealthInsurance[]>([]);;
  const [selectedOccupationId, setSelectedOccupationId]  = useState<number | undefined>(undefined);
  const [selectedHealthInsuranceId, setSelectedHealthInsuranceId]  = useState<number | undefined>(undefined);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const fetchOccupations = async () => {
      const res = await fetch(`${API_BASE}/occupation/getAll`);
      if (!res.ok){
        const toastData = await HandleOccupationControllerResponse(res);
        setToast(toastData);
      } else {
        const data: Occupation[] = await res.json();
        setOccupations(data);
        if (selectedOccupationId === undefined) {
          setSelectedOccupationId(data[0]?.id ?? undefined);
        }
      }
    }

    const fetchHealthInsurances = async () => {
      const res = await fetch(`${API_BASE}/healthInsurance/getAll?includeInactive=false`);
      if (!res.ok){
        const toastData = await HandleHealthInsuranceControllerResponse(res);
        setToast(toastData);
      } else {
        const data: HealthInsurance[] = await res.json();
        setHealthInsurances(data);
        if (selectedHealthInsuranceId === undefined) {
          setSelectedHealthInsuranceId(data[0]?.id ?? undefined);
        }
      }
    }

    if(form.role == "Profesional") {
      fetchOccupations();
    }
    if(form.role == "Paciente" || form.role == "Responsable Legal") {
      fetchHealthInsurances();
    }
  }, [form.role]);


  //Seleccion inicial de IDs cuando carga la pagina, lo hice asi para que aguante hasta que se pueblen los select
  useEffect(() => {
    if (form.role === "Profesional" && occupations.length > 0 && selectedOccupationId === null) {
      setSelectedOccupationId(occupations[0].id);
    }
  }, [occupations]);

  useEffect(() => {
    if ((form.role === "Paciente" || form.role === "Responsable Legal") &&
          healthInsurances.length > 0 && selectedHealthInsuranceId === null) {
      setSelectedHealthInsuranceId(healthInsurances[0].id);
    }
  }, [healthInsurances]);

  

  
  
  const [showPwd, setShowPwd] = useState(false);
  const [message, setMessage] = useState('');      // Para mensajes de éxito o error
  const [isError, setIsError] = useState(false);    // Para marcar si el mensaje es un error

  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    // 1. MAPEO DE DATOS BASE (DEL USUARIO PRINCIPAL)
    let dataToSend: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        birthdate: form.fechaNacimiento,
        mail: form.mail,
        password: form.password,
        telephone: form.telefono,
        role: form.role,
        idHealthInsurance: Number(selectedHealthInsuranceId)
    };

    if (!form.role) {
        alert("Por favor elegí un rol.");
        return;
    }
    
    let endpoint = '';
    let dependentEndpoint = ''; 
    let dependentPayload: any = null; // Inicializado a null para el rol 'Responsable Legal'
    
    // --- 3. LÓGICA DE PREPARACIÓN DE ENDPOINTS Y PAYLOADS (SIN ASYNC/AWAIT) ---
    
    if (form.role=== 'Paciente') {
        if (!selectedHealthInsuranceId) {
            setMessage("Por favor elegí una obra social.");
            setIsError(true);
            return;
        }
        endpoint = `${API_BASE}/patient/addIndPatient`;
        dataToSend = {...dataToSend, idHealthInsurance: selectedHealthInsuranceId }; 
    }

    else if (form.role === 'Profesional') {
        if (!selectedOccupationId) {
            setMessage("Por favor elegí una occupation.");
            setIsError(true);
            return;
        }
        endpoint = `${API_BASE}/professional/add`; 
        dataToSend = {...dataToSend, idOccupation: selectedOccupationId };
    }
    
    else if (form.role=== 'Responsable Legal') { 
        // Validación de Obra Social del Responsable Legal (se adjunta a dataToSend)
        if (!selectedHealthInsuranceId) {
            setMessage("Por favor elegí una obra social.");
            setIsError(true);
            return;
        }
        
        // Adjuntar Obra Social al payload del Responsable Legal
        dataToSend = {...dataToSend, idHealthInsurance: selectedHealthInsuranceId }; 

        // Definir los dos endpoints
        endpoint = `${API_BASE}/legalGuardian/add`; // 1ra petición

    } else {
        setMessage("Rol no válido.");
        setIsError(true);
        return;
    }
    
    try {
      const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
      });

      let toastData;

      if(form.role === "Profesional") {
        toastData = await HandleProfessionalControllerResponse(response)
      } else if(form.role === "Paciente") {
        toastData = await HandlePatientControllerResponse(response)
      } else if(form.role === "Responsable Legal") {
        toastData = await HandleLegalGuardianControllerResponse(response)
      }
      if(toastData) {
        setToast(toastData);
      }

      if(response.ok) {
        // Redirigir a login después de un registro exitoso
        setTimeout(() => {
          navigate('/', { state: { toastMessage: toastData } });
        }, 1500); // Dar tiempo para ver el toast
      }
    } catch (error) {
        // Error de red
        setMessage('🚨 Error de conexión: El servidor no está disponible.');
        setIsError(true);
    }
}
 
  return (
 
    <Page>
        <div className="w-full max-w-xl mx-auto bg-white rounded-xl shadow p-8 grid gap-8">

            {/* Encabezado */}
            <div className="text-center">
                <SectionHeader
                    title="Registro Usuario"
                />
            </div>

            {/* Formulario */}
            <form className="grid gap-4" onSubmit={onSubmit} noValidate>
            
            {/* Rol */}
            <FormField label="Tipo de usuario" htmlFor="role">
                <select
                id="role"
                name="role"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black"
                value={form.role}
                onChange={handleChange}
                required
                >
<<<<<<< HEAD
                  <option value="Paciente">Paciente (mayor de 18 años)</option>
                  <option value="Responsable Legal">Responsable Legal (hijos a cargo)</option>
=======
                <option value="Paciente">Paciente (mayor de 18 años)</option>
                <option value="Responsable Legal">Responsable Legal (hijos a cargo)</option>
>>>>>>> d294cf14ba4f968a83efe259d9b1d69c295fcb5a
                </select>
            </FormField>
            
            <FormField label="Nombre" htmlFor="firstName">
                <input
                id="firstName"
                name="firstName"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500"
                value={form.firstName}
                onChange={handleChange}
                autoComplete="given-name"
                required
                />
            </FormField>

            <FormField label="Apellido" htmlFor="lastName">
                <input
                id="lastName"
                name="lastName"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500"
                value={form.lastName}
                onChange={handleChange}
                autoComplete="family-name"
                required
                />
            </FormField>

            <FormField label="Mail" htmlFor="mail">
                <input
                id="mail"
                name="mail"
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500"
  
                value={form.mail}
                onChange={handleChange}
                autoComplete="email"
                required
                />
            </FormField>

            {/* Teléfono */}
            <FormField label="Teléfono" htmlFor="telefono">
                <input
                id="telefono"
                name="telefono"
                type="tel"
                inputMode="tel"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500"
                value={form.telefono}
                onChange={handleChange}
                autoComplete="tel"
                required
                />
            </FormField>

            {/* Fecha de nacimiento */}
            <FormField label="Fecha nacimiento" htmlFor="fechaNacimiento">
                <input
                id="fechaNacimiento"
                name="fechaNacimiento"
                type="date"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black"
                value={form.fechaNacimiento}
                onChange={handleChange}
                max={todayISO}
                required
                />
            </FormField>

            {/* Obra social si rol = Paciente o Responsable Legal */}
                <FormField label="Obra Social" htmlFor="idHealthInsurance">
                <select
                    id="idHealthInsurance"
                    name="idHealthInsurance"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black"
                    value={selectedHealthInsuranceId ?? 1}
                    onChange={e => setSelectedHealthInsuranceId(Number(e.target.value))}
                    required
                >
                    {healthInsurances.map(g => (
                    <option key={g.id} value={g.id}>
                        {g.name}
                    </option>
                    ))}
                </select>
                </FormField>


            {/* Contraseña */}
            <FormField label="Contraseña" htmlFor="password">
                <InputPassword
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                showPwd={showPwd}
                toggleShowPwd={() => setShowPwd(v => !v)}
                />
            </FormField>

            {/* CTA */}
            <ActionGrid>
                <PrimaryButton type="submit">
                Registrar usuario
                </PrimaryButton>
            </ActionGrid>
            </form>
        </div>

        {/* ===== TOAST ===== 
        {toast && (
            <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
            />
        )}
*/}

    </Page>

  );
} 

