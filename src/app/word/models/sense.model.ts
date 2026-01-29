export interface WordSense {
    id: number;
    wordLangueTypeId: number;
    content: string;
    pos?: number;
}

export interface WordSenseExample {
    id: number;
    sensId: number;
    content: string;
    pos?: number;
}

export interface WordSenseTranslation {
    id?: number;
    sensId: number;
    langueId: number;
    content: string;
}

export interface WordSenseExampleTranslation {
    id?: number;
    sensExampleId: number;
    langueId: number;
    content: string;
}

export interface WordSenseWordTranslation {
    id?: number;
    sensId: number;
    langueId: number;
    content: string;
    genderId?: number | null;
    plural?: string | null;
}
