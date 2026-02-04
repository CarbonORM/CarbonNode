import {getEnv, getEnvBool} from "./getEnv";


export default function () {
    return getEnv('JEST_WORKER_ID', null) || getEnv('NODE_ENV', "") === 'test'
        || getEnvBool('REACT_APP_TEST', false) || getEnvBool('VITE_TEST', false)
        || getEnv('MODE', '') === 'test' || getEnvBool('VITE_TEST_MODE', false);
};