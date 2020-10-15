/*
Government Purpose Rights (“GPR”)
Contract No.  W911NF-14-D-0005
Contractor Name:   University of Southern California
Contractor Address:  3720 S. Flower Street, 3rd Floor, Los Angeles, CA 90089-0001
Expiration Date:  Restrictions do not expire, GPR is perpetual
Restrictions Notice/Marking: The Government's rights to use, modify, reproduce, release, perform, display, or disclose this software are restricted by paragraph (b)(2) of the Rights in Noncommercial Computer Software and Noncommercial Computer Software Documentation clause contained in the above identified contract.  No restrictions apply after the expiration date shown above. Any reproduction of the software or portions thereof marked with this legend must also reproduce the markings. (see: DFARS 252.227-7014(f)(2)) 

No Commercial Use: This software shall be used for government purposes only and shall not, without the express written permission of the party whose name appears in the restrictive legend, be used, modified, reproduced, released, performed, or displayed for any commercial purpose or disclosed to a person other than subcontractors, suppliers, or prospective subcontractors or suppliers, who require the software to submit offers for, or perform, government contracts.  Prior to disclosing the software, the Contractor shall require the persons to whom disclosure will be made to complete and sign the non-disclosure agreement at 227.7103-7.  (see DFARS 252.227-7025(b)(2))
*/
const path = require("path");
const fs = require("fs-extra");
const appRoot = require("app-root-path").path;

async function installCmi5Lib() {
  const libPath = path.join(
    appRoot,
    "node_modules",
    "react-cmi5-context",
    "lib",
    "cmi5.js"
  );
  try {
    if (!(await fs.exists(libPath))) {
      console.warn(
        `react-cmi5-context should install client lib 'cmi5.js' to public in the react project where it is installed, but library not found at ${libPath}`
      );
      // we probably are inside the react-cmi project itself and did `npm install`
      // there's no reason to do this library install in that context.
      // The library install is for clients/projects that *use* react-cmi5-context
      return;
    }
    const packagePath = path.join(appRoot, "package.json");
    const dependencies =
      ((await fs.exists(packagePath))
        ? require(packagePath).dependencies
        : {}) || {};
    const publicDir = "gatsby" in dependencies ? "static" : "public";
    const tgtPath = path.join(appRoot, publicDir, "cmi5.js");
    console.log(
      `react-cmi5-context will attempt to install client lib from ${libPath} to ${tgtPath}...`
    );
    await fs.ensureDir(path.dirname(tgtPath));
    await fs.copyFile(libPath, tgtPath);
  } catch (err) {
    console.error(`failed to install cmi5.js lib with error ${err.message}`);
  }
}

installCmi5Lib();
