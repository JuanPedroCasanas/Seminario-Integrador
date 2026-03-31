import { getORM } from '../orm/db';
import { LeaveScheduleConflictError, NotFoundError } from '../utils/errors/BaseHttpError';
import { Professional } from '../model/entities/Professional';
import { Leave } from '../model/entities/Leave';
import { Appointment } from '../model/entities/Appointment';
import { AppointmentStatus } from '../utils/enums/AppointmentStatus';

export class LeaveService {

    static async addLeave(startDate: Date, endDate: Date, idProfessional: number) {
        const em = await getORM().em.fork();

        const professional = await em.findOne(Professional, {id: idProfessional});

        if(!professional) {
            throw new NotFoundError("Profesional")
        }

        const overlappingLeave = await em.findOne(Leave, {
            professional: professional,
            isActive: true,
            startDate: { $lte: endDate },
            endDate: { $gte: startDate }
        });

        if (overlappingLeave) {
            throw new LeaveScheduleConflictError(startDate, endDate);
        }

        const leave = new Leave(startDate, endDate, professional);
        const appointments = await em.find(Appointment, {
            professional: professional,
            startTime: {
                $gte: startDate,
                $lte: endDate
            }
        });

        for (const appointment of appointments) {
            if(appointment.status === AppointmentStatus.Scheduled ||
                 appointment.status != AppointmentStatus.Available)
            appointment.status = AppointmentStatus.Canceled;
        }


        await em.persistAndFlush(leave);


        return leave;
    }

    static async cancelLeave(idLeave: number) {
        const em = await getORM().em.fork();

        const leave = await em.findOne(Leave, {id: idLeave});

        if(!leave) {
            throw new NotFoundError("Licencia");
        }

        leave.isActive = false;
        await em.flush();

        return leave;
    }


    static async getLeave(idLeave: number) {
        const em = await getORM().em.fork();

        const leave = await em.findOne(Leave, {id: idLeave});

        if(!leave) {
            throw new NotFoundError("Licencia");
        }

        return leave;
    }


    static async getLeavesByProfessional(idProfessional: number) {
        const em = await getORM().em.fork();

        const professional = await em.findOne(Professional, {id: idProfessional});

        if(!professional) {
            throw new NotFoundError("Profesional")
        }

        const leaves = await em.find(Leave, {professional: professional})

        return leaves;
    }

}