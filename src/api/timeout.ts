
/**
 * @usage - ensure multiple request do not go off to quickly
 *
 * @param shouldContinueAfterTimeout
 * @param cb
 * @param timeoutMs
 */

export default function timeout(
    shouldContinueAfterTimeout: () => boolean,
    cb: () => void,
    timeoutMs: number = 3000): () => void {

    const timer = () => setTimeout(() => {

        if (false === shouldContinueAfterTimeout()) {

            return;

        }

        cb();

    }, timeoutMs);

    const timerId = timer();

    return () => {
        clearTimeout(timerId);
    };


}

timeout.displayName = 'Timeout';
