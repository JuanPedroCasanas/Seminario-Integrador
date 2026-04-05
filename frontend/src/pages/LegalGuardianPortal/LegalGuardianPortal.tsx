import { ActionGrid, LegalGuardianAppointmentsCard, NavButton, Toast} from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";
import { useLocation } from "react-router-dom";


export default function LegalGuardianPortal() {
  const location = useLocation();
  const toastMessage = location.state?.toastMessage;

  return (
    <Page>
      <SectionHeader
        title="Portal Responsable Legal"
      />

      <ActionGrid>
        <NavButton to="/appointment-schedule">Reservar turno</NavButton>
        <NavButton to="/guarded-patients">Paciente(s) a cargo</NavButton>
      </ActionGrid>

    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Próximos turnos:</h3>
      <LegalGuardianAppointmentsCard />
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