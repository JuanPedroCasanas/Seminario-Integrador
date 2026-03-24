import { z } from "zod";
import { idSeries } from "../../schemaProps/params/idSeriesParam";

export const renewAppointmentSeriesSchema = z.object({
  params: z.object({
    idSeries
  })
});