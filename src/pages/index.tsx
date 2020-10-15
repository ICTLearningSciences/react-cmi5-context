/*
Government Purpose Rights (“GPR”)
Contract No.  W911NF-14-D-0005
Contractor Name:   University of Southern California
Contractor Address:  3720 S. Flower Street, 3rd Floor, Los Angeles, CA 90089-0001
Expiration Date:  Restrictions do not expire, GPR is perpetual
Restrictions Notice/Marking: The Government's rights to use, modify, reproduce, release, perform, display, or disclose this software are restricted by paragraph (b)(2) of the Rights in Noncommercial Computer Software and Noncommercial Computer Software Documentation clause contained in the above identified contract.  No restrictions apply after the expiration date shown above. Any reproduction of the software or portions thereof marked with this legend must also reproduce the markings. (see: DFARS 252.227-7014(f)(2)) 

No Commercial Use: This software shall be used for government purposes only and shall not, without the express written permission of the party whose name appears in the restrictive legend, be used, modified, reproduced, released, performed, or displayed for any commercial purpose or disclosed to a person other than subcontractors, suppliers, or prospective subcontractors or suppliers, who require the software to submit offers for, or perform, government contracts.  Prior to disclosing the software, the Contractor shall require the persons to whom disclosure will be made to complete and sign the non-disclosure agreement at 227.7103-7.  (see DFARS 252.227-7025(b)(2))
*/
import React, { useEffect, useState } from "react";
import Helmet from "react-helmet";
import {
  Button,
  // List,
  // ListItem,
  // ListItemText,
  TextField,
  Typography,
} from "@material-ui/core";
// import { Cmi5 } from "react-cmi5-context";
import Cmi5 from "@xapi/cmi5";

let cmi5: Cmi5;

export const Index: React.FC = () => {
  const [score, setScore] = useState(0);
  // const [state, setState] = useState();

  useEffect(() => {
    try {
      // cmi5.onStateUpdate(() => {
      //   setState(Cmi5.get().state);
      // });
      cmi5 = new Cmi5();
      cmi5.initialize();
    } catch (e) {
      console.error(e);
    }
  }, []);

  function onInput(e: React.BaseSyntheticEvent) {
    if (isNaN(e.target.value)) {
      return;
    }
    if (parseFloat(e.target.value) > 1) {
      return;
    }
    setScore(e.target.value);
  }

  function onMoveOn() {
    throw new Error("move on not implemented");
    // Cmi5.get().moveOn({ score });
  }

  async function onPass() {
    await cmi5.pass(score);
    await cmi5.complete();
    await cmi5.terminate();
  }

  async function onFail() {
    await cmi5.fail(score);
    await cmi5.complete();
    await cmi5.terminate();
  }

  function cmiParam(search: URLSearchParams, p: string) {
    const param = search.get(p);
    if (!param) {
      return <Typography color="error">Missing cmi5 parameter {p}</Typography>;
    }
    return (
      <Typography>
        {p}: {param}
      </Typography>
    );
  }

  function checkParams() {
    const search = typeof window === "undefined" ? "" : window.location.search;
    const p = new URLSearchParams(search);
    return (
      <Typography id="cmi5-params" variant="h5" style={{ padding: 15 }}>
        cmi5 params:
        {cmiParam(p, "actor")}
        {cmiParam(p, "activityId")}
        {cmiParam(p, "endpoint")}
        {cmiParam(p, "fetch")}
        {cmiParam(p, "registration")}
      </Typography>
    );
  }

  function authStatus() {
    if (!cmi5) {
      return;
    }
    return (
      <Typography id="auth" variant="h5" style={{ padding: 15 }}>
        Auth
        <Typography>Status: {cmi5.isAuthenticated}</Typography>
        {/* <Typography>Token: {state.accessToken}</Typography> */}
      </Typography>
    );
  }

  function activityStatus() {
    if (!cmi5?.isAuthenticated) {
      return;
    }
    const lms = cmi5.getLaunchData() || {};
    const moveOn = lms.moveOn || "NotApplicable";
    const masteryScore = lms.masteryScore || "n/a";
    const returnURL = lms.returnURL || "n/a";
    return (
      <Typography id="activity" variant="h5" style={{ padding: 15 }}>
        Activity State:
        {/* <Typography>Status: {state.activityStatus}</Typography> */}
        <Typography>moveOn: {moveOn}</Typography>
        <Typography>masteryScore: {masteryScore}</Typography>
        <Typography>returnURL: {returnURL}</Typography>
      </Typography>
    );
  }

  function grade() {
    if (!cmi5?.isAuthenticated) {
      return;
    }
    // const started = cmi5.get.start.toISOString();
    const lms = cmi5.getLaunchData();
    const mastery: number = lms.masteryScore || 0;
    const moveOn: string = lms.moveOn || "NotApplicable";

    return (
      <div id="grade" style={{ padding: 15 }}>
        <Typography variant="h5">Score:</Typography>
        <TextField id="score" onChange={onInput} value={score} />
        <Button
          id="moveon"
          variant="contained"
          onClick={onMoveOn}
          style={{ marginLeft: 15 }}
          disabled={moveOn == "NotApplicable"}
        >
          Move On
        </Button>
        <Button
          id="pass"
          variant="contained"
          onClick={onPass}
          style={{ marginLeft: 15 }}
          disabled={score < mastery}
        >
          Pass
        </Button>
        <Button
          id="fail"
          variant="contained"
          onClick={onFail}
          style={{ marginLeft: 15 }}
        >
          Fail
        </Button>
        {/* <Typography>Started: {cmi5.isAuthenticated}</Typography> */}
      </div>
    );
  }

  // function statements() {
  //   if (!state.statements) {
  //     return;
  //   }
  //   return (
  //     <Typography id="statements" variant="h5" style={{ padding: 15 }}>
  //       Statements:
  //       <List>
  //         {state.statements.map((s, i) => {
  //           return (
  //             <ListItem key={`${i}`}>
  //               <ListItemText
  //                 primary={`VERB: ${s.verb.id}`}
  //                 secondary={`RESULT: ${JSON.stringify(s.result)}`}
  //               />
  //             </ListItem>
  //           );
  //         })}
  //       </List>
  //     </Typography>
  //   );
  // }

  if (!cmi5) {
    return checkParams();
  }

  return (
    <div>
      <Helmet>
        <script src={"cmi5.js"} type="text/javascript" />
      </Helmet>
      {checkParams()}
      {authStatus()}
      {activityStatus()}
      {grade()}
      {/* {statements()} */}
    </div>
  );
};

export default Index;
