export declare class Cmi5ContextActivity {
  static readonly MOVE_ON: {
    id: string;
  };
  static readonly CMI5: {
    id: string;
  };
  static readonly MASTERY: (
    mastery: number
  ) => {
    "https://w3id.org/xapi/cmi5/context/extensions/masteryscore": number;
  };
}
export declare const STATE_LMS_LAUNCHDATA = "LMS.LaunchData";
export declare const VERB_INITIALIZED =
  "http://adlnet.gov/expapi/verbs/initialized";
export declare const VERB_PASSED = "http://adlnet.gov/expapi/verbs/passed";
export declare const VERB_COMPLETED =
  "http://adlnet.gov/expapi/verbs/completed";
export declare const VERB_FAILED = "http://adlnet.gov/expapi/verbs/failed";
export declare const VERB_TERMINATED =
  "http://adlnet.gov/expapi/verbs/terminated";
export declare const AUTH_STATUS_NONE = "NONE";
export declare const AUTH_STATUS_IN_PROGRESS = "IN_PROGRESS";
export declare const AUTH_STATUS_SUCCESS = "SUCCESS";
export declare const AUTH_STATUS_FAILED = "FAILED";
export declare const ACTIVITY_STATUS_NONE = "NONE";
export declare const ACTIVITY_STATUS_IN_PROGRESS = "LOAD_IN_PROGRESS";
export declare const ACTIVITY_STATUS_SUCCESS = "LOADED";
export declare const ACTIVITY_STATUS_FAILED = "FAILED";
