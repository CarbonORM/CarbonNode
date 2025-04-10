
const isTest =
    typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    (
        process.env.JEST_WORKER_ID !== undefined ||
        process.env.NODE_ENV === 'test' ||
        process.env.REACT_APP_TEST === 'true'
    ) ||
    // Vite-only branch
    typeof import.meta !== 'undefined' &&
    (
        // @ts-ignore
        import.meta?.env?.MODE === 'test' ||
        // @ts-ignore
        import.meta?.env?.VITE_TEST === 'true'
    );

export default isTest;