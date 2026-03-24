import { z } from "zod";


export const idSeries = z
    .string({ required_error: "Se requiere la id del turno sostenido" })
    .min(1, "Se requiere la id del turno sostenido")
    .regex(/^\d+$/, "La id del turno sostenido debe ser numérica")
;