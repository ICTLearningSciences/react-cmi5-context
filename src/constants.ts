export class Cmi5ContextActivity {
  public static readonly MOVE_ON = {
    id: "https://w3id.org/xapi/cmi5/context/categories/moveon",
  };
  public static readonly CMI5 = {
    id: "https://w3id.org/xapi/cmi5/context/categories/cmi5",
  };
  public static readonly MASTERY = (mastery: number) => {
    return {
      "https://w3id.org/xapi/cmi5/context/extensions/masteryscore": mastery,
    };
  };
}

export const STATE_LMS_LAUNCHDATA = "LMS.LaunchData";
export const VERB_INITIALIZED = "http://adlnet.gov/expapi/verbs/initialized";
export const VERB_PASSED = "http://adlnet.gov/expapi/verbs/passed";
export const VERB_COMPLETED = "http://adlnet.gov/expapi/verbs/completed";
export const VERB_FAILED = "http://adlnet.gov/expapi/verbs/failed";
export const VERB_TERMINATED = "http://adlnet.gov/expapi/verbs/terminated";
export const AUTH_STATUS_NONE = "NONE";
export const AUTH_STATUS_IN_PROGRESS = "IN_PROGRESS";
export const AUTH_STATUS_SUCCESS = "SUCCESS";
export const AUTH_STATUS_FAILED = "FAILED";
export const ACTIVITY_STATUS_NONE = "NONE";
export const ACTIVITY_STATUS_IN_PROGRESS = "LOAD_IN_PROGRESS";
export const ACTIVITY_STATUS_SUCCESS = "LOADED";
export const ACTIVITY_STATUS_FAILED = "FAILED";
