import { z } from "zod";
import { idLeave } from "../../schemaProps/params/idLeaveParam";

export const getCancelLeaveSchema = z.object({
  params: z.object({
    idLeave
  })
});