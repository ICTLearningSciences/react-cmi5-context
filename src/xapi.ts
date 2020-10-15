/*
Government Purpose Rights (“GPR”)
Contract No.  W911NF-14-D-0005
Contractor Name:   University of Southern California
Contractor Address:  3720 S. Flower Street, 3rd Floor, Los Angeles, CA 90089-0001
Expiration Date:  Restrictions do not expire, GPR is perpetual
Restrictions Notice/Marking: The Government's rights to use, modify, reproduce, release, perform, display, or disclose this software are restricted by paragraph (b)(2) of the Rights in Noncommercial Computer Software and Noncommercial Computer Software Documentation clause contained in the above identified contract.  No restrictions apply after the expiration date shown above. Any reproduction of the software or portions thereof marked with this legend must also reproduce the markings. (see: DFARS 252.227-7014(f)(2)) 
No Commercial Use: This software shall be used for government purposes only and shall not, without the express written permission of the party whose name appears in the restrictive legend, be used, modified, reproduced, released, performed, or displayed for any commercial purpose or disclosed to a person other than subcontractors, suppliers, or prospective subcontractors or suppliers, who require the software to submit offers for, or perform, government contracts.  Prior to disclosing the software, the Contractor shall require the persons to whom disclosure will be made to complete and sign the non-disclosure agreement at 227.7103-7.  (see DFARS 252.227-7025(b)(2))
*/
import { Actor, Statement } from "@gradiant/xapi-dsl";
import { InvalidXapiFormatError } from "./errors";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TinCan = require("tincanjs");

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

class TinCanLRS implements LRS {
  _lrs: any;

  constructor(p: NewLRSParams) {
    this._lrs = new TinCan.LRS({
      ...p,
      allowFail: false,
    });
  }

  fetchActivityState(params: FetchActivityStateParams): Promise<ActivityState> {
    return new Promise((resolve, reject) => {
      this._lrs.retrieveState(params.stateId, {
        activity: new TinCan.Activity({
          id: params.activityId,
        }),
        agent: new TinCan.Agent(params.agent),
        registration: params.registration,
        // eslint-disable-next-line
        callback: (err: Error, state: any) => {
          if (err) {
            return reject(err);
          }
          return resolve(
            !state
              ? {}
              : typeof state.asVersion === "function"
              ? state.asVersion()
              : state
          );
        },
      });
    });
  }

  saveStatements(statements: Statement[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
      let tcStatements = null;
      try {
        tcStatements = statements.map((s) => new TinCan.Statement(s));
      } catch (err) {
        return reject(new InvalidXapiFormatError(err.message));
      }
      this._lrs.saveStatements(tcStatements, {
        callback: (err: any, xhr: { response: string }) => {
          if (err) {
            return reject(err);
          }
          const ids =
            typeof xhr.response === "string"
              ? (JSON.parse(xhr.response) as string[])
              : (xhr.response as string[]);
          return resolve(ids);
        },
      });
    });
  }
}

interface NewLRSParams {
  username: string;
  password: string;
  endpoint: string;
}

export function newLrs(p: NewLRSParams): LRS {
  return new TinCanLRS(p);
}
