import { Gender } from '@shared/data/models/langue.model';
import { Type } from '@shared/data/models/type.model';
import { Categorie } from './categorie.model';

export interface WordTranslationValue {
    name: string;
    genderId: number | null;
    wordLangueTypeId: number | null;
    langueId: number | null;
    typeId: number | null;
    plural: string;
    commentaire?: string;
    baseWordLangueTypeId?: number | null;
    targetWordLangueTypeId?: number | null;
    meaningIndex?: number | null;
}

export type WordTranslations =
    | Record<number | string, WordTranslationValue[]>
    | Array<[number | string, WordTranslationValue[]]>;

export interface Word {
    wordLangueTypeId: number;
    langue: number;
    name: string;
    type: Type;
    types?: string; // comma-separated list when multiple types are present
    gender: Gender;
    plural: string;
    translations?: WordTranslations;
    displayName?: string;
    categories?: Categorie[];
}
