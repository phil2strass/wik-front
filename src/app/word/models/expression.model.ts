export interface WordExpression {
    id: number;
    wordLangueTypeId: number;
    content: string;
    createdAt?: string;
}

export interface WordExpressionTranslation {
    translationId?: number | null;
    expressionId: number;
    wordLangueTypeId: number;
    langueId: number;
    content?: string;
    expressionContent: string;
}
