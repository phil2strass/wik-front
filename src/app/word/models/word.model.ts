import { Gender } from '@shared/data/models/langue.model';
import { Type } from '@shared/data/models/type.model';

export interface Word {
    wordTypeId: number;
    langue: number;
    name: string;
    type: Type;
    gender: Gender;
    plural: string;
}
