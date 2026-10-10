import {responseByteLimit, QuerySafetyConfig} from './querySafety';

/** Browser fetch adapter exposes a stream, so JSON parsing occurs only after bounded receipt. */
export async function readHttpResponseStream(data: ReadableStream<Uint8Array>, config: QuerySafetyConfig,
    controller: AbortController): Promise<unknown> {
    if (!data?.getReader) throw new Error('Browser HTTP transport must expose a response stream.');
    const max = responseByteLimit(config), reader = data.getReader();
    let bytes = 0;
    const chunks: string[] = [], decoder = new TextDecoder('utf-8', {fatal: true});
    try {
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > max) throw new Error('HTTP response transport byte budget exceeded.');
            chunks.push(decoder.decode(value, {stream: true}));
        }
        chunks.push(decoder.decode());
        const text = chunks.join('');
        try {return JSON.parse(text);} catch {return text;}
    } catch (error) {
        controller.abort();
        try {await reader.cancel(error);} catch {}
        throw error;
    } finally {reader.releaseLock();}
}
