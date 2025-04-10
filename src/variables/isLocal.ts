import {getEnvVar} from "./getEnvVar";


const isDevelopment = getEnvVar('NODE_ENV', '') === 'development';

export default isDevelopment;