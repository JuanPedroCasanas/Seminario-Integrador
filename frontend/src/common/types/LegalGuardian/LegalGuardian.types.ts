import { User } from "../User/User.types";

export type LegalGuardian = {
  id?: number;
  firstName?: string;
  lastName?: string;
  birthdate?: string;
  telephone?: string;
  user?: number | User;
  healthInsurance?: number;
  isActive?: boolean;
}

