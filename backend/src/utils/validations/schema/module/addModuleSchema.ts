import { z } from "zod";
import { day, endTime, isPaid, startTime, validMonth, validYear } from "../../schemaProps/bodies/moduleBody";
import { idConsultingRoom } from "../../schemaProps/bodies/consultingRoomBody";
import { idProfessional } from "../../schemaProps/bodies/professionalBody";
export const addModuleSchema = z.object({
  body: z.object({
    day,
    startTime,
    endTime,
    validMonth,
    validYear,
    idProfessional,
    idConsultingRoom,
    isPaid
  })
});