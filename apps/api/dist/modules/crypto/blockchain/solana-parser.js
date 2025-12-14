"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SolanaParser", {
    enumerable: true,
    get: function() {
        return SolanaParser;
    }
});
const _common = require("@nestjs/common");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
// Known Solana Program IDs
const PROGRAM_IDS = {
    // Core programs
    SYSTEM: '11111111111111111111111111111111',
    TOKEN: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    ASSOCIATED_TOKEN: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    // DEXs
    RAYDIUM_V4: '675kPX9MHTjS2zt1qfzwCoKfse4L1h4L4qQHPAJNvL6p',
    RAYDIUM_CLMM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
    ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    // Staking
    MARINADE: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
    LIDO: 'CrX7kMhLC3cSsXJdT7JDgqrRVWGnUpX3gfEfxxU2NVLi',
    // Lending
    SOLEND: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo',
    MANGO: 'mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68'
};
let SolanaParser = class SolanaParser {
    /**
   * Parse Solana transaction into standard format
   */ parseTransaction(tx, walletAddress) {
        try {
            // Check for failed transactions
            if (tx.err) {
                return {
                    type: 'FAILED',
                    feeAsset: 'SOL',
                    confidence: 1.0,
                    reasoning: 'Transaction failed on-chain'
                };
            }
            // Detect transaction type based on program IDs
            const programIds = tx.instructions.map((i)=>i.programId);
            // 1. Check for DEX swaps
            if (this.isDexSwap(programIds)) {
                return this.parseSwap(tx, walletAddress);
            }
            // 2. Check for staking operations
            if (this.isStaking(programIds)) {
                return this.parseStaking(tx, walletAddress);
            }
            // 3. Check for token transfers
            if (this.isTokenTransfer(programIds)) {
                return this.parseTokenTransfer(tx, walletAddress);
            }
            // 4. Check for SOL transfer (system program)
            if (programIds.includes(PROGRAM_IDS.SYSTEM)) {
                return this.parseSolTransfer(tx, walletAddress);
            }
            // Default: unknown transaction
            return {
                type: 'OTHER',
                feeAsset: 'SOL',
                confidence: 0.3,
                reasoning: 'Unknown Solana transaction type'
            };
        } catch (error) {
            this.logger.error(`Failed to parse Solana transaction: ${error.message}`);
            return {
                type: 'OTHER',
                feeAsset: 'SOL',
                confidence: 0.1,
                reasoning: `Parse error: ${error.message}`
            };
        }
    }
    isDexSwap(programIds) {
        return programIds.includes(PROGRAM_IDS.RAYDIUM_V4) || programIds.includes(PROGRAM_IDS.RAYDIUM_CLMM) || programIds.includes(PROGRAM_IDS.ORCA_WHIRLPOOL) || programIds.includes(PROGRAM_IDS.JUPITER_V6);
    }
    isStaking(programIds) {
        return programIds.includes(PROGRAM_IDS.MARINADE) || programIds.includes(PROGRAM_IDS.LIDO);
    }
    isTokenTransfer(programIds) {
        return programIds.includes(PROGRAM_IDS.TOKEN);
    }
    parseSwap(tx, walletAddress) {
        // Analyze balance changes to determine swap
        const balanceChanges = tx.balanceChanges.filter((bc)=>bc.account === walletAddress);
        if (balanceChanges.length < 2) {
            return {
                type: 'SWAP',
                feeAsset: 'SOL',
                confidence: 0.5,
                reasoning: 'DEX swap detected but insufficient balance data'
            };
        }
        // Find tokens that decreased (assetOut) and increased (assetIn)
        const decreased = balanceChanges.filter((bc)=>bc.amount < 0);
        const increased = balanceChanges.filter((bc)=>bc.amount > 0);
        if (decreased.length > 0 && increased.length > 0) {
            const assetOut = decreased[0].mint || 'SOL';
            const amountOut = Math.abs(decreased[0].amount).toString();
            const assetIn = increased[0].mint || 'SOL';
            const amountIn = increased[0].amount.toString();
            const protocol = this.detectDexProtocol(tx.instructions);
            return {
                type: 'SWAP',
                subtype: protocol,
                assetOut,
                amountOut,
                assetIn,
                amountIn,
                feeAsset: 'SOL',
                confidence: 0.9,
                reasoning: `Swap on ${protocol}: ${amountOut} ${assetOut} → ${amountIn} ${assetIn}`
            };
        }
        return {
            type: 'SWAP',
            feeAsset: 'SOL',
            confidence: 0.6,
            reasoning: 'DEX swap detected'
        };
    }
    detectDexProtocol(instructions) {
        for (const instruction of instructions){
            if (instruction.programId === PROGRAM_IDS.JUPITER_V6) return 'Jupiter';
            if (instruction.programId === PROGRAM_IDS.RAYDIUM_V4) return 'Raydium';
            if (instruction.programId === PROGRAM_IDS.RAYDIUM_CLMM) return 'Raydium CLMM';
            if (instruction.programId === PROGRAM_IDS.ORCA_WHIRLPOOL) return 'Orca';
        }
        return 'Unknown DEX';
    }
    parseStaking(tx, walletAddress) {
        const balanceChanges = tx.balanceChanges.filter((bc)=>bc.account === walletAddress);
        // Check if SOL decreased (stake) or increased (unstake)
        const solChange = balanceChanges.find((bc)=>!bc.mint); // SOL has no mint
        if (!solChange) {
            return {
                type: 'STAKE',
                feeAsset: 'SOL',
                confidence: 0.7,
                reasoning: 'Staking transaction detected'
            };
        }
        if (solChange.amount < 0) {
            // Staking SOL
            return {
                type: 'STAKE',
                assetOut: 'SOL',
                amountOut: Math.abs(solChange.amount).toString(),
                feeAsset: 'SOL',
                confidence: 0.9,
                reasoning: `Staked ${Math.abs(solChange.amount)} SOL`
            };
        } else {
            // Unstaking SOL
            return {
                type: 'UNSTAKE',
                assetIn: 'SOL',
                amountIn: solChange.amount.toString(),
                feeAsset: 'SOL',
                confidence: 0.9,
                reasoning: `Unstaked ${solChange.amount} SOL`
            };
        }
    }
    parseTokenTransfer(tx, walletAddress) {
        const balanceChanges = tx.balanceChanges.filter((bc)=>bc.account === walletAddress);
        if (balanceChanges.length === 0) {
            return {
                type: 'OTHER',
                feeAsset: 'SOL',
                confidence: 0.4,
                reasoning: 'Token program called but no balance changes detected'
            };
        }
        const change = balanceChanges[0];
        if (change.amount < 0) {
            // Token sent
            return {
                type: 'TRANSFER_OUT',
                assetOut: change.mint || 'SOL',
                amountOut: Math.abs(change.amount).toString(),
                feeAsset: 'SOL',
                confidence: 0.95,
                reasoning: `Sent ${Math.abs(change.amount)} ${change.mint || 'SOL'}`
            };
        } else {
            // Token received
            return {
                type: 'TRANSFER_IN',
                assetIn: change.mint || 'SOL',
                amountIn: change.amount.toString(),
                feeAsset: 'SOL',
                confidence: 0.95,
                reasoning: `Received ${change.amount} ${change.mint || 'SOL'}`
            };
        }
    }
    parseSolTransfer(tx, walletAddress) {
        const balanceChanges = tx.balanceChanges.filter((bc)=>bc.account === walletAddress && !bc.mint);
        if (balanceChanges.length === 0) {
            return {
                type: 'OTHER',
                feeAsset: 'SOL',
                confidence: 0.5,
                reasoning: 'System program transaction'
            };
        }
        const solChange = balanceChanges[0];
        if (solChange.amount < 0) {
            return {
                type: 'TRANSFER_OUT',
                assetOut: 'SOL',
                amountOut: Math.abs(solChange.amount).toString(),
                feeAsset: 'SOL',
                confidence: 0.95,
                reasoning: `Sent ${Math.abs(solChange.amount)} SOL`
            };
        } else {
            return {
                type: 'TRANSFER_IN',
                assetIn: 'SOL',
                amountIn: solChange.amount.toString(),
                feeAsset: 'SOL',
                confidence: 0.95,
                reasoning: `Received ${solChange.amount} SOL`
            };
        }
    }
    constructor(){
        this.logger = new _common.Logger(SolanaParser.name);
    }
};
SolanaParser = _ts_decorate([
    (0, _common.Injectable)()
], SolanaParser);

//# sourceMappingURL=solana-parser.js.map