import {
    Actor_Info,
    Actor,
    C6,
    COLUMNS,
    GLOBAL_REST_PARAMETERS,
    RestTablePrefix,
    TABLES,
    VIEWS,
    initialRestfulObjectsState,
    type ActorPrimaryKeys,
    type Actor_InfoPrimaryKeys,
    type iActor,
    type iActor_Info,
    type iRestfulObjectArrayTypes,
    type RestShortTableNames,
    type RestShortViewNames,
    type RestTableInterfaces,
    type RestTableNames,
    type RestViewNames,
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
const viewName: RestViewNames = "actor_info";
const shortViewName: RestShortViewNames = "actor_info";
const primaryKey: ActorPrimaryKeys = "actor_id";
const viewPrimaryKey: Actor_InfoPrimaryKeys = undefined as never;
const actorInfo: iActor_Info = {
    actor_id: 1,
    first_name: "Ada",
    last_name: "Lovelace",
    film_info: "Documentary",
};
const state: iRestfulObjectArrayTypes = initialRestfulObjectsState;
const actorState: tStatefulApiData<iActor> = state.actor;
const stateValue: tRestfulObjectArrayValues = actorState;
const tableInterface: RestTableInterfaces = actor;
const viewState: tStatefulApiData<iActor_Info> = state.actor_info;

export const generatedC6PublicSurface = {
    Actor_Info,
    Actor,
    C6,
    COLUMNS,
    GLOBAL_REST_PARAMETERS,
    RestTablePrefix,
    TABLES,
    VIEWS,
    actor,
    tableName,
    shortName,
    viewName,
    shortViewName,
    primaryKey,
    viewPrimaryKey,
    actorInfo,
    state,
    viewState,
    stateValue,
    tableInterface,
};
