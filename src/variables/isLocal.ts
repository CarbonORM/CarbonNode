import {getEnvVar} from "./getEnvVar";



export default function () {
    return  getEnvVar('NODE_ENV', '') === 'development';
};