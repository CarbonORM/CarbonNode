export enum eFetchDependencies {
    NONE = 0,
    REFERENCED = 0b1,
    CHILDREN = 0b1,
    REFERENCES = 0b10,
    PARENTS = 0b10,
    ALL = 0b11,
    C6ENTITY = 0b100,
    RECURSIVE = 0b1000,
}
