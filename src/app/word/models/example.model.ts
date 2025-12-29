export interface WordExample {
    id: number;
    wordLangueTypeId: number;
    content: string;
    createdAt?: string;
    pos?: number;
}

export interface WordExampleTranslation {
    translationId?: number | null;
    exampleId: number;
    wordLangueTypeId: number;
    langueId: number;
    content?: string;
    exampleContent: string;
    pos?: number;
}
