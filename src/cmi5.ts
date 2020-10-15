/*
Government Purpose Rights (“GPR”)
Contract No.  W911NF-14-D-0005
Contractor Name:   University of Southern California
Contractor Address:  3720 S. Flower Street, 3rd Floor, Los Angeles, CA 90089-0001
Expiration Date:  Restrictions do not expire, GPR is perpetual
Restrictions Notice/Marking: The Government's rights to use, modify, reproduce, release, perform, display, or disclose this software are restricted by paragraph (b)(2) of the Rights in Noncommercial Computer Software and Noncommercial Computer Software Documentation clause contained in the above identified contract.  No restrictions apply after the expiration date shown above. Any reproduction of the software or portions thereof marked with this legend must also reproduce the markings. (see: DFARS 252.227-7014(f)(2)) 

No Commercial Use: This software shall be used for government purposes only and shall not, without the express written permission of the party whose name appears in the restrictive legend, be used, modified, reproduced, released, performed, or displayed for any commercial purpose or disclosed to a person other than subcontractors, suppliers, or prospective subcontractors or suppliers, who require the software to submit offers for, or perform, government contracts.  Prior to disclosing the software, the Contractor shall require the persons to whom disclosure will be made to complete and sign the non-disclosure agreement at 227.7103-7.  (see DFARS 252.227-7025(b)(2))
*/
import {
  Agent,
  Extensions,
  Result,
  Context,
  Statement,
  Score,
  Verb,
} from "@gradiant/xapi-dsl";
import axios from "axios";
import moment from "moment";
import { LRS, newLrs, ActivityState } from "./xapi";
import {
  AUTH_STATUS_NONE,
  ACTIVITY_STATUS_NONE,
  VERB_INITIALIZED,
  VERB_PASSED,
  VERB_FAILED,
  VERB_COMPLETED,
  VERB_TERMINATED,
  AUTH_STATUS_IN_PROGRESS,
  AUTH_STATUS_FAILED,
  AUTH_STATUS_SUCCESS,
  ACTIVITY_STATUS_IN_PROGRESS,
  STATE_LMS_LAUNCHDATA,
  ACTIVITY_STATUS_FAILED,
  ACTIVITY_STATUS_SUCCESS,
  Cmi5ContextActivity,
} from "./constants";

let _url = "";
let _cmi: Cmi5Service | null = null;

export interface HasVerb {
  verb: Verb;
}

export interface Cmi5Params {
  activityId: string;
  actor: Agent;
  endpoint: string;
  fetch: string;
  registration: string;
}

export interface Cmi5State {
  start?: Date;
  statements: Statement[];
  authStatus: string;
  accessToken: string;
  activityStatus: string;
  lmsLaunchData: ActivityState;
}

interface CmiStateUpdateCallback {
  (): void;
}

interface Unregister {
  (): void;
}

export interface Cmi5Service {
  readonly params: Cmi5Params;
  readonly state: Cmi5State;
  readonly onStateUpdate: (cb: CmiStateUpdateCallback) => Unregister;
  readonly start: () => Promise<void>;
  readonly moveOn: (p: PassedParams) => Promise<void>;
  readonly passed: (p: PassedParams) => Promise<void>;
  readonly failed: (p: PassedParams) => Promise<void>;
  readonly completed: (extensions?: Extensions) => Promise<void>;
  readonly terminate: () => Promise<void>;
}

interface PassedParams {
  score: number | Score;
  contextExtensions?: Extensions;
  resultExtensions?: Extensions;
}

interface PrepareActivityStatementParams {
  verb: string;
  result?: Result;
  context?: Context;
}

function hasCmi5Params(p: URLSearchParams): boolean {
  return Boolean(
    // true if has all required cmi5 query params
    p.get("fetch") &&
      p.get("endpoint") &&
      p.get("actor") &&
      p.get("registration") &&
      p.get("activityId")
  );
}

function toScore(s: number | Score): Score {
  return !isNaN(Number(s))
    ? {
        scaled: Number(s),
      }
    : (s as Score);
}

function getISODuration(init: Date): string {
  return moment.duration(new Date().getTime() - init.getTime()).toISOString();
}

class _CmiService implements Cmi5Service {
  readonly params: Cmi5Params;
  _state: Cmi5State;
  _lrs: LRS | null = null;
  _onStateUpdateObservers: CmiStateUpdateCallback[] = [];

  constructor(params: Cmi5Params) {
    this.params = params;
    this._state = {
      statements: [],
      start: undefined,
      authStatus: AUTH_STATUS_NONE,
      accessToken: "",
      activityStatus: ACTIVITY_STATUS_NONE,
      lmsLaunchData: {},
    };
  }

  get state(): Cmi5State {
    return this._state;
  }

  onStateUpdate(cb: CmiStateUpdateCallback): Unregister {
    const rmIx = this._onStateUpdateObservers.indexOf(cb);
    if (rmIx === -1) {
      this._onStateUpdateObservers.push(cb);
    } else {
      this._onStateUpdateObservers.splice(rmIx, 1);
    }
    // eslint-disable-next-line
    return () => {};
  }

  updateState(s: Cmi5State): void {
    this._state = s;
    this._onStateUpdateObservers.forEach((cb) => {
      cb();
    });
  }

  prepareActivityStatement(p: PrepareActivityStatementParams): Statement {
    return {
      actor: this.params.actor,
      context: {
        ...p.context,
        registration: this.params.registration,
      },
      object: {
        id: this.params.activityId,
      },
      verb: {
        id: p.verb,
      },
      result: p.result,
    };
  }

  async sendActivityStatement(
    p: PrepareActivityStatementParams
  ): Promise<void> {
    const statement = this.prepareActivityStatement({ ...p });
    this._lrs?.saveStatements([statement]);
    this.updateState({
      ...this._state,
      statements: [...this.state.statements, statement],
    });
  }

  async start(): Promise<void> {
    if (this.state.statements.find((s) => s.verb.id === VERB_INITIALIZED)) {
      throw new Error("cannot issue multiple statements with Initialized");
    }
    await this._authenticate();
    await this._loadLMSLaunchData();
    await this.sendActivityStatement({ verb: VERB_INITIALIZED });
    this.updateState({
      ...this._state,
      start: new Date(),
    });
  }

  async passed(p: PassedParams): Promise<void> {
    if (this.state.start == undefined) {
      throw new Error("not initialized");
    }
    if (this.state.statements.find((s) => s.verb.id === VERB_PASSED)) {
      throw new Error("only one passed statement is allowed per registration");
    }
    const lms = this.state.lmsLaunchData.contents || {};
    await this.sendActivityStatement({
      verb: VERB_PASSED,
      context: {
        contextActivities: {
          category: [Cmi5ContextActivity.MOVE_ON],
        },
        extensions: {
          ...p.contextExtensions,
          ...(lms.masteryScore
            ? Cmi5ContextActivity.MASTERY(lms.masteryScore)
            : {}),
        },
      },
      result: {
        success: true,
        duration: getISODuration(this.state.start),
        score: toScore(p.score),
        extensions: p.resultExtensions,
      },
    });
  }

  async failed(p: PassedParams): Promise<void> {
    if (!this.state.start) {
      throw new Error("not initialized");
    }
    if (this.state.statements.find((s) => s.verb.id === VERB_PASSED)) {
      throw new Error("a failed statement must not follow a passed statement");
    }
    const lms = this.state.lmsLaunchData.contents || {};
    await this.sendActivityStatement({
      verb: VERB_FAILED,
      context: {
        contextActivities: {
          category: [Cmi5ContextActivity.MOVE_ON],
        },
        extensions: {
          ...p.contextExtensions,
          ...(lms.masteryScore
            ? Cmi5ContextActivity.MASTERY(lms.masteryScore)
            : {}),
        },
      },
      result: {
        success: false,
        duration: getISODuration(this.state.start),
        score: toScore(p.score),
        extensions: p.resultExtensions,
      },
    });
  }

  async completed(extensions?: Extensions): Promise<void> {
    if (!this.state.start) {
      throw new Error("not initialized");
    }
    if (this.state.statements.find((s) => s.verb.id === VERB_COMPLETED)) {
      throw new Error(
        "only one completed statement is allowed per registration"
      );
    }
    const s = this.state.statements.find(
      (s) => s.verb.id === VERB_PASSED || s.verb.id === VERB_FAILED
    );
    await this.sendActivityStatement({
      ...extensions,
      verb: VERB_COMPLETED,
      context: {
        contextActivities: {
          category: [Cmi5ContextActivity.MOVE_ON],
        },
        extensions: {
          ...extensions,
        },
      },
      result: {
        success: s ? s.verb.id === VERB_PASSED : undefined,
        duration: getISODuration(this.state.start),
        score: s ? s.result?.score : undefined,
        completion: true,
      },
    });
  }

  async moveOn(p: PassedParams): Promise<void> {
    if (!this.state.start) {
      throw new Error("not initialized");
    }
    if (!this.state.lmsLaunchData) {
      throw new Error("no LMS data");
    }
    const lms = this.state.lmsLaunchData.contents || {};
    const masteryScore = lms.masteryScore || 0;
    const moveOn = lms.moveOn || "NotApplicable";
    const passed = p.score >= masteryScore;

    if (!passed) {
      await this.failed(p);
    }
    switch (moveOn) {
      case "Passed":
        if (!passed) {
          break;
        }
        await this.passed(p);
        break;
      case "Completed":
        await this.completed(p.contextExtensions);
        break;
      case "CompletedAndPassed":
        if (!passed) {
          break;
        }
        await this.passed(p);
        await this.completed(p.contextExtensions);
        break;
      case "CompletedOrPassed":
        if (passed) {
          await this.passed(p);
        } else {
          await this.completed(p.contextExtensions);
        }
        break;
      default:
        await this.completed(p.contextExtensions);
    }
    await this.terminate();
  }

  async terminate(): Promise<void> {
    if (!this.state.start) {
      throw new Error("not initialized");
    }
    if (this.state.statements.find((s) => s.verb.id === VERB_TERMINATED)) {
      return;
    }
    await this.sendActivityStatement({
      verb: VERB_TERMINATED,
      result: { duration: getISODuration(this.state.start) },
    });
  }

  async _authenticate(): Promise<void> {
    this.updateState({
      ...this._state,
      authStatus: AUTH_STATUS_IN_PROGRESS,
    });
    const res = await axios.post(this.params.fetch);
    const accessToken = res.data["auth-token"];
    if (!accessToken) {
      this.updateState({
        ...this._state,
        authStatus: AUTH_STATUS_FAILED,
      });
      throw new Error(
        `invalid response from fetch ${this.params.fetch}: ${res.data}`
      );
    }
    const [username, password] = Buffer.from(accessToken, "base64")
      .toString("ascii")
      .split(":");
    this._lrs = newLrs({
      endpoint: this.params.endpoint,
      username,
      password,
    });
    this.updateState({
      ...this._state,
      authStatus: AUTH_STATUS_SUCCESS,
      accessToken,
    });
  }

  async _loadLMSLaunchData(): Promise<void> {
    if (!this.state.accessToken) {
      throw new Error("fetch data LRS credential was not loaded");
    }
    this.updateState({
      ...this._state,
      activityStatus: ACTIVITY_STATUS_IN_PROGRESS,
    });
    const res = await this._lrs?.fetchActivityState({
      stateId: STATE_LMS_LAUNCHDATA,
      activityId: this.params.activityId,
      agent: this.params.actor,
      registration: this.params.registration,
    });
    if (!res) {
      this.updateState({
        ...this._state,
        activityStatus: ACTIVITY_STATUS_FAILED,
      });
      throw new Error(`invalid response from load LMS launch data: ${res}`);
    }
    this.updateState({
      ...this._state,
      activityStatus: ACTIVITY_STATUS_SUCCESS,
      lmsLaunchData: res,
    });
  }
}

export class Cmi5 {
  static reset(): void {
    _cmi = null;
    _url = "";
  }

  static get isCmiAvailable(): boolean {
    if (Cmi5.exists) {
      return true;
    }
    if (!window || typeof window !== "object") {
      return false;
    }
    if (!window.location || typeof window.location.search !== "string") {
      return false;
    }
    return hasCmi5Params(new URLSearchParams(window.location.search));
  }

  static get url(): string {
    return _url || typeof window !== "undefined" ? window.location.href : "";
  }

  static get exists(): boolean {
    return _cmi ? true : false;
  }

  static get(url = ""): Cmi5Service {
    if (!_cmi) {
      _url = url || Cmi5.url;
      const p = new URLSearchParams(new URL(_url).search);
      if (!hasCmi5Params(p)) {
        throw new Error(`url does not have all required cmi5 params: ${_url}`);
      }
      _cmi = new _CmiService({
        actor: JSON.parse(`${p.get("actor")}`) as Agent,
        activityId: `${p.get("activityId")}`,
        endpoint: `${p.get("endpoint")}`,
        fetch: `${p.get("fetch")}`,
        registration: `${p.get("registration")}`,
      });
    }
    return _cmi;
  }
}
