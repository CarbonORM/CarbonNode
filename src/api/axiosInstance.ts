// @link https://www.npmjs.com/package/axios-cache-adapter
import axios from "axios";
import Qs from "qs";
//import axiosInterceptors from "api/hoc/axiosInterceptors";

// noinspection SpellCheckingInspection

export default (axios.create({

    // `baseURL` will be prepended to `url` unless `url` is absolute.
    // It can be convenient to set `baseURL` for an instance of axios to pass relative URLs
    // to methods of that instance.
    baseURL: '',

    /**
     * These headers are important to use here at dig.
     * XMLHttpRequest - is a standard header all jquery ajax requests send by default. This allows our php side to return
     *                  nothing while running the get_header() and get_footer() functions with (bool) DropVariables::$ajax;
     *
     * application/json - is for the error catcher in php; this header will cause a JSON response instead of the default HTML
     */
    headers: {
        crossDomain: true,
        'Access-Control-Allow-Credentials': true,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
    },


    // `paramsSerializer` is an optional function in charge of serializing `params`
    // (e.g. https://www.npmjs.com/package/qs, http://api.jquery.com/jquery.param/)
    paramsSerializer: function (params) {
        // Nested get params [][][,,,] do not serialize correctly without Qs
        return Qs.stringify(params, {arrayFormat: 'indices', indices: true, skipNulls: false, strictNullHandling: true})
    },


    // `data` is the data to be sent as the request body
    // Only applicable for request methods 'PUT', 'POST', and 'PATCH'
    // When no `transformRequest` is set, must be of one of the following types:
    // - string, plain object, ArrayBuffer, ArrayBufferView, URLSearchParams
    // - Browser only: FormData, File, Blob
    // - Node only: Stream, Buffer
    // data should be default to empty for get request to serialize correctly
    data: {}, // do not change


    // `timeout` specifies the number of milliseconds before the request times out.
    // If the request takes longer than `timeout`, the request will be aborted.
    // Default is 1000, this will fail for DIG
    timeout: 120000, // shit fails

    // `withCredentials` indicates weather cross-site Access-Control requests
    // should be made using credentials
    withCredentials: true,

    // `adapter` allows custom handling of requests which makes testing easier.
    // Return a promise and supply a valid response (see lib/adapters/README.md).
    // adapter: cache.adapter,

    // `auth` indicates that HTTP Basic auth should be used, and supplies credentials.
    // This will set an `Authorization` header, overwriting any existing
    // `Authorization` custom headers you have set using `headers`.
    /*
    auth: {
        username: 'janedoe',
        password: 's00pers3cret'
    },
    */
    // `responseType` indicates the type of data that the server will respond with
    // options are 'arraybuffer', 'blob', 'document', 'json', 'text', 'stream'
    // responseType: 'json', // default

    // `responseEncoding` indicates encoding to use for decoding responses
    // Note: Ignored for `responseType` of 'stream' or client-side requests

    // `xsrfCookieName` is the name of the cookie to use as a value for xsrf token
    //xsrfCookieName: 'XSRF-TOKEN', // default

    // `xsrfHeaderName` is the name of the http header that carries the xsrf token value
    //xsrfHeaderName: 'X-XSRF-TOKEN', // default

    // `onUploadProgress` allows handling of progress events for uploads
    onUploadProgress: function () { // progressEvent
        // Do whatever you want with the native progress event
    },

    // `onDownloadProgress` allows handling of progress events for downloads
    onDownloadProgress: function () { // progressEvent
        // Do whatever you want with the native progress event
    },

    // `maxContentLength` defines the max size of the http response content in bytes allowed
    /*maxContentLength: 2000,*/

    // `validateStatus` defines whether to resolve or reject the promise for a given
    // HTTP response status code. If `validateStatus` returns `true` (or is set to `null`
    // or `undefined`), the promise will be resolved; otherwise, the promise will be
    // rejected.
    /* validateStatus: function (status) {
         return status >= 200 && status < 300;
     },*/

    // `maxRedirects` defines the maximum number of redirects to follow in node.js.
    // If set to 0, no redirects will be followed.
    maxRedirects: 2, // default

    // `socketPath` defines a UNIX Socket to be used in node.js.
    // e.g. '/var/run/docker.sock' to send requests to the docker daemon.
    // Only either `socketPath` or `proxy` can be specified.
    // If both are specified, `socketPath` is used.
    socketPath: null, // default

    // `httpAgent` and `httpsAgent` define a custom agent to be used when performing http
    // and https requests, respectively, in node.js. This allows options to be added like
    // `keepAlive` that are not enabled by default.

    /*
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
    */

}));



