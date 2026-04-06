import { ActionGrid, NavButton, Toast } from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";
import { useLocation } from "react-router-dom";

export default function ProfessionalPortal() {
  const location = useLocation();
  const toastMessage = location.state?.toastMessage;

  return (
    <Page>
      <SectionHeader
        title="Portal Profesional"
        subtitle="Selecciona la acción a realizar"
      />

      <ActionGrid>
        <NavButton to="/professional-modules">Ver mis módulos</NavButton>
        <NavButton to="/module-rent">Alquilar nuevo(s) módulo(s)</NavButton>
        <NavButton to="/professional-leaves">Ver mis licencias</NavButton>
        <NavButton to="/professional-health-insurances">Obras Sociales</NavButton>
      </ActionGrid>

      <div className="mt-6 max-w-md mx-auto">
        <NavButton to="/module-renew" fullWidth>Renovar mis alquileres</NavButton>
        <p className="text-xs text-red-600 text-center mt-2 italic">
          * Esta opción está disponible los últimos 5 días hábiles de cada mes
        </p>
      </div>

{/* Toast 
    {toastMessage && (
      <Toast
        message={toastMessage.message}
        type={toastMessage.type}
        onClose={() => {}}
      />
    )}*/}

    </Page>
  );
}