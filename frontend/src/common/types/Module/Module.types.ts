import {Professional, ModuleType, ConsultingRoom} from '@/common/types';

export type Module = {
    id?: number;
    day?: number;
    startTime?: string;
    endTime?: string;
    status?: string;
    validMonth?: string;
    validYear?: number;
    professional?: Professional;
    moduleType?: ModuleType;
    consultingRoom?: ConsultingRoom;
}