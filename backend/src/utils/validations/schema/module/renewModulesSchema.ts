import { z } from "zod";
import { moduleIds } from "../../schemaProps/bodies/moduleBody";

export const renewModulesSchema = z.object({
  body: z.object({
    moduleIds
  })
});