import { Request, Response } from 'express';
import { BaseHttpError } from '../utils/errors/BaseHttpError';
import { LeaveService } from '../services/LeaveService';

export class LeaveController {

    static async addLeave(req: Request, res: Response) {
        const { startDate, endDate, idProfessional } = req.body;

        try {
            const leave = await LeaveService.addLeave(startDate, endDate, idProfessional)

            return res.status(201).json({
                message: 'Licencia solicitada',
                leave
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al generar la licencia' });
        }
    }

    static async cancelLeave(req: Request, res: Response) {
        const idLeave = Number(req.params.idLeave);

        try {
            const leave = await LeaveService.cancelLeave(idLeave);
            return res.status(201).json({
                message: 'Licencia cancelada',
                leave
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al cancelar la licencia' });
        }
    }

    static async getLeave(req: Request, res: Response) {
        const idLeave = Number(req.params.idLeave);

        try {
            const leave = await LeaveService.getLeave(idLeave);
            return res.status(201).json({
                leave
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al buscar la licencia' });
        }
    }


    static async getLeavesByProfessional(req: Request, res: Response) {
        const idProfessional = Number(req.params.idProfessional);

        try {
            const leaves = await LeaveService.getLeavesByProfessional(idProfessional);
            return res.status(201).json({
                leaves
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al buscar las licencia' });
        }
    }



}





