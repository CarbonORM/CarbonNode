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
