import { Cmi5, Cmi5Service } from "../../src/cmi5";
import {
  AUTH_STATUS_SUCCESS,
  AUTH_STATUS_NONE,
  AUTH_STATUS_FAILED,
  STATE_LMS_LAUNCHDATA,
  ACTIVITY_STATUS_SUCCESS,
  VERB_INITIALIZED,
  VERB_PASSED,
  VERB_FAILED,
  VERB_COMPLETED,
  VERB_TERMINATED,
} from "../../src/constants";
import { MockCmi5Helper, DEFAULT_CMI5_PARAMS } from "../helpers";
import * as xapi from "../../src/xapi";
jest.mock("../../src/xapi");

async function start(mockCmi5: MockCmi5Helper): Promise<Cmi5Service> {
  mockCmi5.mockLocation();
  mockCmi5.mockFetch();
  const cmi5 = Cmi5.get();
  await cmi5.start();
  return cmi5;
}

function expectActivityStatement(
  cmi5: Cmi5Service,
  verb: string,
  additionalProps: Record<string, any> = {}
) {
  return expect.objectContaining({
    actor: cmi5.params.actor,
    context: expect.objectContaining({
      registration: cmi5.params.registration,
    }),
    object: expect.objectContaining({
      id: cmi5.params.activityId,
    }),
    verb: expect.objectContaining({
      id: verb,
    }),
    ...(additionalProps || {}),
  });
}

describe("Cmi5", () => {
  let mockCmi5: MockCmi5Helper;

  beforeEach(() => {
    mockCmi5 = new MockCmi5Helper();
  });

  afterEach(() => {
    mockCmi5.restore();
    Cmi5.reset();
  });

  describe("get", () => {
    it("makes a new Cmi5 given a url", async () => {
      const cmi5 = Cmi5.get(mockCmi5.url.toString());
      expect(cmi5.params).toEqual(DEFAULT_CMI5_PARAMS);
    });
  });

  describe("isCmiAvailable", () => {
    it("returns false when any required cmi query params are missing from window.location", async () => {
      expect(Cmi5.isCmiAvailable).toBe(false);
    });
    it("returns true when all required cmi query params set in window.location", async () => {
      mockCmi5.mockLocation();
      expect(Cmi5.isCmiAvailable).toBe(true);
    });
  });

  describe("start", () => {
    it("authenticates using the cmi5 fetch param", async () => {
      const cmi5 = await start(mockCmi5);
      expect(cmi5.state.authStatus).toEqual(AUTH_STATUS_SUCCESS);
      expect(cmi5.state.accessToken).toEqual(
        // the access token must have the format of Http basic auth
        Buffer.from(
          `${mockCmi5.accessTokenUsername}:${mockCmi5.accessTokenPassword}`,
          "ascii"
        ).toString("base64")
      );
    });
    it("updates AUTH_STATUS if auth failed", async () => {
      mockCmi5.mockLocation();
      mockCmi5.mockFetch(true);
      const cmi5 = Cmi5.get();
      expect(cmi5.state.authStatus).toEqual(AUTH_STATUS_NONE);
      try {
        await cmi5.start();
        throw new Error();
      } catch (e) {
        expect(cmi5.state.authStatus).toEqual(AUTH_STATUS_FAILED);
      }
    });
    it("initializes an lrs client with username and password from access token", async () => {
      // would be more end-to-end
      // if we instead tested the actual headers
      // sent on subsequent xapi POST statements,
      // but much tricker to spy on XHR
      await start(mockCmi5);
      expect(mockCmi5.mockNewLrs).toHaveBeenCalledWith({
        endpoint: mockCmi5.endpoint,
        username: mockCmi5.accessTokenUsername,
        password: mockCmi5.accessTokenPassword,
      });
    });
    it("load the LMS LaunchData state document populated by the LMS", async () => {
      const cmi5 = await start(mockCmi5);
      expect(mockCmi5.mockFetchActivityState).toHaveBeenCalledWith({
        activityId: mockCmi5.activityId,
        agent: mockCmi5.actor,
        registration: mockCmi5.registration,
        stateId: STATE_LMS_LAUNCHDATA,
      });
      expect(cmi5.state.activityStatus).toBe(ACTIVITY_STATUS_SUCCESS);
      expect(cmi5.state.lmsLaunchData).toMatchObject({
        contents: {
          contextTemplate: {
            registration: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          },
          launchMode: "Normal",
          moveOn: "CompletedAndPassed",
          masteryScore: 0.5,
          returnURL: "/returnUrl",
        },
      });
    });
    it("posts cmi5 INITIALIZED statement", async () => {
      const cmi5 = await start(mockCmi5);
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_INITIALIZED),
      ]);
    });
    it("cmi5 start statement can only be sent once", async () => {
      const cmi5 = await start(mockCmi5);
      try {
        await cmi5.start();
        throw new Error();
      } catch (e) {
        expect(e.message).toBe(
          "cannot issue multiple statements with Initialized"
        );
      }
    });
  });

  describe("passed", () => {
    it("posts cmi5 PASSED statement", async () => {
      const cmi5 = await start(mockCmi5);
      const score = 0.9;
      cmi5.passed({ score: score });
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_PASSED, {
          context: expect.objectContaining({
            contextActivities: {
              category: [
                {
                  id: "https://w3id.org/xapi/cmi5/context/categories/moveon",
                },
              ],
            },
            extensions: {
              "https://w3id.org/xapi/cmi5/context/extensions/masteryscore": 0.5,
            },
          }),
        }),
      ]);
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_PASSED, {
          result: expect.objectContaining({
            success: true,
            duration: expect.stringMatching(
              /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
            ),
            score: expect.objectContaining({
              scaled: score,
            }),
          }),
        }),
      ]);
    });
    it("passed statement cannot be sent before init", async () => {
      mockCmi5.mockLocation();
      mockCmi5.mockFetch();
      const cmi5 = Cmi5.get();
      const score = 0.9;
      try {
        await cmi5.passed({ score: score });
        throw new Error();
      } catch (e) {
        expect(e.message).toBe("not initialized");
      }
    });
    it("passed statement can only be sent once", async () => {
      const cmi5 = await start(mockCmi5);
      const score = 0.9;
      await cmi5.passed({ score: score });
      try {
        await cmi5.passed({ score: score });
        throw new Error();
      } catch (e) {
        expect(e.message).toBe(
          "only one passed statement is allowed per registration"
        );
      }
    });
  });

  describe("failed", () => {
    it("posts cmi5 FAILED statement", async () => {
      const cmi5 = await start(mockCmi5);
      const score = 0.1;
      cmi5.failed({ score: score });
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_FAILED, {
          context: expect.objectContaining({
            contextActivities: {
              category: [
                {
                  id: "https://w3id.org/xapi/cmi5/context/categories/moveon",
                },
              ],
            },
            extensions: {
              "https://w3id.org/xapi/cmi5/context/extensions/masteryscore": 0.5,
            },
          }),
        }),
      ]);
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_FAILED, {
          result: expect.objectContaining({
            success: false,
            duration: expect.stringMatching(
              /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
            ),
            score: expect.objectContaining({
              scaled: score,
            }),
          }),
        }),
      ]);
    });
    it("can send multiple failed statements", async () => {
      const cmi5 = await start(mockCmi5);
      await cmi5.failed({ score: 0.1 });
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_FAILED, {
          result: expect.objectContaining({
            success: false,
            score: expect.objectContaining({
              scaled: 0.1,
            }),
          }),
        }),
      ]);
      await cmi5.failed({ score: 0.2 });
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_FAILED, {
          result: expect.objectContaining({
            success: false,
            score: expect.objectContaining({
              scaled: 0.2,
            }),
          }),
        }),
      ]);
    });
    it("failed statement cannot be sent before init", async () => {
      mockCmi5.mockLocation();
      mockCmi5.mockFetch();
      const cmi5 = Cmi5.get();
      const score = 0.9;
      try {
        await cmi5.failed({ score: score });
        throw new Error();
      } catch (e) {
        expect(e.message).toBe("not initialized");
      }
    });
    it("failed statement cannot be sent after passed", async () => {
      const cmi5 = await start(mockCmi5);
      const score = 0.9;
      await cmi5.passed({ score: score });
      try {
        await cmi5.failed({ score: score });
        throw new Error();
      } catch (e) {
        expect(e.message).toBe(
          "a failed statement must not follow a passed statement"
        );
      }
    });
  });

  describe("completed", () => {
    it("posts cmi5 COMPLETED statement", async () => {
      const cmi5 = await start(mockCmi5);
      cmi5.completed();
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_COMPLETED, {
          context: expect.objectContaining({
            contextActivities: {
              category: [
                {
                  id: "https://w3id.org/xapi/cmi5/context/categories/moveon",
                },
              ],
            },
          }),
        }),
      ]);
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_COMPLETED, {
          result: expect.objectContaining({
            success: undefined,
            duration: expect.stringMatching(
              /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
            ),
            score: undefined,
            completion: true,
          }),
        }),
      ]);
    });
    it("posts cmi5 COMPLETED statement after PASSED statement", async () => {
      const cmi5 = await start(mockCmi5);
      const score = 0.9;
      cmi5.passed({ score: score });
      cmi5.completed();
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_COMPLETED, {
          result: expect.objectContaining({
            success: true,
            duration: expect.stringMatching(
              /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
            ),
            score: expect.objectContaining({
              scaled: score,
            }),
            completion: true,
          }),
        }),
      ]);
    });
    it("posts cmi5 COMPLETED statement after FAILED statement", async () => {
      const cmi5 = await start(mockCmi5);
      const score = 0.1;
      cmi5.failed({ score: score });
      cmi5.completed();
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_COMPLETED, {
          result: expect.objectContaining({
            success: false,
            duration: expect.stringMatching(
              /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
            ),
            score: expect.objectContaining({
              scaled: score,
            }),
            completion: true,
          }),
        }),
      ]);
    });
    it("completed statement cannot be sent before init", async () => {
      mockCmi5.mockLocation();
      mockCmi5.mockFetch();
      const cmi5 = Cmi5.get();
      try {
        await cmi5.completed();
        throw new Error();
      } catch (e) {
        expect(e.message).toBe("not initialized");
      }
    });
    it("completed statement can only be sent once", async () => {
      const cmi5 = await start(mockCmi5);
      await cmi5.completed();
      try {
        await cmi5.completed();
        throw new Error();
      } catch (e) {
        expect(e.message).toBe(
          "only one completed statement is allowed per registration"
        );
      }
    });
  });

  describe("moveOn", () => {
    it("passes and completes with CompletedAndPassed", async () => {
      const cmi5 = await start(mockCmi5);
      const score = 0.9;
      await cmi5.moveOn({ score });
      expect(cmi5.state.lmsLaunchData).toMatchObject({
        contents: {
          contextTemplate: {
            registration: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          },
          launchMode: "Normal",
          moveOn: "CompletedAndPassed",
          masteryScore: 0.5,
          returnURL: "/returnUrl",
        },
      });
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_PASSED, {
          result: expect.objectContaining({
            success: true,
            duration: expect.stringMatching(
              /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
            ),
            score: expect.objectContaining({
              scaled: score,
            }),
          }),
        }),
      ]);
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_COMPLETED, {
          result: expect.objectContaining({
            success: true,
            duration: expect.stringMatching(
              /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
            ),
            score: expect.objectContaining({
              scaled: score,
            }),
            completion: true,
          }),
        }),
      ]);
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_TERMINATED, {
          result: expect.objectContaining({
            duration: expect.stringMatching(
              /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
            ),
          }),
        }),
      ]);
    });
    it("fails CompletedAndPassed if score < masteryScore", async () => {
      const cmi5 = await start(mockCmi5);
      const score = 0.1;
      await cmi5.moveOn({ score });
      expect(cmi5.state.lmsLaunchData).toMatchObject({
        contents: {
          contextTemplate: {
            registration: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          },
          launchMode: "Normal",
          moveOn: "CompletedAndPassed",
          masteryScore: 0.5,
          returnURL: "/returnUrl",
        },
      });
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_FAILED, {
          result: expect.objectContaining({
            success: false,
            duration: expect.stringMatching(
              /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
            ),
            score: expect.objectContaining({
              scaled: score,
            }),
          }),
        }),
      ]);
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_TERMINATED, {
          result: expect.objectContaining({
            duration: expect.stringMatching(
              /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
            ),
          }),
        }),
      ]);
    });
  });

  describe("terminate", () => {
    it("posts cmi5 TERMINATED statement", async () => {
      const cmi5 = await start(mockCmi5);
      cmi5.terminate();
      expect(mockCmi5.mockSaveStatements).toHaveBeenCalledWith([
        expectActivityStatement(cmi5, VERB_TERMINATED, {
          result: expect.objectContaining({
            duration: expect.stringMatching(
              /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
            ),
          }),
        }),
      ]);
    });
    it("terminated statement cannot be sent before init", async () => {
      mockCmi5.mockLocation();
      mockCmi5.mockFetch();
      const cmi5 = Cmi5.get();
      try {
        await cmi5.terminate();
        throw new Error();
      } catch (e) {
        expect(e.message).toBe("not initialized");
      }
    });
  });

  describe("onStateUpdate", () => {
    it("calls callback functions when any state change occurs", async () => {
      mockCmi5.mockLocation();
      mockCmi5.mockFetch();
      const cmi5 = Cmi5.get();
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      cmi5.onStateUpdate(cb1);
      cmi5.onStateUpdate(cb2);
      await cmi5.start();
      expect(cb1).toHaveBeenCalled();
      expect(cb2).toHaveBeenCalled();
    });
    it("unregisters callback functions", async () => {
      mockCmi5.mockLocation();
      mockCmi5.mockFetch();
      const cmi5 = Cmi5.get();
      const cb = jest.fn();
      cmi5.onStateUpdate(cb);
      cmi5.onStateUpdate(cb);
      await cmi5.start();
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
