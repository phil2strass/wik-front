import { Gender } from '@shared/data/models/langue.model';
import { Type } from '@shared/data/models/type.model';

export type WordTranslations = Record<number | string, string> | Array<[number | string, string]>;

export interface Word {
    wordTypeId: number;
    langue: number;
    name: string;
    type: Type;
    gender: Gender;
    plural: string;
    translations?: WordTranslations;
    displayName?: string;
}
