import {getEnvBool} from "./getEnv";

export default function () {
    return getEnvBool('VERBOSE', false) || getEnvBool('REACT_APP_VERBOSE', false) || getEnvBool('VITE_VERBOSE', false)
}