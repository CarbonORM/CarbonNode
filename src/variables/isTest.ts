import {getEnvVar} from "./getEnvVar";

const isTest = getEnvVar('JEST_WORKER_ID') || getEnvVar('NODE_ENV') === 'test'
    || getEnvVar('REACT_APP_TEST') === 'true' || getEnvVar('VITE_TEST') === 'true'
    || getEnvVar('MODE') === 'test' || getEnvVar('VITE_TEST_MODE') === 'true';

export default isTest;