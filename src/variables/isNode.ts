const isNode =  () => {
    return typeof process !== 'undefined' && !!process.versions?.node;
}

export default isNode;