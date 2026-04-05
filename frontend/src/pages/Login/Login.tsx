import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Toast, FormField,  InputPassword, PrimaryButton } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";
import { setAccessToken } from "@/common/utils/auth/TokenStorage";
import { HandleErrorResponse } from "@/common/utils";
import { useAuth } from "@/common/utils/auth/AuthContext";


import { API_BASE } from '@/lib/api';
import { redirectByRole } from "@/common/utils/auth/RoleRedirect";

export default function Login() {
  const [datos, setDatos] = useState({
    mail: "",
    password: "",
    isActive: true,
  });
  const navigate = useNavigate(); 
  const [showPwd, setShowPwd] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const { setUser } = useAuth();

useEffect(() => {
    const toastData = (navigate as any).location?.state?.toastMessage;

    if (toastData) {
        setToast(toastData);
    }
}, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
   let { name, value } = e.target;
   let newDatos = { ...datos, [name]: value };
  setDatos(newDatos);
  }
 
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!datos.mail || !datos.password) {
        const toastData = { 
            message: "Por favor, ingrese su correo electrónico y contraseña.", 
            type: "error" as const 
        };
        setToast(toastData); 
        return}; 
    try {

    const res = await fetch(`${API_BASE}/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });

    if (!res.ok) {
      const toastData = await HandleErrorResponse(res); //Use este, crear un handleResponse de user
      setToast(toastData);
      return;
    }

    const data = await res.json();
    setAccessToken(data.accessToken);
    setUser(data.user);

    //Revisar esto en caso rol administrador
    
    const fullName = data.user[data.user.role]?.firstName + ' ' + data.user[data.user.role]?.lastName;
    
    const toastData = { 
        message: `¡Bienvenido ${fullName}!`,
        type: "success" as const
    };
   
    const redirectTo = redirectByRole(data.user.role);
    navigate(redirectTo, { replace: true, state: { toastMessage: toastData} });

   // navigate("/", { state: { toastMessage: toastData } });

    
    } catch (error) {
    alert("Error de conexión con el servidor");
    console.error(error);
    };
  }

return (


<Page>
    <main className="min-h-[calc(100vh-var(--nav-h))] flex justify-center items-start p-4 pt-10">

    <form
        className="mt-8 w-full max-w-[420px] bg-white text-[#111] rounded-xl p-6 grid gap-6"
      noValidate
      onSubmit={handleSubmit}
    >
      {/* Encabezado */}
      <div className="text-center">
         <SectionHeader title="Bienvenido" />
      </div>

      {/* Email */}
      <FormField label="Ingrese el email del usuario" htmlFor="mail">
        <div className="flex items-center gap-2 w-full border border-[#b5b6b7] rounded-[10px] bg-white px-4 py-[14px]">
          <input
            id="mail"
            name="mail"
            type="email"
            className="flex-1 w-full border-0 outline-0 bg-transparent text-[16px] leading-[22px] text-black placeholder:text-[#7d7d7d]"
            placeholder="psico@narrativas.com.ar"
            value={datos.mail}
            onChange={handleInputChange}
            autoComplete="email"
            required
          />
        </div>
      </FormField>

      {/* Password */}
      <FormField label="Ingrese la contraseña" htmlFor="password">
        <InputPassword
          id="password"
          name="password"
          value={datos.password}
          onChange={handleInputChange}
          showPwd={showPwd}
          toggleShowPwd={() => setShowPwd(v => !v)}
        />
      </FormField>

      {/* CTA + fila inferior */}
      <div className="grid gap-4">
        <div className="flex gap-3">
          <PrimaryButton 
            type="submit"
            fullWidth
            size="md"
          >
            Iniciar sesión
          </PrimaryButton>
          
          <PrimaryButton 
            type="button"
            variant="outline"
            fullWidth
            size="md"
            onClick={() => navigate("/register")}
          >
            Registrarse
          </PrimaryButton>
        </div>
      </div>

    </form>
    
    {/* 
  {toast && (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={() => setToast(null)}
    />
  )}*/}

  </main>
</Page>

  );
}