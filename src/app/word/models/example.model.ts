export interface WordExample {
    id: number;
    wordTypeId: number;
    content: string;
    createdAt?: string;
}

export interface WordExampleTranslation {
    translationId?: number | null;
    exampleId: number;
    wordTypeId: number;
    langueId: number;
    content?: string;
    exampleContent: string;
}
