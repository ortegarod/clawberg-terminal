/**
 * ERC-8004 + EIP-712 integration for ClawBerg
 *
 * Handles:
 * - Agent identity verification
 * - EIP-712 trade intent signing
 * - On-chain intent recording (Base Sepolia)
 * - Reputation/Validation feedback submission
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────────────────────────

const DEPLOYED = require('./deployed.json');
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const AGENT_ID = parseInt(process.env.CLAWBERG_AGENT_ID || '1');
const KEY_PATH = path.resolve(process.env.WALLET_KEY_PATH || `${process.env.HOME}/.openclaw/credentials/.kyro-wallet-key`);

// Minimal ABIs — only what we need
const IDENTITY_ABI = [
  'function register(string uri) returns (uint256)',
  'function agentCount() view returns (uint256)',
  'function agentWallets(uint256) view returns (address)',
  'function ownerOfAgent(uint256) view returns (address)',
  'event AgentRegistered(uint256 indexed agentId, address indexed owner, string uri)',
];

const TRADE_INTENT_ABI = [
  'function hashIntent((uint256,string,string,uint256,uint256,uint256,bytes32,bytes32)) view returns (bytes32)',
  'function recordIntent((uint256,string,string,uint256,uint256,uint256,bytes32,bytes32),uint8,bytes32,bytes32) returns (bytes32)',
  'function getNonce(uint256) view returns (uint256)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'event IntentSigned(bytes32 indexed intentHash, uint256 indexed agentId, string pair, string side, uint256 amountUsd, uint256 nonce)',
];

const REPUTATION_ABI = [
  'function giveFeedback(uint256,int128,uint8,string,string,string,bytes32)',
  'function getAverageScore(uint256) view returns (int128)',
  'function feedbackCount(uint256) view returns (uint256)',
];

const VALIDATION_ABI = [
  'function validationRequest(address,uint256,string,bytes32) returns (uint256)',
  'function completeValidation(uint256,uint8,string)',
  'function getAverageValidationScore(uint256) view returns (uint8)',
];

const RISK_ABI = [
  'function checkRisk(uint256,uint256) returns (bool,string)',
  'function updateCapital(uint256,uint256)',
  'function getRiskSummary(uint256) view returns (uint256,uint256,uint256,uint256,bool)',
];

// ── Provider & Signer ────────────────────────────────────────────────────────

function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function getSigner() {
  const key = fs.readFileSync(KEY_PATH, 'utf8').trim();
  return new ethers.Wallet(key, getProvider());
}

function getContracts(signerOrProvider) {
  const sp = signerOrProvider || getProvider();
  return {
    identity: new ethers.Contract(DEPLOYED.contracts.identityRegistry, IDENTITY_ABI, sp),
    tradeIntent: new ethers.Contract(DEPLOYED.contracts.tradeIntent, TRADE_INTENT_ABI, sp),
    reputation: new ethers.Contract(DEPLOYED.contracts.reputationRegistry, REPUTATION_ABI, sp),
    validation: new ethers.Contract(DEPLOYED.contracts.validationRegistry, VALIDATION_ABI, sp),
    risk: new ethers.Contract(DEPLOYED.contracts.riskManager, RISK_ABI, sp),
  };
}

// ── Trade Intent Signing ─────────────────────────────────────────────────────

/**
 * Sign a trade intent using EIP-712 (off-chain, no gas).
 * Returns the signature + intentHash for storing with the trade.
 *
 * @param {object} params - { pair, side, amountUsd, strategyRationale, signalData }
 * @returns {{ intentHash, signature, intent, txHash }}
 */
async function signTradeIntent({ pair, side, amountUsd, strategyRationale, signalData }) {
  const signer = getSigner();
  const contracts = getContracts(signer);

  const nonce = await contracts.tradeIntent.getNonce(AGENT_ID);
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  // Hash strategy and signal for on-chain storage
  const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(strategyRationale)));
  const signalHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(signalData)));

  const intent = {
    agentId: AGENT_ID,
    pair,
    side,
    amountUsd: Math.round(amountUsd),
    deadline,
    nonce: Number(nonce),
    strategyHash,
    signalHash,
  };

  // EIP-712 domain — matches the deployed contract
  const domain = {
    name: 'FinPal',
    version: '1',
    chainId: DEPLOYED.chainId,
    verifyingContract: DEPLOYED.contracts.tradeIntent,
  };

  const types = {
    TradeIntent: [
      { name: 'agentId', type: 'uint256' },
      { name: 'pair', type: 'string' },
      { name: 'side', type: 'string' },
      { name: 'amountUsd', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'strategyHash', type: 'bytes32' },
      { name: 'signalHash', type: 'bytes32' },
    ],
  };

  // Sign off-chain (free, no gas)
  const signature = await signer.signTypedData(domain, types, intent);
  const intentHash = ethers.TypedDataEncoder.hash(domain, types, intent);

  return { intentHash, signature, intent };
}

/**
 * Record a signed intent on-chain (costs gas, provides immutable proof).
 * Call this after Kraken execution, not before.
 */
async function recordIntentOnChain({ intent, signature }) {
  const signer = getSigner();
  const contracts = getContracts(signer);

  const sig = ethers.Signature.from(signature);
  const intentTuple = [
    intent.agentId,
    intent.pair,
    intent.side,
    intent.amountUsd,
    intent.deadline,
    intent.nonce,
    intent.strategyHash,
    intent.signalHash,
  ];

  const tx = await contracts.tradeIntent.recordIntent(intentTuple, sig.v, sig.r, sig.s);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

// ── Reputation & Validation ──────────────────────────────────────────────────

/**
 * Submit trading performance feedback to ReputationRegistry.
 * Call this after a trade cycle completes with actual PnL.
 *
 * @param {number} yieldScore - 0–100 (100 = perfect execution)
 * @param {string} feedbackURI - Link to trade outcome artifact
 */
async function submitReputation(yieldScore, feedbackURI = '') {
  const signer = getSigner();
  const contracts = getContracts(signer);

  const feedbackHash = feedbackURI
    ? ethers.keccak256(ethers.toUtf8Bytes(feedbackURI))
    : ethers.ZeroHash;

  const tx = await contracts.reputation.giveFeedback(
    AGENT_ID,
    yieldScore,        // value (int128)
    0,                 // valueDecimals (0 = integer score)
    'tradingYield',    // tag1
    'week',            // tag2
    feedbackURI,
    feedbackHash
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

/**
 * Request validation for a strategy checkpoint.
 * For ClawBerg: self-validation using the VWAP analysis as artifact.
 */
async function requestValidation(artifactURI) {
  const signer = getSigner();
  const contracts = getContracts(signer);

  const artifactHash = ethers.keccak256(ethers.toUtf8Bytes(artifactURI));
  const tx = await contracts.validation.validationRequest(
    signer.address,   // self-validation
    AGENT_ID,
    artifactURI,
    artifactHash
  );
  const receipt = await tx.wait();

  // Parse requestId from logs
  const iface = new ethers.Interface(VALIDATION_ABI);
  const log = receipt.logs.find(l => {
    try { iface.parseLog(l); return true; } catch { return false; }
  });
  const parsed = log ? iface.parseLog(log) : null;
  const requestId = parsed ? Number(parsed.args[0]) : null;

  return { txHash: receipt.hash, requestId };
}

/**
 * Complete a validation request (self-score).
 */
async function completeValidation(requestId, score, responseURI = '') {
  const signer = getSigner();
  const contracts = getContracts(signer);

  const tx = await contracts.validation.completeValidation(requestId, score, responseURI);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// ── Read helpers ─────────────────────────────────────────────────────────────

async function getAgentSummary() {
  const provider = getProvider();
  const contracts = getContracts(provider);

  const [
    agentCount,
    agentWallet,
    agentOwner,
    avgScore,
    feedbackCount,
    avgValidation,
    riskSummary,
  ] = await Promise.allSettled([
    contracts.identity.agentCount(),
    contracts.identity.agentWallets(AGENT_ID),
    contracts.identity.ownerOfAgent(AGENT_ID),
    contracts.reputation.getAverageScore(AGENT_ID),
    contracts.reputation.feedbackCount(AGENT_ID),
    contracts.validation.getAverageValidationScore(AGENT_ID),
    contracts.risk.getRiskSummary(AGENT_ID),
  ]);

  const pick = (r, fallback = null) => r.status === 'fulfilled' ? r.value : fallback;
  const risk = pick(riskSummary);

  return {
    agentId: AGENT_ID,
    network: DEPLOYED.network,
    contracts: DEPLOYED.contracts,
    agentCount: Number(pick(agentCount, 0)),
    agentWallet: pick(agentWallet),
    agentOwner: pick(agentOwner),
    reputation: {
      averageScore: Number(pick(avgScore, 0)),
      feedbackCount: Number(pick(feedbackCount, 0)),
    },
    validation: {
      averageScore: Number(pick(avgValidation, 0)),
    },
    risk: risk ? {
      currentCapital: Number(risk[0]),
      peakCapital: Number(risk[1]),
      drawdownBps: Number(risk[2]),
      dailyTradeCount: Number(risk[3]),
      withinLimits: risk[4],
    } : null,
  };
}

module.exports = {
  AGENT_ID,
  DEPLOYED,
  signTradeIntent,
  recordIntentOnChain,
  submitReputation,
  requestValidation,
  completeValidation,
  getAgentSummary,
};
