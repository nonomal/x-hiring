import { describe, expect, it } from "vite-plus/test";
import { analyzeJob, type WorkersAiBinding } from "./index";

function fakeAi(
  response: unknown,
  onRun?: (input: Record<string, unknown>, options?: Record<string, unknown>) => void,
): WorkersAiBinding {
  return {
    run: async (_model, input, options) => {
      onRun?.(input, options);
      return response;
    },
  };
}

const validResponse = {
  response: JSON.stringify({
    valid: true,
    workType: " 全职 ",
    location: " 深圳 ",
    role: " 前端工程师 ",
    salary: " 20-30K ",
    education: " 本科 ",
    title: " React 工程师 ",
    content: " 负责前端开发。 ",
    tags: ["前端", " React ", "前端"],
  }),
};

describe("analyzeJob", () => {
  it("uses AI SDK structured output and normalizes the result", async () => {
    let input: Record<string, unknown> | undefined;
    const result = await analyzeJob(
      fakeAi(validResponse, (receivedInput) => {
        input = receivedInput;
      }),
      "招聘 React 工程师",
      "@cf/openai/gpt-oss-120b",
    );

    expect(result).toEqual({
      valid: true,
      workType: "全职",
      location: "深圳",
      role: "前端工程师",
      salary: "20-30K",
      education: "本科",
      title: "React 工程师",
      content: "负责前端开发。",
      tags: ["前端", "React"],
    });
    expect(input?.response_format).toMatchObject({ type: "json_schema" });
  });

  it("passes AI Gateway options to the Workers AI binding", async () => {
    let receivedOptions: Record<string, unknown> | undefined;
    await analyzeJob(
      fakeAi(validResponse, (_input, options) => {
        receivedOptions = options;
      }),
      "招聘后端工程师",
      "model",
      {
        gateway: {
          id: "default",
          cacheTtl: 86400,
          collectLog: true,
          metadata: { service: "test" },
        },
      },
    );

    expect(receivedOptions?.gateway).toEqual({
      id: "default",
      cacheTtl: 86400,
      collectLog: true,
      metadata: { service: "test" },
    });
  });

  it("retries a failed structured response with the Gateway cache bypassed", async () => {
    let attempts = 0;
    let retryOptions: Record<string, unknown> | undefined;
    const ai: WorkersAiBinding = {
      run: async (_model, _input, options) => {
        attempts += 1;
        if (attempts === 2) retryOptions = options;
        if (attempts === 1) return { response: "not-json" };
        return validResponse;
      },
    };

    const result = await analyzeJob(ai, "招聘后端工程师", "model", {
      gateway: { id: "default", collectLog: true },
    });

    expect(result.valid).toBe(true);
    expect(attempts).toBe(2);
    expect(retryOptions?.gateway).toMatchObject({
      id: "default",
      skipCache: true,
    });
  });

  it("fails after the explicit retry budget is exhausted", async () => {
    let attempts = 0;
    await expect(
      analyzeJob(
        fakeAi({ response: "not-json" }, () => {
          attempts += 1;
        }),
        "content",
        "model",
      ),
    ).rejects.toThrow();
    expect(attempts).toBe(2);
  });
});
