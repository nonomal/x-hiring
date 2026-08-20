import { generateObject } from "ai";
import {
  createWorkersAI,
  type WorkersAISettings,
} from "workers-ai-provider";
import { z } from "zod";

const jobAnalysisSchema = z.object({
  valid: z.boolean().describe("是否为招聘、人才或外包信息"),
  workType: z
    .string()
    .optional()
    .describe("工作类型，例如全职、兼职、远程、外包或实习"),
  location: z.string().optional().describe("工作地点或地域"),
  role: z.string().optional().describe("职位或岗位名称"),
  salary: z.string().optional().describe("薪资或薪资范围，保留原文单位"),
  annualSalary: z.string().optional().describe("年薪或年包，保留原文单位"),
  gender: z.string().optional().describe("性别要求"),
  education: z.string().optional().describe("学历要求"),
  title: z.string().optional().describe("职位核心标题，不包含工作类型前缀"),
  content: z.string().optional().describe("中文招聘摘要"),
  tags: z
    .array(z.string())
    .max(12)
    .optional()
    .describe("这些固定字段之外的补充检索标签，例如年限、语言、行业或技术栈"),
});

export type JobAnalysis = z.infer<typeof jobAnalysisSchema>;

export type WorkersAiRunOptions = {
  gateway?: WorkersAiGatewayOptions;
};

export type WorkersAiGatewayOptions = {
  id: string;
  skipCache?: boolean;
  cacheTtl?: number;
  collectLog?: boolean;
  metadata?: Record<string, string | number | boolean | null>;
};

export interface WorkersAiBinding {
  run(
    model: string,
    input: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
}

const systemPrompt = `你是中文招聘信息分析器。
分析用户提供的内容，判断它是否属于招聘、人才或外包信息，并提取结构化职位信息。
字段含义：workType 表示工作类型；location 表示地点；role 表示岗位；salary 和 annualSalary 分别表示薪资与年薪；gender 表示性别要求；education 表示学历要求；title 表示职位核心标题；content 表示职位摘要；tags 只表示这些字段之外的补充检索标签。
只有原文明确支持时才填写对应字段；无法确定或原文没有提及时省略该字段，不要猜测、补齐或改写成占位值。
非招聘内容将 valid 标记为 false。`;

function normalizeAnalysis(result: JobAnalysis): JobAnalysis {
  return {
    valid: result.valid,
    workType: result.workType?.trim() || undefined,
    location: result.location?.trim() || undefined,
    role: result.role?.trim() || undefined,
    salary: result.salary?.trim() || undefined,
    annualSalary: result.annualSalary?.trim() || undefined,
    gender: result.gender?.trim() || undefined,
    education: result.education?.trim() || undefined,
    title: result.title?.trim() || undefined,
    content: result.content?.trim() || undefined,
    tags: [...new Set((result.tags ?? []).map((tag) => tag.trim()).filter(Boolean))],
  };
}

function assertValidAnalysis(result: JobAnalysis) {
  if (
    result.valid &&
    (!result.workType || !result.title || !result.content)
  ) {
    throw new Error(
      "Structured AI output marked the content as valid but omitted workType, title, or content",
    );
  }
}

function createModel(
  ai: WorkersAiBinding,
  model: string,
  options?: WorkersAiRunOptions,
) {
  const providerOptions = {
    // The provider only needs the Workers AI binding's run method at runtime.
    // Keep this package independent from the generated app-specific Env type.
    binding: ai,
    gateway: options?.gateway,
  } as unknown as WorkersAISettings;
  const workersai = createWorkersAI(providerOptions);
  return workersai(model);
}

export async function analyzeJob(
  ai: WorkersAiBinding,
  content: string,
  model: string,
  options?: WorkersAiRunOptions,
): Promise<JobAnalysis> {
  if (!model) throw new Error("AI_JOB_MODEL is not configured");

  let lastError: unknown;
  for (const attempt of [0, 1]) {
    try {
      const gateway = options?.gateway
        ? {
            ...options.gateway,
            ...(attempt === 1 ? { skipCache: true } : {}),
          }
        : undefined;
      const result = await generateObject({
        model: createModel(ai, model, gateway ? { gateway } : undefined),
        system: systemPrompt,
        prompt: content,
        schema: jobAnalysisSchema,
        temperature: 0,
        maxOutputTokens: 2048,
        maxRetries: 0,
      });

      const analysis = normalizeAnalysis(result.object);
      assertValidAnalysis(analysis);
      return analysis;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Workers AI analysis failed after retry: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
