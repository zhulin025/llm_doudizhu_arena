#!/usr/bin/env node
/**
 * 初始化AI模型数据
 */

import { drizzle } from "drizzle-orm/mysql2";
import { aiModels } from "../drizzle/schema.js";
import * as dotenv from "dotenv";

dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

const models = [
  {
    name: "GPT-4",
    provider: "openai",
    modelId: "gpt-4",
    apiEndpoint: null,
    config: null,
    enabled: 1,
  },
  {
    name: "Claude-3",
    provider: "anthropic",
    modelId: "claude-3-opus-20240229",
    apiEndpoint: null,
    config: null,
    enabled: 1,
  },
  {
    name: "Gemini-Pro",
    provider: "google",
    modelId: "gemini-pro",
    apiEndpoint: null,
    config: null,
    enabled: 1,
  },
];

async function seed() {
  console.log("开始初始化AI模型数据...");
  
  for (const model of models) {
    try {
      await db.insert(aiModels).values(model).onDuplicateKeyUpdate({
        set: { name: model.name }
      });
      console.log(`✓ 已添加模型: ${model.name}`);
    } catch (error) {
      console.error(`✗ 添加模型失败 ${model.name}:`, error.message);
    }
  }
  
  console.log("初始化完成！");
  process.exit(0);
}

seed().catch((error) => {
  console.error("初始化失败:", error);
  process.exit(1);
});
