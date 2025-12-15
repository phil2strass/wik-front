import { Gender } from '@shared/data/models/langue.model';
import { Type } from '@shared/data/models/type.model';

export interface WordTranslationValue {
    name: string;
    genderId: number | null;
    wordTypeId: number | null;
    langueId: number | null;
    typeId: number | null;
    plural: string;
    commentaire?: string;
}

export type WordTranslations =
    | Record<number | string, WordTranslationValue[]>
    | Array<[number | string, WordTranslationValue[]]>;

export interface Word {
    wordTypeId: number;
    langue: number;
    name: string;
    type: Type;
    types?: string; // comma-separated list when multiple types are present
    gender: Gender;
    plural: string;
    translations?: WordTranslations;
    displayName?: string;
}
