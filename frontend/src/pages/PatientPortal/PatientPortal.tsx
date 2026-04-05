import { ActionGrid, NavButton, PatientAppointmentsCard, Toast} from "@/components/ui";
import { Page, SectionHeader } from "@/components/Layout";
import { useLocation } from "react-router-dom";


export default function PatientPortal() {
  const location = useLocation();
  const toastMessage = location.state?.toastMessage;

  return (
    <Page>
      <SectionHeader
        title="Portal Paciente"
      />

      <ActionGrid>
        <NavButton to="/appointment-schedule">Reservar turno</NavButton>
      </ActionGrid>

    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Próximos turnos:</h3>
      <PatientAppointmentsCard />
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