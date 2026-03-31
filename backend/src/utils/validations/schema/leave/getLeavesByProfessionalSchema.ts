import { z } from "zod";
import { idProfessional } from "../../schemaProps/params/idProfessionalParam";

export const getLeavesByProfessionalSchema = z.object({
  params: z.object({
    idProfessional
  })
});