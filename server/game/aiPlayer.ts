/**
 * AI玩家决策系统
 */

import { invokeLLM } from "../_core/llm";
import { Card, cardsToStrings } from "./cards";
import { GameState, PlayerPosition, BidAction, PlayAction, getPlayerHand, getPublicGameState } from "./gameEngine";

// AI决策结果
export interface AIDecisionResult {
  decision: BidAction | PlayAction;
  reasoning: string;
  thinkingTime: number;
}

/**
 * 生成叫地主阶段的Prompt
 */
function generateBiddingPrompt(state: GameState, position: PlayerPosition): string {
  const hand = getPlayerHand(state, position);
  const handStr = cardsToStrings(hand).join(", ");
  
  return `你正在玩斗地主游戏，现在是叫地主阶段。

你的位置：玩家${position}
你的手牌（17张）：${handStr}

当前叫地主情况：
- 最高叫分：${state.highestBid}分（0表示还没有人叫）
- 最高叫分者：${state.highestBidder !== null ? `玩家${state.highestBidder}` : "无"}
- 已经pass的次数：${state.passCount}

规则说明：
1. 你可以选择"叫地主"或"不叫"
2. 如果叫地主，必须叫比当前最高分更高的分数（1-3分）
3. 叫3分会直接成为地主
4. 如果三个人都不叫，会重新发牌（简化规则：第一个玩家自动成为地主）
5. 地主会获得3张底牌，但需要1打2

请分析你的手牌强度，决定是否叫地主。考虑因素：
- 大牌数量（2、A、K、Q、J）
- 王牌（大王、小王）
- 炸弹（四张相同的牌）
- 连续牌型的可能性

请以JSON格式返回你的决策：
{
  "action": "bid" 或 "pass",
  "amount": 1-3（仅当action为bid时需要），
  "reasoning": "你的决策理由"
}`;
}

/**
 * 生成出牌阶段的Prompt
 */
function generatePlayingPrompt(state: GameState, position: PlayerPosition): string {
  const publicState = getPublicGameState(state, position);
  const hand = getPlayerHand(state, position);
  const handStr = cardsToStrings(hand).join(", ");
  
  const isLandlord = state.landlordPosition === position;
  const lastPlayedStr = state.lastPlayedCards ? cardsToStrings(state.lastPlayedCards).join(", ") : "无";
  
  return `你正在玩斗地主游戏，现在是出牌阶段。

你的身份：${isLandlord ? "地主" : "农民"}
你的位置：玩家${position}
你的手牌（${hand.length}张）：${handStr}

其他玩家手牌数量：
- 玩家0：${publicState.player0HandCount}张
- 玩家1：${publicState.player1HandCount}张
- 玩家2：${publicState.player2HandCount}张

地主位置：玩家${state.landlordPosition}
地主底牌：${publicState.landlordCards ? publicState.landlordCards.join(", ") : "未公开"}

上一次出牌：
- 出牌玩家：${state.lastPlayer !== null ? `玩家${state.lastPlayer}` : "无"}
- 出的牌：${lastPlayedStr}

${state.lastPlayedCards ? "你需要出比上家更大的牌，或者选择pass。" : "你是第一个出牌，可以出任意合法牌型。"}

斗地主牌型规则：
1. 单张：任意一张牌
2. 对子：两张相同的牌
3. 三张：三张相同的牌
4. 三带一：三张相同 + 一张单牌
5. 三带一对：三张相同 + 一对
6. 顺子：至少5张连续的牌（不能包含2和王）
7. 连对：至少3对连续的对子
8. 飞机：至少2组连续的三张
9. 飞机带翅膀：飞机 + 相应数量的单牌或对子
10. 四带二：四张相同 + 两张单牌或两对
11. 炸弹：四张相同的牌（可以炸任何牌型）
12. 火箭：大王+小王（最大的牌型）

牌的大小：3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 < 小王 < 大王

策略建议：
${isLandlord ? 
  "- 作为地主，你需要快速出完手牌\n- 注意控制节奏，保留大牌压制对手\n- 警惕农民的配合" :
  "- 作为农民，你需要配合队友\n- 尽量不让地主轻易出牌\n- 如果队友快赢了，帮助队友出牌"}

请分析当前局势，决定出什么牌或pass。

请以JSON格式返回你的决策：
{
  "action": "play" 或 "pass",
  "cards": ["♠3", "♥3"] （仅当action为play时需要，使用花色+数字表示，如"♠A"表示黑桃A，"小王"、"大王"表示王牌），
  "reasoning": "你的决策理由"
}`;
}

/**
 * AI叫地主决策
 */
export async function aiMakeBidDecision(
  state: GameState,
  position: PlayerPosition,
  modelId: string,
  apiKey?: string
): Promise<AIDecisionResult> {
  const startTime = Date.now();
  
  try {
    const prompt = generateBiddingPrompt(state, position);
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一个斗地主游戏AI，需要根据手牌情况做出最优决策。" },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "bid_decision",
          strict: true,
          schema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["bid", "pass"],
                description: "叫地主或不叫"
              },
              amount: {
                type: "number",
                enum: [1, 2, 3],
                description: "叫地主的分数（仅当action为bid时有效）"
              },
              reasoning: {
                type: "string",
                description: "决策理由"
              }
            },
            required: ["action", "reasoning"],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("No response from AI");
    }
    
    const result = JSON.parse(content);
    const thinkingTime = Date.now() - startTime;
    
    const decision: BidAction = {
      type: result.action,
      amount: result.amount
    };
    
    return {
      decision,
      reasoning: result.reasoning,
      thinkingTime
    };
  } catch (error) {
    console.error("AI bid decision error:", error);
    // 默认策略：pass
    return {
      decision: { type: "pass" },
      reasoning: "AI决策出错，默认不叫",
      thinkingTime: Date.now() - startTime
    };
  }
}

/**
 * AI出牌决策
 */
export async function aiMakePlayDecision(
  state: GameState,
  position: PlayerPosition,
  modelId: string,
  apiKey?: string
): Promise<AIDecisionResult> {
  const startTime = Date.now();
  
  try {
    const prompt = generatePlayingPrompt(state, position);
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一个斗地主游戏AI，需要根据牌局情况做出最优出牌决策。" },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "play_decision",
          strict: true,
          schema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["play", "pass"],
                description: "出牌或pass"
              },
              cards: {
                type: "array",
                items: { type: "string" },
                description: "要出的牌（仅当action为play时有效）"
              },
              reasoning: {
                type: "string",
                description: "决策理由"
              }
            },
            required: ["action", "reasoning"],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("No response from AI");
    }
    
    const result = JSON.parse(content);
    const thinkingTime = Date.now() - startTime;
    
    // 解析牌
    let cards: Card[] | undefined;
    if (result.action === "play" && result.cards) {
      const { stringsToCards } = await import("./cards");
      cards = stringsToCards(result.cards);
    }
    
    const decision: PlayAction = {
      type: result.action,
      cards
    };
    
    return {
      decision,
      reasoning: result.reasoning,
      thinkingTime
    };
  } catch (error) {
    console.error("AI play decision error:", error);
    // 默认策略：pass（如果可以）或出最小的牌
    const hand = getPlayerHand(state, position);
    if (state.lastPlayedCards === null && hand.length > 0) {
      // 必须出牌，出最小的单张
      return {
        decision: { type: "play", cards: [hand[0]!] },
        reasoning: "AI决策出错，默认出最小的牌",
        thinkingTime: Date.now() - startTime
      };
    }
    
    return {
      decision: { type: "pass" },
      reasoning: "AI决策出错，默认pass",
      thinkingTime: Date.now() - startTime
    };
  }
}
