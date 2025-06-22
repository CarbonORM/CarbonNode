const isNode =  () => typeof process !== 'undefined' && !!process.versions?.node;

export default isNode;