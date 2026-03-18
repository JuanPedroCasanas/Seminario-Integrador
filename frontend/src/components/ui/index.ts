// cada vez que se agrega un componente a esta carpeta /ui, agregarlo acá
// asi se simplifica el uso de imports en las páginas


// Actions
export { default as ActionGrid } from "./Actions/ActionGrid/ActionGrid";
export { default as NavButton } from "./Actions/NavButton/NavButton";
export { default as PrimaryButton } from "./Actions/PrimaryButton/PrimaryButton";
export { default as DialogActions } from "./Actions/DialogActions/DialogActions";
export { default as LogoutButton } from "./Actions/LogoutButton/LogoutButton";

// Data Display
export { Card } from "./DataDisplay/Card/Card";
export { default as SummaryList } from "./DataDisplay/SummaryList/SummaryList";
export { default as Table } from "./DataDisplay/Table/Table";
export { FilterBar } from "./DataDisplay/FilterBar/FilterBar";
// PatientAppointmentCard
export { default as PatientAppointmentsCard } from "./DataDisplay/PatientAppointmentsCard/PatientAppointmentsCard";
export { default as LegalGuardianAppointmentsCard } from "./DataDisplay/LegalGuardianAppointmentsCard/LegalGuardianAppointmentsCard";
export { default as ProfessionalLeavesCard } from "./DataDisplay/ProfessionalLeavesCard/ProfessionalLeavesCard";

// Feedback
export { default as EmptyState } from "./Feedback/EmptyState/EmptyState";
export { Modal } from "./Feedback/Modal/Modal";
export { Toast } from "./Feedback/Toast/toast";

// Schedule
export { CalendarGrid } from './Schedule/CalendarGrid/CalendarGrid';
export { ConfirmBookingModal } from './Schedule/ConfirmBookingModal/ConfirmBookingModal';
export { ConfirmSeriesModal } from './Schedule/ConfirmSeriesModal/ConfirmSeriesModal';
export { ConfirmLeaveModal } from './Schedule/ConfirmLeaveModal/ConfirmLeaveModal';
export { DateRangeCalendar } from './Schedule/DateRangeCalendar/DateRangeCalendar';
export { SlotsCarousel } from './Schedule/SlotsCarousel/SlotsCarousel';
export { StickyCTA } from './Schedule/StickyCTA/StickyCTA';
export { TimeSlotGrid } from './Schedule/TimeSlotGrid/TimeSlotGrid';
export { WeekdaySelector } from './Schedule/WeekdaySelector/WeekdaySelector';

// Forms
export { FormField } from "./Forms/FormField/FormField";
export { InputPassword } from "./Forms/InputPassword/InputPassword";

// ModuleRent
export { RentLegend } from './ModuleRent/RentLegend/RentLegend';
export { StickyRentBar } from './ModuleRent/StickyRentBar/StickyRentBar';
export { WeekGrid } from './ModuleRent/WeekGrid/WeekGrid';
export { rentBackgrounds, rentColors } from './ModuleRent/RentPalette/RentPalette';

// Misc
export { default as SocialLink } from "./SocialLink/SocialLink";


