import express from 'express';
import { LeaveController } from '../controller/LeaveController';
import { UserRole } from '../utils/enums/UserRole';
import { authJwt } from '../utils/auth/jwt';
import { authRoles } from '../utils/auth/roles';
import { validate } from '../utils/validations/validate';
import { addLeaveSchema } from '../utils/validations/schema/leave/addLeaveSchema';
import { getCancelLeaveSchema } from '../utils/validations/schema/leave/getCancelLeaveSchema';
import { getLeavesByProfessionalSchema } from '../utils/validations/schema/leave/getLeavesByProfessionalSchema';


const router = express.Router();

router.post(
  '/add',
  validate(addLeaveSchema),
  authJwt,
  authRoles([UserRole.Professional, UserRole.Admin]),
  LeaveController.addLeave
);

router.post(
  '/cancel/:idLeave',
  validate(getCancelLeaveSchema),
  authJwt,
  authRoles([UserRole.Professional, UserRole.Admin]),
  LeaveController.cancelLeave
);


router.get(
  '/get/:idLeave',
  validate(getCancelLeaveSchema),
  authJwt,
  authRoles([UserRole.Professional, UserRole.Admin]),
  LeaveController.getLeave
);

router.get(
  '/getByProfessional/:idProfessional',
  validate(getLeavesByProfessionalSchema),
  authJwt,
  authRoles([UserRole.Professional, UserRole.Admin]),
  LeaveController.getLeavesByProfessional
);





export default router;
