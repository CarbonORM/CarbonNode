export enum eFetchDependencies {
    NONE      = 0,
    REFERENCED= 1 << 0, // alias of CHILDREN
    CHILDREN  = 1 << 0, // 0b0001
    REFERENCES= 1 << 1, // alias of PARENTS
    PARENTS   = 1 << 1, // 0b0010
    ALL       = (1 << 0) | (1 << 1), // CHILDREN | PARENTS => 0b0011
    C6ENTITY  = 1 << 2, // 0b0100
    RECURSIVE = 1 << 3, // 0b1000
}
