export declare class HttpError extends Error {
    readonly statusCode: number;
    readonly details?: unknown | undefined;
    constructor(statusCode: number, message: string, details?: unknown | undefined);
}
//# sourceMappingURL=httpError.d.ts.map