import { getORM } from '../orm/db';
import { Appointment } from '../model/entities/Appointment';
import { Patient } from '../model/entities/Patient';
import { Professional } from '../model/entities/Professional';
import { AppointmentStatus } from '../utils/enums/AppointmentStatus';
import {
    AppointmentNotAvailableError,
    AppointmentSeriesNotAvailableError,
    InvalidParameterError,
    InvalidStatusChangeError,
    NotFoundError
} from '../utils/errors/BaseHttpError';
import { toDetailedAppointmentDTO } from '../utils/dto/appointment/detailedAppointmentDto';
import { LegalGuardian } from '../model/entities/LegalGuardian';
import { DayOfWeek } from '../utils/enums/DayOfWeek';
import { AppointmentSeries } from '../model/entities/AppointmentSeries';

export class AppointmentService {

    static async assignAppointment(idAppointment: number, idPatient: number) {
        const em = await getORM().em.fork();

        const appointment = await em.findOne(Appointment, { id: idAppointment });
        if(!appointment) {
            throw new NotFoundError('Turno');
        } 

        if(appointment.status != AppointmentStatus.Available) {
            throw new AppointmentNotAvailableError();
        }

        const patient = await em.findOne(Patient, { id: idPatient })
        if(!patient) {
            throw new NotFoundError('Paciente');
        }

        const legalGuardian = patient.legalGuardian;

        appointment.legalGuardian = legalGuardian;
        appointment.patient = patient;
        appointment.healthInsurance = patient.healthInsurance;
        appointment.status = AppointmentStatus.Scheduled;

        await em.flush();
        return appointment;
    }

    static async assignAppointmentSeries(
        idProfessional: number,
        idPatient: number,
        day: DayOfWeek,
        hour: number,
        validMonth: number,
        validYear: number
    ) {
        const em = await getORM().em.fork();

        const professional = await em.findOne(Professional, { id: idProfessional });

        if (!professional || !professional.isActive) {
            throw new NotFoundError('Profesional');
        }

        const patient = await em.findOne(Patient, { id: idPatient });

        if (!patient) {
            throw new NotFoundError('Paciente');
        }

        const legalGuardian = patient.legalGuardian;

        const now = new Date();

        const monthStart = new Date(validYear, validMonth - 1, 1);
        const monthEnd = new Date(validYear, validMonth, 0, 23, 59, 59);

        const searchStart =
            now.getMonth() + 1 === validMonth && now.getFullYear() === validYear
                ? now
                : monthStart;

        const appointments = await em.find(
            Appointment,
            {
                professional: professional,
                startTime: { $gte: searchStart, $lte: monthEnd }
            }
        );

        const matchingAppointments = appointments
            .filter(a =>
                a.startTime.getDay() === day &&
                a.startTime.getHours() === hour
            )
            .filter(a => a.startTime > now)
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        if (matchingAppointments.length === 0) {
            throw new AppointmentSeriesNotAvailableError();
        }

        //Si alguno está ocupado → NO serie
        for (const appointment of matchingAppointments) {
            if (appointment.status !== AppointmentStatus.Available) {
                throw new AppointmentSeriesNotAvailableError();
            }
        }

        const series = new AppointmentSeries();
        series.validMonth = validMonth;
        series.validYear = validYear;

        await em.persist(series);

        for (const appointment of matchingAppointments) {
            appointment.patient = patient;
            appointment.legalGuardian = legalGuardian;
            appointment.healthInsurance = patient.healthInsurance;
            appointment.status = AppointmentStatus.Scheduled;
            appointment.series = series;
        }

        await em.flush();

        return matchingAppointments;
    }

    static async renewAppointmentSeries(idSeries: number) {
        const em = await getORM().em.fork();

        const series = await em.findOne(
            AppointmentSeries,
            { id: idSeries },
            { populate: ['appointments', 'appointments.professional'] }
        );

        if (!series) {
            throw new NotFoundError('Turno sostenido (Serie)');
        }

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        if (
            series.validMonth !== currentMonth ||
            series.validYear !== currentYear
        ) {
            throw new AppointmentSeriesNotAvailableError("No puede renovarse un turno sostenido de un mes anterior al actual");
        }

        if (series.appointments.length === 0) {
            throw new AppointmentSeriesNotAvailableError("Serie no disponible, contacte un administrador");
        }

        const baseAppointment = series.appointments[0];

        const professional = baseAppointment.professional;
        const day = baseAppointment.startTime.getDay() as DayOfWeek;
        const hour = baseAppointment.startTime.getHours();

        const patient = baseAppointment.patient;

        if (!patient) {
            throw new NotFoundError('Paciente');
        }

        let nextMonth = series.validMonth + 1;
        let nextYear = series.validYear;

        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }

        return await this.assignAppointmentSeries(
            professional.id,
            patient.id,
            day,
            hour,
            nextMonth,
            nextYear
        );
        
    }

    static async updateAppointmentStatus(idAppointment: number, newStatus:string) {
        const em = await getORM().em.fork();

        const ALLOWED_STATUSES = new Set<string>([
            AppointmentStatus.Missed,
            AppointmentStatus.Canceled,
            AppointmentStatus.Completed
        ]);

        if (!ALLOWED_STATUSES.has(newStatus)) {
            throw new InvalidParameterError(newStatus);
        }

        const appointment = await em.findOne(Appointment, { id: idAppointment });

        if(!appointment)
        {
            throw new NotFoundError('Turno');
        }

        if(appointment.status != AppointmentStatus.Scheduled && appointment.status != AppointmentStatus.Available) {
            throw new InvalidStatusChangeError("Turno", appointment.status, newStatus);
        }

        appointment.status = newStatus as AppointmentStatus;
        await em.flush();

        return appointment;
    }


    static async getAppointment(idAppointment: number) {
        const em = await getORM().em.fork();
        const appointment = await em.findOne(Appointment, { id: idAppointment });
        if (!appointment) {
            throw new NotFoundError('Turno');
        }
        return appointment;
    }

    static async getAppointments() {
        const em = await getORM().em.fork();
        const appointments = await em.findAll(Appointment);
        return appointments;
    }

    static async getAvailableAppointments() {
        const em = await getORM().em.fork();
        const appointments = await em.find(Appointment, { status : AppointmentStatus.Available});
        return appointments;
    }

    static async getAppointmentsByPatient(idPatient: number) {
        const em = await getORM().em.fork();
        const patient = await em.findOne(Patient, { id: idPatient });
        if(!patient) {
            throw new NotFoundError('Paciente');
        }
        const appointments = await em.find(Appointment, { patient :  patient }, { populate: ['patient', 'module.consultingRoom', 'professional', 'professional.occupation', 'legalGuardian', 'healthInsurance', 'series'] });
        return appointments.map(toDetailedAppointmentDTO);
    }

    static async getAppointmentsByLegalGuardian(idLegalGuardian: number) {
        const em = await getORM().em.fork();
        const legalGuardian = await em.findOne(LegalGuardian, { id: idLegalGuardian });
        if(!legalGuardian) {
            throw new NotFoundError('Paciente');
        }
        const appointments = await em.find(Appointment, { legalGuardian :  legalGuardian }, { populate: ['patient', 'module.consultingRoom', 'professional', 'professional.occupation', 'legalGuardian', 'healthInsurance', 'series'] });
        return appointments.map(toDetailedAppointmentDTO);
    }

    static async getAvailableAppointmentsByProfessional(idProfessional: number) {
        const em = await getORM().em.fork();
        const professional = await em.findOne(Professional, {id: idProfessional});

        if (!professional || !professional.isActive) {
            throw new NotFoundError('Profesional');
        }

        const appointments = await em.find(
            Appointment,
            { status : AppointmentStatus.Available, professional : professional}
        );
        return appointments;
    }

    static async getScheduledAppointments() {
        const em = await getORM().em.fork();
        const appointments = await em.find(
            Appointment,
            { status : AppointmentStatus.Scheduled },
            { populate: ['patient', 'professional', 'legalGuardian', 'healthInsurance'] }
        );

        return appointments;
    }

    static async getAppointmentsByStatus(status?: string) {

        const ALLOWED_STATUSES = new Set<string>(Object.values(AppointmentStatus));

        const em = await getORM().em.fork();

        let whereCondition: Record<string, any> = {};
        
        if (status === undefined || status === '') {
            whereCondition = {};
        } 
         else if (ALLOWED_STATUSES.has(status)) {
            whereCondition = { status };
        } 
         else {
            throw new InvalidParameterError(status);
        }

        const appointments = await em.find(
            Appointment,
            whereCondition,
            { populate: ['patient', 'professional', 'legalGuardian', 'healthInsurance'] }
        );

        return appointments;
    }

    static async getAppointmentSequencesByPatient(idPatient: number) {
        const em = await getORM().em.fork();

        const patient = await em.findOne(Patient, { id: idPatient });
        if (!patient) {
            throw new NotFoundError('Paciente');
        }

        const appointments = await em.find(
            Appointment,
            { patient: patient, series: { $ne: null } },
            { populate: ['series'] }
        );

        // obtener IDs únicos de series
        const uniqueSeriesIds = [
            ...new Set(appointments.map(a => a.series!.id))
        ];

        // traer las series completas
        const series = await em.find(
            AppointmentSeries,
            { id: { $in: uniqueSeriesIds } },
            { populate: ['appointments', 'appointments.professional', 'appointments.module.consultingRoom'] }
        );

        return series;
    }

    static async getAppointmentSequencesByLegalGuardian(idLegalGuardian: number) {
        const em = await getORM().em.fork();

        const legalGuardian = await em.findOne(LegalGuardian, { id: idLegalGuardian });
        if (!legalGuardian) {
            throw new NotFoundError('Paciente');
        }

        const appointments = await em.find(
            Appointment,
            { legalGuardian: legalGuardian, series: { $ne: null } },
            { populate: ['series'] }
        );

        const uniqueSeriesIds = [
            ...new Set(appointments.map(a => a.series!.id))
        ];

        const series = await em.find(
            AppointmentSeries,
            { id: { $in: uniqueSeriesIds } },
            { populate: ['appointments', 'appointments.professional', 'appointments.module.consultingRoom', 'appointments.patient'] }
        );

        return series;
    }

    static async getCurrentAppointmentSequencesByPatient(idPatient: number) {
        const em = await getORM().em.fork();

        const patient = await em.findOne(Patient, { id: idPatient });
        if (!patient) {
            throw new NotFoundError('Paciente');
        }

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const appointments = await em.find(
            Appointment,
            { 
                patient: patient,
                series: { $ne: null }
            },
            { populate: ['series'] }
        );

        const uniqueSeriesIds = [
            ...new Set(
                appointments
                    .filter(a =>
                        a.series!.validMonth === currentMonth &&
                        a.series!.validYear === currentYear
                    )
                    .map(a => a.series!.id)
            )
        ];

        const series = await em.find(
            AppointmentSeries,
            { id: { $in: uniqueSeriesIds } },
            { populate: ['appointments', 'appointments.professional', 'appointments.module.consultingRoom'] }
        );

        return series;
    }

    static async getCurrentAppointmentSequencesByLegalGuardian(idLegalGuardian: number) {
        const em = await getORM().em.fork();

        const legalGuardian = await em.findOne(LegalGuardian, { id: idLegalGuardian });
        if (!legalGuardian) {
            throw new NotFoundError('Paciente');
        }

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const appointments = await em.find(
            Appointment,
            { 
                legalGuardian: legalGuardian,
                series: { $ne: null }
            },
            { populate: ['series'] }
        );

        const uniqueSeriesIds = [
            ...new Set(
                appointments
                    .filter(a =>
                        a.series!.validMonth === currentMonth &&
                        a.series!.validYear === currentYear
                    )
                    .map(a => a.series!.id)
            )
        ];

        const series = await em.find(
            AppointmentSeries,
            { id: { $in: uniqueSeriesIds } },
            { populate: ['appointments', 'appointments.professional', 'appointments.module.consultingRoom', 'appointments.patient'] }
        );

        return series;
    }

    static async getScheduledAppointmentsByProfessionalAndDate(idProfessional: number, date: string) {
        const em = await getORM().em.fork();

        const professional = await em.findOne(Professional, { id: idProfessional });
        if (!professional || !professional.isActive) {
            throw new NotFoundError('Profesional');
        }

        // Parsear la fecha en hora local (evitar problemas de zona horaria)
        const [year, month, day] = date.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        const nextDay = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

        // Buscar turnos agendados del profesional en esa fecha
        const appointments = await em.find(
            Appointment,
            {
                professional: professional,
                status: AppointmentStatus.Scheduled,
                startTime: {
                    $gte: targetDate,
                    $lt: nextDay
                }
            },
            { 
                populate: ['patient', 'patient.user', 'healthInsurance', 'module.consultingRoom', 'series'],
                orderBy: { startTime: 'ASC' }
            }
        );

        return appointments.map(toDetailedAppointmentDTO);
    }
}
