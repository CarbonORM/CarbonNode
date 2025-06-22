const isNode =  () => {

    console.log('Checking if running in Node.js environment...');

    const isNodeEnv = typeof process !== 'undefined' && !!process.versions?.node;

    console.log(`Is Node.js environment: ${isNodeEnv}`);

    return isNodeEnv;
}

export default isNode;