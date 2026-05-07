import {
    Actor,
    C6,
    COLUMNS,
    GLOBAL_REST_PARAMETERS,
    RestTablePrefix,
    TABLES,
    initialRestfulObjectsState,
    type ActorPrimaryKeys,
    type iActor,
    type iRestfulObjectArrayTypes,
    type RestShortTableNames,
    type RestTableInterfaces,
    type RestTableNames,
    type tRestfulObjectArrayValues,
    type tStatefulApiData,
} from "../sakila-db/C6";

const actor: iActor = {
    actor_id: 1,
    first_name: "Ada",
    last_name: "Lovelace",
};
const tableName: RestTableNames = "actor";
const shortName: RestShortTableNames = "actor";
const primaryKey: ActorPrimaryKeys = "actor_id";
const state: iRestfulObjectArrayTypes = initialRestfulObjectsState;
const actorState: tStatefulApiData<iActor> = state.actor;
const stateValue: tRestfulObjectArrayValues = actorState;
const tableInterface: RestTableInterfaces = actor;

export const generatedC6PublicSurface = {
    Actor,
    C6,
    COLUMNS,
    GLOBAL_REST_PARAMETERS,
    RestTablePrefix,
    TABLES,
    actor,
    tableName,
    shortName,
    primaryKey,
    state,
    stateValue,
    tableInterface,
};
