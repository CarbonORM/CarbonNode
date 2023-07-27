
const isTest = process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test'

export default isTest;