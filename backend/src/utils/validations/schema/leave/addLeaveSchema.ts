import { z } from "zod";
import { idProfessional } from "../../schemaProps/bodies/professionalBody";
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
  .transform((val) => new Date(val));
export const addLeaveSchema = z.object({
  body: z.object({
    idProfessional,
    startDate: dateSchema,
    endDate: dateSchema
  }).refine(
    (data) => data.endDate >= data.startDate,
    {
      message: "La fecha de fin no puede ser menor a fecha de inicio de la licencia",
      path: ["endDate"]
    }
  )
});