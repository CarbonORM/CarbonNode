import {getEnvVar} from "./getEnvVar";

const envVerbose = getEnvVar('VERBOSE') || getEnvVar('REACT_APP_VERBOSE') || getEnvVar('VITE_VERBOSE') || ''

const isVerbose = ['true', '1', 'yes', 'on'].includes(envVerbose.toLowerCase());

export default isVerbose