/*
Government Purpose Rights (“GPR”)
Contract No.  W911NF-14-D-0005
Contractor Name:   University of Southern California
Contractor Address:  3720 S. Flower Street, 3rd Floor, Los Angeles, CA 90089-0001
Expiration Date:  Restrictions do not expire, GPR is perpetual
Restrictions Notice/Marking: The Government's rights to use, modify, reproduce, release, perform, display, or disclose this software are restricted by paragraph (b)(2) of the Rights in Noncommercial Computer Software and Noncommercial Computer Software Documentation clause contained in the above identified contract.  No restrictions apply after the expiration date shown above. Any reproduction of the software or portions thereof marked with this legend must also reproduce the markings. (see: DFARS 252.227-7014(f)(2)) 

No Commercial Use: This software shall be used for government purposes only and shall not, without the express written permission of the party whose name appears in the restrictive legend, be used, modified, reproduced, released, performed, or displayed for any commercial purpose or disclosed to a person other than subcontractors, suppliers, or prospective subcontractors or suppliers, who require the software to submit offers for, or perform, government contracts.  Prior to disclosing the software, the Contractor shall require the persons to whom disclosure will be made to complete and sign the non-disclosure agreement at 227.7103-7.  (see DFARS 252.227-7025(b)(2))
*/
const DEFAULT_ACCESS_TOKEN_USERNAME = "testuser";
const DEFAULT_ACCESS_TOKEN_PASSWORD = "testpassword";
const DEFAULT_CMI5_PARAMS = {
  actor: {
    objectType: "Agent",
    account: {
      homePage: "http://example.com/users",
      name: DEFAULT_ACCESS_TOKEN_PASSWORD,
    },
    name: DEFAULT_ACCESS_TOKEN_USERNAME,
  },
  activityId: "http://example.com/activity-id",
  endpoint: "/xapi/",
  fetch: "http://example.com/fetch",
  registration: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
};

function url() {
  let url = `/?activityId=${DEFAULT_CMI5_PARAMS.activityId}`;
  url += `&actor=${JSON.stringify(DEFAULT_CMI5_PARAMS.actor)}`;
  url += `&endpoint=${DEFAULT_CMI5_PARAMS.endpoint}`;
  url += `&fetch=${DEFAULT_CMI5_PARAMS.fetch}`;
  url += `&registration=${DEFAULT_CMI5_PARAMS.registration}`;
  return url;
}

describe("Cmi5 example", () => {
  beforeEach(() => {
    cy.server();
    cy.route("POST", "**/fetch", {
      "auth-token": Buffer.from(`testuser:testpassword`).toString("base64"),
    }).as("fetch");
    cy.route("POST", `**/xapi/statements`, [
      "8caa7d88-afa9-4de9-a7fa-aa67002bd592",
    ]);
    cy.route("GET", `**/activities/state/**`, {
      contents: {
        contextTemplate: {
          registration: "28f5a669-31c5-4200-8e39-876c3a556de9",
        },
        moveOn: "CompletedOrPassed",
        launchMode: "Normal",
        masteryScore: 0.85,
        returnURL: "edu.usc.ict.pal3://",
      },
    }).as("lms");
  });

  it("launched with missing cmi5 params displays which params are missing", () => {
    cy.visit("/");
    cy.get("#cmi5-params").contains("Missing cmi5 parameter actor");
    cy.get("#cmi5-params").contains("Missing cmi5 parameter activityId");
    cy.get("#cmi5-params").contains("Missing cmi5 parameter endpoint");
    cy.get("#cmi5-params").contains("Missing cmi5 parameter fetch");
    cy.get("#cmi5-params").contains("Missing cmi5 parameter registration");
  });

  it("shows cmi5 params", () => {
    cy.visit(url());
    cy.get("#cmi5-params").contains(
      'actor: {"objectType":"Agent","account":{"homePage":"http://example.com/users","name":"testpassword"},"name":"testuser"}'
    );
    cy.get("#cmi5-params").contains(
      "activityId: http://example.com/activity-id"
    );
    cy.get("#cmi5-params").contains("endpoint: /xapi");
    cy.get("#cmi5-params").contains("fetch: http://example.com/fetch");
    cy.get("#cmi5-params").contains(
      "registration: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    );
  });

  it("shows auth status", () => {
    cy.visit(url());
    // cy.get("#auth").contains("Status: Not Authorized");
    cy.wait("@fetch");
    cy.get("#auth").contains("Status: Authorized");
  });

  it("shows activity state", () => {
    cy.visit(url());
    cy.wait("@lms");
    cy.get("#activity").contains("moveOn: CompletedOrPassed");
    cy.get("#activity").contains("masteryScore: 0.85");
    cy.get("#activity").contains("returnURL: edu.usc.ict.pal3://");
  });

  it("sends passing score", () => {
    cy.visit(url());
    cy.get("#pass").should("be.disabled");
    cy.get("#score").clear().type("1");
    cy.get("#pass").click();
  });

  it("sends failing score", () => {
    cy.visit(url());
    cy.get("#fail").click();
  });
});
