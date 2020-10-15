import React from "react";
import { screen } from "@testing-library/dom";
import { render } from "@testing-library/react";
import {
  Context,
  Cmi5Context,
  Cmi5Status,
  Provider as Cmi5Provider,
} from "../../src";
import { MockCmi5Helper } from "../helpers";
// eslint-disable-next-line
const TinCan = require("tincanjs");
TinCan.DEBUG = true;

function CmiStatus(): JSX.Element {
  const cmi = React.useContext<Cmi5Context>(Context);
  return <div data-testid="cmiStatus">{cmi.cmiStatus}</div>;
}

describe("<Cmi5Provider>", () => {
  let mockCmi5: MockCmi5Helper;

  beforeEach(() => {
    mockCmi5 = new MockCmi5Helper();
  });

  afterEach(() => {
    mockCmi5.restore();
  });

  describe("cmi5Status", () => {
    it("has initial value NONE", async () => {
      render(
        <Cmi5Provider>
          <CmiStatus />
        </Cmi5Provider>
      );
      expect(screen.getByTestId("cmiStatus").textContent).toBe(Cmi5Status.NONE);
    });

    it("initializes automatically when cmi query params are present", async () => {
      mockCmi5.mockLocation();
      render(
        <Cmi5Provider>
          <CmiStatus />
        </Cmi5Provider>
      );
      expect((await screen.findByTestId("cmiStatus")).textContent).toBe(
        Cmi5Status.START_IN_PROGRESS
      );
    });
  });
});
