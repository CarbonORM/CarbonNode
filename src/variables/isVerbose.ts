import {LogLevel, resolveLogLevel} from "../utils/logLevel";

export default function isVerbose() {
    return resolveLogLevel() >= LogLevel.DEBUG;
}
