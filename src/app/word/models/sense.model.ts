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
