export interface BaseResponse {
    getData(): unknown;

    getStatus(): number;

    getHeaders(): unknown;

    getValidationErrors(): unknown;
}
