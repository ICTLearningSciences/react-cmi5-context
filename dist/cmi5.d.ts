import { Agent, Extensions, Statement, Score, Verb } from "@gradiant/xapi-dsl";
import { ActivityState } from "./xapi";
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
export declare class Cmi5 {
  static reset(): void;
  static get isCmiAvailable(): boolean;
  static get url(): string;
  static get exists(): boolean;
  static get(url?: string): Cmi5Service;
}
export {};
