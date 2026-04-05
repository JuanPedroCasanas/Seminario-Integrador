import { getORM } from '../orm/db';
import { HealthInsurance } from '../model/entities/HealthInsurance';
import { BaseHttpError, NotFoundError, EntityAlreadyExistsError, DuplicateHealthInsuranceError } from '../utils/errors/BaseHttpError';
import { Professional } from '../model/entities/Professional';

export class HealthInsuranceService {

    static async addHealthInsurance(name: string) {
        const em = await getORM().em.fork(); 
        
        // Validar que no exista una obra social activa con el mismo nombre
        const existingHealthInsurance = await em.findOne(HealthInsurance, { 
            name: name.trim(), 
            isActive: true 
        });

        if (existingHealthInsurance) {
            throw new DuplicateHealthInsuranceError({
                id: existingHealthInsurance.id,
                name: existingHealthInsurance.name
            });
        }

        const healthInsurance = new HealthInsurance(name);
        await em.persistAndFlush(healthInsurance);

        return healthInsurance;
    }

    static async updateHealthInsurance(idHealthInsurance: number, name: string) {
        const em = await getORM().em.fork();

        const healthInsurance = await em.findOne(HealthInsurance, { id: idHealthInsurance });

        if (!healthInsurance) {
            throw new NotFoundError('Obra Social');
        }

        // Validar que no exista otra obra social activa con el mismo nombre
        const existingHealthInsurance = await em.findOne(HealthInsurance, { 
            name: name.trim(), 
            isActive: true 
        });

        if (existingHealthInsurance && existingHealthInsurance.id !== idHealthInsurance) {
            throw new DuplicateHealthInsuranceError({
                id: existingHealthInsurance.id,
                name: existingHealthInsurance.name
            });
        }

        healthInsurance.name = name;
        await em.flush();

        return healthInsurance;
    }

    static async getHealthInsurance(idHealthInsurance: number) {
        const em = await getORM().em.fork();
        const healthInsurance = await em.findOne(HealthInsurance, { id: idHealthInsurance });

        if (!healthInsurance) {
            throw new NotFoundError('Obra Social');
        }

        return healthInsurance;
    }

    static async getAllHealthInsurances(includeInactive: boolean) {
        const em = await getORM().em.fork();
        const whereCondition = (includeInactive) ? {} : { isActive: true };
        const healthInsurances = await em.find(HealthInsurance, whereCondition);

        return healthInsurances;
    }

    static async getHealthInsuranceByProfessional(idProfessional: number, includeInactive: boolean) {
        const em = await getORM().em.fork();
        const professional = await em.findOne(Professional, { id: idProfessional });

        if(!professional) {
            throw new NotFoundError('profesional')
        }

        await professional.healthInsurances.init();

        let healthInsurances = professional.healthInsurances.getItems();
        if(!includeInactive) {
            healthInsurances = healthInsurances.filter(insurance => insurance.isActive);
        }

        return healthInsurances;
    }

    static async deleteHealthInsurance(idHealthInsurance: number) {
        const em = await getORM().em.fork();
        const healthInsurance = await em.findOne(HealthInsurance, { id : idHealthInsurance });

        if (!healthInsurance) {
            throw new NotFoundError('Obra Social');
        }

        // Cargar todos los profesionales asociados a esta obra social
        await healthInsurance.professionals.init();

        // Remover la obra social de todos los profesionales
        for (const professional of healthInsurance.professionals) {
            await professional.healthInsurances.init();
            professional.healthInsurances.remove(healthInsurance);
        }

        healthInsurance.isActive = false;

        await em.flush();

        return healthInsurance;
    }
}
