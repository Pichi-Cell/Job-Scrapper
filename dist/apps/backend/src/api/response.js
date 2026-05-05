export function ok(data) {
    return {
        data,
        error: null,
    };
}
export function fail(message) {
    return {
        data: [],
        error: message,
    };
}
