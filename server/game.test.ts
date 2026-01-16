import { describe, it, expect } from "vitest";
import { createGame, processBidAction, processPlayAction, GamePhase } from "./game/gameEngine";
import { recognizePattern, CardType } from "./game/cardTypes";
import { stringsToCards } from "./game/cards";

describe("Game Engine", () => {
  describe("createGame", () => {
    it("should create a new game with correct initial state", () => {
      const game = createGame(1, 2, 3);
      
      expect(game.gameId).toBeDefined();
      expect(game.phase).toBe(GamePhase.BIDDING);
      expect(game.player0ModelId).toBe(1);
      expect(game.player1ModelId).toBe(2);
      expect(game.player2ModelId).toBe(3);
      
      // Check cards distribution
      expect(game.hands.player0.length).toBe(17);
      expect(game.hands.player1.length).toBe(17);
      expect(game.hands.player2.length).toBe(17);
      expect(game.landlordCards.length).toBe(3);
      
      // Total should be 54 cards
      const total = game.hands.player0.length + 
                    game.hands.player1.length + 
                    game.hands.player2.length + 
                    game.landlordCards.length;
      expect(total).toBe(54);
    });
  });

  describe("processBidAction", () => {
    it("should allow player to bid", () => {
      const game = createGame(1, 2, 3);
      const newGame = processBidAction(game, { type: "bid", amount: 1 });
      
      expect(newGame.highestBid).toBe(1);
      expect(newGame.highestBidder).toBe(0);
      expect(newGame.currentBidder).toBe(1);
    });

    it("should allow player to pass", () => {
      const game = createGame(1, 2, 3);
      const newGame = processBidAction(game, { type: "pass" });
      
      expect(newGame.passCount).toBe(1);
      expect(newGame.currentBidder).toBe(1);
    });

    it("should transition to playing phase when bid is 3", () => {
      const game = createGame(1, 2, 3);
      const newGame = processBidAction(game, { type: "bid", amount: 3 });
      
      expect(newGame.phase).toBe(GamePhase.PLAYING);
      expect(newGame.landlordPosition).toBe(0);
      expect(newGame.hands.player0.length).toBe(20); // 17 + 3 landlord cards
    });

    it("should reject invalid bid amount", () => {
      const game = createGame(1, 2, 3);
      
      expect(() => {
        processBidAction(game, { type: "bid", amount: 0 });
      }).toThrow();
    });
  });

  describe("processPlayAction", () => {
    it("should allow valid play", () => {
      // Create a game and fast-forward to playing phase
      let game = createGame(1, 2, 3);
      game = processBidAction(game, { type: "bid", amount: 3 });
      
      // Get first card from player 0
      const card = game.hands.player0[0];
      if (!card) throw new Error("No cards");
      
      const newGame = processPlayAction(game, { type: "play", cards: [card] });
      
      expect(newGame.lastPlayedCards).toHaveLength(1);
      expect(newGame.hands.player0.length).toBe(19);
      expect(newGame.currentPlayer).toBe(1);
    });

    it("should allow pass when not first player", () => {
      let game = createGame(1, 2, 3);
      game = processBidAction(game, { type: "bid", amount: 3 });
      
      // Player 0 plays a card
      const card = game.hands.player0[0];
      if (!card) throw new Error("No cards");
      game = processPlayAction(game, { type: "play", cards: [card] });
      
      // Player 1 passes
      const newGame = processPlayAction(game, { type: "pass" });
      
      expect(newGame.consecutivePasses).toBe(1);
      expect(newGame.currentPlayer).toBe(2);
    });

    it("should reject pass when first player", () => {
      let game = createGame(1, 2, 3);
      game = processBidAction(game, { type: "bid", amount: 3 });
      
      expect(() => {
        processPlayAction(game, { type: "pass" });
      }).toThrow("Cannot pass when you are the first player");
    });
  });
});

describe("Card Type Recognition", () => {
  it("should recognize single card", () => {
    const cards = stringsToCards(["♠3"]);
    const pattern = recognizePattern(cards);
    expect(pattern.type).toBe(CardType.SINGLE);
  });

  it("should recognize pair", () => {
    const cards = stringsToCards(["♠3", "♥3"]);
    const pattern = recognizePattern(cards);
    expect(pattern.type).toBe(CardType.PAIR);
  });

  it("should recognize trio", () => {
    const cards = stringsToCards(["♠3", "♥3", "♦3"]);
    const pattern = recognizePattern(cards);
    expect(pattern.type).toBe(CardType.TRIO);
  });

  it("should recognize bomb", () => {
    const cards = stringsToCards(["♠3", "♥3", "♦3", "♣3"]);
    const pattern = recognizePattern(cards);
    expect(pattern.type).toBe(CardType.BOMB);
  });

  it("should recognize rocket", () => {
    const cards = stringsToCards(["小王", "大王"]);
    const pattern = recognizePattern(cards);
    expect(pattern.type).toBe(CardType.ROCKET);
  });

  it("should recognize straight", () => {
    const cards = stringsToCards(["♠3", "♥4", "♦5", "♣6", "♠7"]);
    const pattern = recognizePattern(cards);
    expect(pattern.type).toBe(CardType.STRAIGHT);
  });

  it("should reject invalid pattern", () => {
    const cards = stringsToCards(["♠3", "♥5"]);
    const pattern = recognizePattern(cards);
    expect(pattern.type).toBe(CardType.INVALID);
  });
});
