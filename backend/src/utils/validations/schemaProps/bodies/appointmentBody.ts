import { z } from "zod";


export const idAppointment = z
      .number({
        required_error: "Se requiere la id del consultorio",
        invalid_type_error: "La id del consultorio debe ser de tipo numerico"
      })
      .int() 
      .positive();

export const status = z
      .string({
        required_error: "Se requiere el estado del turno",
        invalid_type_error: "El estado del turno debe ser de tipo string"
      })

export const day = z
  .number({ 
    required_error: "Se requiere especificar el día.",
    invalid_type_error: "El día debe ser de tipo numérico"
  })
  .min(1, "El día debe estar entre 1 (Lunes) y 6 (Sabado)")
  .max(6, "El día debe estar entre 1 (Lunes) y 6 (Sabado)")
  .int()
  .positive();

export const hour = z
  .number({ 
    required_error: "Se requiere especificar la hora.",
    invalid_type_error: "La hora debe ser de tipo numérico"
  })
  .min(8, "La hora debe estar entre  las 08:00 y las 20:00")
  .max(20, "La hora debe estar entre  las 08:00 y las 20:00")
  .int()
  .positive();

export const validMonth = z
  .number({ 
    required_error: "Se requiere especificar el mes de validez para el turno sostenido.",
    invalid_type_error: "El mes de validez debe ser de tipo numérico"
  })
  .min(1, "El mes de validez debe estar entre 1 y 12.")
  .max(12, "El mes de validez debe estar entre 1 y 12.")
  .int()
  .positive()


export const validYear = z
  .number({ 
    required_error: "Se requiere especificar el año de validez para el turno sostenido.",
    invalid_type_error: "El año debe ser de tipo numérico"
  })
  .min(1, "Se requiere especificar el año.")
  .int()
  .positive();
