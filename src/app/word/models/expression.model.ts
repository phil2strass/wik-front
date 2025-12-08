export interface WordExpression {
    id: number;
    wordTypeId: number;
    content: string;
    createdAt?: string;
}

export interface WordExpressionTranslation {
    translationId?: number | null;
    expressionId: number;
    wordTypeId: number;
    langueId: number;
    content?: string;
    expressionContent: string;
}
