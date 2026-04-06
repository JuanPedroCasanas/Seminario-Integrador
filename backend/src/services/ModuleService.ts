import { getORM } from '../orm/db';
import { Module } from '../model/entities/Module';
import { Professional } from '../model/entities/Professional';
import { ConsultingRoom } from '../model/entities/ConsultingRoom';
import { ModuleType } from '../model/entities/ModuleType';
import { Appointment } from '../model/entities/Appointment';
import { AppointmentStatus } from '../utils/enums/AppointmentStatus';
import { ModuleStatus } from '../utils/enums/ModuleStatus';
import { DayOfWeek } from '../utils/enums/DayOfWeek';
import { BaseHttpError, ModuleScheduleConflictError, NotConfiguredError, NotFoundError, InvalidParameterError } from '../utils/errors/BaseHttpError';

export default class ModuleService {

    // HELPERS
    static calculateHours(startTime: string, endTime: string): number {
        let [startHours, startMinutes] = startTime.split(":").map(Number);
        let [endHours, endMinutes] = endTime.split(":").map(Number);

        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;

        let diffMinutes = endTotalMinutes - startTotalMinutes;

        if (diffMinutes < 0) {
            diffMinutes += 24 * 60;
        }

        let totalHours: number = diffMinutes / 60;
        return totalHours;
    }

    static getDatesForDayOfWeek(dayNumber: DayOfWeek, month: number, year: number): Date[] {
        const dates: Date[] = [];
        const date = new Date(year, month - 1, 1);

        while (date.getMonth() === month - 1) {
            if (date.getDay() !== 0 && date.getDay() === dayNumber % 7) {
                dates.push(new Date(date));
            }
            date.setDate(date.getDate() + 1);
        }

        return dates;
    }



//METODOS DE CONTROLADOR

    static async addModules(
        day: number,
        startTime: string,
        endTime: string,
        validMonth: number,
        validYear: number,
        idProfessional: number,
        idConsultingRoom: number
    ) {
        const em = await getORM().em.fork();

        const professional = await em.findOne(Professional, { id: idProfessional });
        const consultingRoom = await em.findOne(ConsultingRoom, { id: idConsultingRoom });
        const moduleTypes = await em.findAll(ModuleType, { orderBy: { duration: 'DESC' } });

        if(!professional || !professional?.isActive) {
            throw new NotFoundError('Profesional');
        }
        if(!consultingRoom || !consultingRoom?.isActive) {
            throw new NotFoundError('Consultorio');
        }
        if(moduleTypes.length === 0) {
            throw new NotConfiguredError('Tipos de modulo');
        }

        let dayOfWeek = Number(day) as DayOfWeek;

        const conflictingModules = await em.find(Module, {
            consultingRoom: consultingRoom,
            day: dayOfWeek,
            validMonth: Number(validMonth),
            validYear: Number(validYear),
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
            status: { $ne: ModuleStatus.Canceled }
        });

        if (conflictingModules.length > 0) {
            throw new ModuleScheduleConflictError(startTime, endTime);
        }

        let totalHours = ModuleService.calculateHours(startTime, endTime);

        const moduleTypeAmount = [];

        for (const moduleType of moduleTypes) {
            const amount = Math.floor(totalHours / moduleType.duration);
            moduleTypeAmount.push(amount);
            if (amount > 0) {
                totalHours -= amount * moduleType.duration;
            }
        }

        const modules: Module[] = [];

        for (let i = 0; i < moduleTypeAmount.length; i++) {
            const amount = moduleTypeAmount[i];
            const moduleType = moduleTypes[i];

            for (let j = 0; j < amount; j++) {
                const newMod = new Module(
                    dayOfWeek,
                    startTime,
                    Number(validMonth),
                    Number(validYear),
                    professional,
                    consultingRoom,
                    moduleType
                );

                modules.push(newMod);
                await em.persist(newMod);

                let [hours, minutes] = startTime.split(":").map(Number);

                const datesInMonth = ModuleService.getDatesForDayOfWeek(
                    newMod.day,
                    newMod.validMonth,
                    newMod.validYear
                );

                for (const date of datesInMonth) {
                    for (let k = 0; k < newMod.moduleType.duration; k++) {
                        const appointmentStart = new Date(
                            newMod.validYear,
                            newMod.validMonth - 1,
                            date.getDate(),
                            hours + k - 3,
                            minutes
                        );
                        const appointmentEnd = new Date(
                            newMod.validYear,
                            newMod.validMonth - 1,
                            date.getDate(),
                            hours + k + 1 - 3,
                            minutes
                        );

                        const appointment = new Appointment(
                            newMod,
                            appointmentStart,
                            appointmentEnd,
                            professional,
                            AppointmentStatus.Available,
                            undefined,
                            undefined,
                            undefined
                        );

                        await em.persist(appointment);
                        newMod.appointments.add(appointment);
                    }
                }

                hours += moduleType.duration;
                if (hours >= 24) hours -= 24;

                startTime = `${hours.toString().padStart(2, "0")}:${minutes
                    .toString()
                    .padStart(2, "0")}`;
            }
        }

        await em.flush();

        return modules;
    }

    static async getModule(idModule: number) {
        const em = await getORM().em.fork();
        const module = await em.findOne(Module, { id: idModule });

        if(!module) {
            throw new NotFoundError("Modulo");
        }

        return module;
    }

    static async getModules() {
        const em = await getORM().em.fork();
        const modules = await em.findAll(Module, {
            populate: ["professional", "consultingRoom", "moduleType"],
        });

        return modules;
    }

    static async getCurrentMonthModulesByConsultingRoom(idConsultingRoom: number) {
        const em = await getORM().em.fork();

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const consultingRoom = await em.findOne(ConsultingRoom, { id: idConsultingRoom });

        if(!consultingRoom || !consultingRoom.isActive) {
            throw new NotFoundError("Consultorio");
        }

        const modules = await em.find(Module, {
            consultingRoom: consultingRoom,
            validYear: currentYear,
            validMonth: currentMonth
        });

        return modules;
    }

    static async renewModules(moduleIds: number[]) {
        const em = await getORM().em.fork();

        if (!moduleIds || moduleIds.length === 0) {
            throw new InvalidParameterError('moduleIds (Arreglo vacio)');
        }

        const modules = await em.find(
            Module,
            { id: { $in: moduleIds } },
            { populate: ['professional', 'consultingRoom'] }
        );

        if (modules.length === 0) {
            throw new NotFoundError('Modulos');
        }

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        for (const mod of modules) {
            if (mod.validMonth !== currentMonth || mod.validYear !== currentYear) {
                throw new InvalidParameterError('Solo se pueden renovar modulos del mes vigente');
            }
        }

        for (const mod of modules) {
            if (mod.status === ModuleStatus.Canceled) {
                throw new InvalidParameterError('Solo se pueden renovar modulos a pagar o que hayan sido pagados');
            }
        }

        const professional = modules[0].professional;
        for (const mod of modules) {
            if (mod.professional.id !== professional.id) {
                throw new InvalidParameterError('Modulos de distintos profesionales');
            }
        }

        const baseMonth = modules[0].validMonth;
        const baseYear = modules[0].validYear;

        let nextMonth = baseMonth + 1;
        let nextYear = baseYear;

        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }

        const grouped = new Map<string, Module[]>();

        for (const mod of modules) {
            const key = `${mod.day}-${mod.consultingRoom.id}-${mod.startTime}-${mod.endTime}`;

            if (!grouped.has(key)) {
                grouped.set(key, []);
            }

            grouped.get(key)!.push(mod);
        }

        const createdModules: Module[] = [];

        for (const group of grouped.values()) {
            const base = group[0];

            const newModules = await ModuleService.addModules(
                base.day,
                base.startTime,
                base.endTime,
                nextMonth,
                nextYear,
                professional.id,
                base.consultingRoom.id
            );

            createdModules.push(...newModules);
        }

        return createdModules;
    }

    static async getModulesByProfessional(idProfessional: number) {
        const em = await getORM().em.fork();

        const professional = await em.findOne(Professional, { id: idProfessional });

        if (!professional || !professional.isActive) {
            throw new NotFoundError('Profesional');
        }

        const modules = await em.find(
            Module,
            { 
                professional: professional,
                status: { $ne: ModuleStatus.Canceled }
            },
            { 
                populate: ['professional', 'consultingRoom', 'moduleType'],
                orderBy: { validYear: 'DESC', validMonth: 'DESC', day: 'ASC', startTime: 'ASC' }
            }
        );

        return modules;
    }
}
