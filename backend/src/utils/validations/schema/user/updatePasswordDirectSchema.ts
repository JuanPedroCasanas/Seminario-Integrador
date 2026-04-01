import { z } from "zod";
import { idUser, newPassword } from "../../schemaProps/bodies/userBody";

export const updatePasswordDirectSchema = z.object({
  body: z.object({
    idUser,
    newPassword
  })
});
