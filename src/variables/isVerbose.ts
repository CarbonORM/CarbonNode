import {getEnvVar} from "./getEnvVar";

export default function () {
    const envVerbose = getEnvVar('VERBOSE') || getEnvVar('REACT_APP_VERBOSE') || getEnvVar('VITE_VERBOSE') || ''
    return ['true', '1', 'yes', 'on'].includes(envVerbose.toLowerCase());
}