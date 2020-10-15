import { Actor, Statement } from "@gradiant/xapi-dsl";
export interface ActivityState {
  contentType?: string;
  contents?: ActivityContents;
  etag?: string;
  id?: string;
  updated?: boolean;
}
export interface ActivityContents {
  contextTemplate?: any;
  launchMode?: string;
  moveOn?: string;
  masteryScore?: number;
  returnURL?: string;
}
export interface FetchActivityStateParams {
  activityId: string;
  agent: Actor;
  registration: string;
  stateId: string;
}
export interface LRS {
  fetchActivityState(params: FetchActivityStateParams): Promise<ActivityState>;
  saveStatements(statements: Statement[]): Promise<string[]>;
}
export interface FetchStatementsParams {
  activity?: string;
  agent: Actor;
  ascending?: string;
  format?: string;
  limit?: number;
  registration?: string;
  related_agents?: string;
  since?: string;
  until?: string;
  verb?: string;
}
export interface StatementResult {
  statements: Statement[];
  more?: string;
}
interface NewLRSParams {
  username: string;
  password: string;
  endpoint: string;
}
export declare function newLrs(p: NewLRSParams): LRS;
export {};
