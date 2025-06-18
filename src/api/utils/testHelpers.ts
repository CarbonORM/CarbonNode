import {apiRequestCache} from "./cacheManager";

export function checkAllRequestsComplete(): true | (string[]) {

    const stillRunning = apiRequestCache.filter((cache) => undefined === cache.response)

    if (stillRunning.length !== 0) {

        if (document === null || document === undefined) {

            throw new Error('document is undefined while waiting for API requests to complete (' + JSON.stringify(apiRequestCache) + ')')

        }

        // when requests return emtpy sets in full renders, it may not be possible to track their progress.
        console.warn('stillRunning...', stillRunning)

        return stillRunning.map((cache) => cache.requestArgumentsSerialized)

    }

    return true

}