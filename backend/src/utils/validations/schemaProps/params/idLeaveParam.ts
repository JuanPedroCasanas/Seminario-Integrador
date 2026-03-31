import { z } from "zod";


export const idLeave = z
    .string({ required_error: "Se requiere la id de la licencia" })
    .min(1, "Se requiere la id de la licencia")
    .regex(/^\d+$/, "La id de la licencia debe ser numérica")
;