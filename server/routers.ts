import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { 
  getAllAiModels, 
  getAiModelById, 
  createAiModel,
  getRecentGames,
  getGameByGameId,
  getGameActions,
  getAllModelStats,
  getModelStats
} from "./db";
import { startNewGame, getGameState, getActiveGames, subscribeToGame } from "./game/gameManager";
import { getPublicGameState } from "./game/gameEngine";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // AI模型管理
  models: router({
    list: publicProcedure.query(async () => {
      return await getAllAiModels();
    }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getAiModelById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        provider: z.string(),
        modelId: z.string(),
        apiEndpoint: z.string().optional(),
        config: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createAiModel({
          name: input.name,
          provider: input.provider,
          modelId: input.modelId,
          apiEndpoint: input.apiEndpoint || null,
          config: input.config || null,
          enabled: 1,
        });
        return { id };
      }),
    
    stats: publicProcedure.query(async () => {
      return await getAllModelStats();
    }),
    
    getStats: publicProcedure
      .input(z.object({ modelId: z.number() }))
      .query(async ({ input }) => {
        return await getModelStats(input.modelId);
      }),
  }),

  // 游戏管理
  game: router({
    start: publicProcedure
      .input(z.object({
        player0ModelId: z.number(),
        player1ModelId: z.number(),
        player2ModelId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const gameId = await startNewGame(
          input.player0ModelId,
          input.player1ModelId,
          input.player2ModelId
        );
        return { gameId };
      }),
    
    getState: publicProcedure
      .input(z.object({ 
        gameId: z.string(),
        playerPosition: z.number().min(0).max(2).optional(),
      }))
      .query(async ({ input }) => {
        const state = getGameState(input.gameId);
        if (!state) {
          return null;
        }
        
        // 如果指定了玩家位置，返回该玩家视角的公开信息
        if (input.playerPosition !== undefined) {
          return getPublicGameState(state, input.playerPosition as 0 | 1 | 2);
        }
        
        // 否则返回完整状态（用于观战或回放）
        return {
          gameId: state.gameId,
          phase: state.phase,
          roundNumber: state.roundNumber,
          player0HandCount: state.hands.player0.length,
          player1HandCount: state.hands.player1.length,
          player2HandCount: state.hands.player2.length,
          landlordPosition: state.landlordPosition,
          currentPlayer: state.currentPlayer,
          currentBidder: state.currentBidder,
          highestBid: state.highestBid,
          highestBidder: state.highestBidder,
          lastPlayer: state.lastPlayer,
          winner: state.winner,
          winnerType: state.winnerType,
        };
      }),
    
    getActiveGames: publicProcedure.query(() => {
      return getActiveGames();
    }),
    
    getHistory: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await getRecentGames(input.limit || 20);
      }),
    
    getGameDetail: publicProcedure
      .input(z.object({ gameId: z.string() }))
      .query(async ({ input }) => {
        const game = await getGameByGameId(input.gameId);
        if (!game) {
          return null;
        }
        
        const actions = await getGameActions(input.gameId);
        
        return {
          game,
          actions,
        };
      }),
  }),

  // 人类玩家游戏API
  humanGame: router({
    start: protectedProcedure
      .input(z.object({
        humanPlayerPosition: z.number().min(0).max(2),
        ai1ModelId: z.number(),
        ai2ModelId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { startHumanGame } = await import("./game/humanGameManager");
        const gameId = await startHumanGame(
          input.humanPlayerPosition as 0 | 1 | 2,
          input.ai1ModelId,
          input.ai2ModelId
        );
        return { gameId };
      }),
    
    getState: protectedProcedure
      .input(z.object({ gameId: z.string() }))
      .query(async ({ input }) => {
        const { getHumanGameSession } = await import("./game/humanGameManager");
        const session = getHumanGameSession(input.gameId);
        if (!session) {
          throw new Error("Game not found");
        }
        return {
          gameState: session.gameState,
          humanPlayerPosition: session.humanPlayerPosition,
          waitingForHuman: session.waitingForHuman,
          currentAction: session.currentAction,
        };
      }),
    
    bid: protectedProcedure
      .input(z.object({
        gameId: z.string(),
        action: z.discriminatedUnion("type", [
          z.object({ type: z.literal("bid"), amount: z.number().min(1).max(3) }),
          z.object({ type: z.literal("pass") }),
        ]),
      }))
      .mutation(async ({ input }) => {
        const { humanBidAction } = await import("./game/humanGameManager");
        await humanBidAction(input.gameId, input.action as any);
        return { success: true };
      }),
    
    play: protectedProcedure
      .input(z.object({
        gameId: z.string(),
        action: z.discriminatedUnion("type", [
          z.object({ 
            type: z.literal("play"), 
            cards: z.array(z.object({
              suit: z.enum(["♠", "♥", "♦", "♣", "Joker"]),
              rank: z.string(),
            })),
          }),
          z.object({ type: z.literal("pass") }),
        ]),
      }))
      .mutation(async ({ input }) => {
        const { humanPlayAction } = await import("./game/humanGameManager");
        await humanPlayAction(input.gameId, input.action as any);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
