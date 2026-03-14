import { z } from "zod";
import { day, hour, validMonth, validYear } from "../../schemaProps/bodies/appointmentBody";
import { idPatient } from "../../schemaProps/bodies/patientBody";
import { idProfessional } from "../../schemaProps/bodies/professionalBody";

export const assignAppointmentSeriesSchema = z.object({
  body: z.object({
    idProfessional,
    idPatient,
    day,
    hour,
    validMonth,
    validYear
  })
});