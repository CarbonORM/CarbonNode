import {getEnv} from "./getEnv";



export default function () {
    return  getEnv('NODE_ENV', '') === 'development';
};