"""
Multi-Agent AI System for Tender Evaluation
============================================
Implements a LangChain-based multi-agent workflow:
- Retriever: Finds relevant evidence from documents
- Reasoner: Analyzes evidence against criteria
- Critic: Validates and challenges the reasoner's conclusions
- Synthesizer: Combines all inputs to make final recommendation
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer, util
import torch

logger = logging.getLogger(__name__)

# Try to import LangChain components
try:
    from langchain_ollama import ChatOllama
    from langchain_core.prompts import PromptTemplate
    from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logger.warning("LangChain not available, using mock agents")


@dataclass
class AgentResult:
    """Result from an agent's analysis."""
    agent_name: str
    decision: str
    confidence: float
    reasoning: str
    evidence: List[Dict[str, Any]]
    metadata: Dict[str, Any]


class RetrieverAgent:
    """
    Retriever Agent: Finds relevant evidence from bidder documents.
    Uses semantic similarity search to locate relevant passages.
    """

    def __init__(self):
        self.name = "Retriever"
        self.semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("RetrieverAgent initialized with semantic search")

    def retrieve(self, query: str, documents: List[Dict], top_k: int = 5) -> List[Dict]:
        """Find most relevant document chunks for a query."""
        if not documents:
            return []

        query_embedding = self.semantic_model.encode(query, convert_to_tensor=True)

        doc_texts = [d.get("text", d.get("normalized_text", "")) for d in documents]
        doc_embeddings = self.semantic_model.encode(doc_texts, convert_to_tensor=True)

        scores = util.cos_sim(query_embedding, doc_embeddings)[0]
        top_results = torch.topk(scores, k=min(top_k, len(documents)))

        results = []
        for score, idx in zip(top_results[0], top_results[1]):
            doc = documents[idx.item()].copy()
            doc["relevance_score"] = float(score)
            results.append(doc)

        return results

    def retrieve_for_criterion(self, criterion: Dict, bidder_docs: List[Dict]) -> AgentResult:
        """Retrieve evidence for a specific criterion."""
        criterion_text = criterion.get("text", "")
        relevant_docs = self.retrieve(criterion_text, bidder_docs)

        return AgentResult(
            agent_name=self.name,
            decision="evidence_found" if relevant_docs else "no_evidence",
            confidence=relevant_docs[0]["relevance_score"] if relevant_docs else 0.0,
            reasoning=f"Found {len(relevant_docs)} relevant document sections",
            evidence=relevant_docs,
            metadata={"criterion_id": criterion.get("id"), "top_score": relevant_docs[0]["relevance_score"] if relevant_docs else 0}
        )


class ReasonerAgent:
    """
    Reasoner Agent: Analyzes evidence and makes logical decisions.
    Uses LLM to determine if criteria are satisfied.
    """

    def __init__(self):
        self.name = "Reasoner"
        self.llm = None
        self.chain = None
        self._init_llm()

    def _init_llm(self):
        if not LANGCHAIN_AVAILABLE:
            return

        if os.getenv("MOCK_LLM", "false").lower() == "true":
            from langchain_core.language_models.fake_chat_models import FakeListChatModel
            self.llm = FakeListChatModel(responses=[
                '{"decision": "pass", "confidence": 0.85, "reasoning": "Evidence supports compliance with the criterion."}'
            ])
        else:
            self.llm = ChatOllama(
                model=os.getenv("OLLAMA_MODEL", "llama3"),
                base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
                temperature=0.1,
                format="json",
            )

        prompt = PromptTemplate(
            input_variables=["criterion", "evidence"],
            template="""You are a procurement evaluation expert. Analyze if the evidence satisfies the criterion.

Criterion: {criterion}

Evidence from bidder documents:
{evidence}

Analyze the evidence and determine:
1. Does the evidence CLEARLY satisfy the criterion? (pass/fail/unclear)
2. How confident are you in this assessment? (0.0 to 1.0)
3. What is your reasoning?

Respond in JSON format:
{{"decision": "pass|fail|unclear", "confidence": 0.0-1.0, "reasoning": "your analysis"}}"""
        )

        self.chain = prompt | self.llm | JsonOutputParser()

    def reason(self, criterion: Dict, evidence: List[Dict]) -> AgentResult:
        """Analyze evidence against criterion."""
        criterion_text = criterion.get("text", "")
        evidence_text = "\n\n".join([
            f"[Score: {e.get('relevance_score', 0):.2f}] {e.get('text', '')[:500]}"
            for e in evidence[:3]
        ])

        if not self.chain:
            # Fallback mock response
            return AgentResult(
                agent_name=self.name,
                decision="unclear",
                confidence=0.5,
                reasoning="LLM not available, manual review required",
                evidence=evidence,
                metadata={"criterion_id": criterion.get("id")}
            )

        try:
            result = self.chain.invoke({
                "criterion": criterion_text,
                "evidence": evidence_text or "No relevant evidence found"
            })

            return AgentResult(
                agent_name=self.name,
                decision=result.get("decision", "unclear"),
                confidence=float(result.get("confidence", 0.5)),
                reasoning=result.get("reasoning", ""),
                evidence=evidence,
                metadata={"criterion_id": criterion.get("id")}
            )
        except Exception as e:
            logger.error(f"Reasoner failed: {e}")
            return AgentResult(
                agent_name=self.name,
                decision="unclear",
                confidence=0.3,
                reasoning=f"Analysis error: {str(e)}",
                evidence=evidence,
                metadata={"criterion_id": criterion.get("id"), "error": str(e)}
            )


class CriticAgent:
    """
    Critic Agent: Validates and challenges the reasoner's conclusions.
    Looks for gaps, inconsistencies, or overlooked evidence.
    """

    def __init__(self):
        self.name = "Critic"
        self.llm = None
        self.chain = None
        self._init_llm()

    def _init_llm(self):
        if not LANGCHAIN_AVAILABLE:
            return

        if os.getenv("MOCK_LLM", "false").lower() == "true":
            from langchain_core.language_models.fake_chat_models import FakeListChatModel
            self.llm = FakeListChatModel(responses=[
                '{"agrees": true, "issues": [], "adjusted_confidence": 0.82, "recommendation": "accept"}'
            ])
        else:
            self.llm = ChatOllama(
                model=os.getenv("OLLAMA_MODEL", "llama3"),
                base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
                temperature=0.2,
                format="json",
            )

        prompt = PromptTemplate(
            input_variables=["criterion", "reasoner_decision", "reasoner_confidence", "reasoner_reasoning", "evidence"],
            template="""You are a critical reviewer of procurement evaluations. Challenge and validate the assessment.

Criterion: {criterion}

Reasoner's Assessment:
- Decision: {reasoner_decision}
- Confidence: {reasoner_confidence}
- Reasoning: {reasoner_reasoning}

Original Evidence:
{evidence}

Your task:
1. Do you AGREE with the reasoner's decision? Look for flaws in logic.
2. Are there any issues or gaps in the analysis?
3. Should confidence be adjusted?
4. Final recommendation: accept the decision or flag for human review?

Respond in JSON:
{{"agrees": true/false, "issues": ["list of concerns"], "adjusted_confidence": 0.0-1.0, "recommendation": "accept|review"}}"""
        )

        self.chain = prompt | self.llm | JsonOutputParser()

    def critique(self, criterion: Dict, reasoner_result: AgentResult) -> AgentResult:
        """Critique the reasoner's analysis."""
        if not self.chain:
            return AgentResult(
                agent_name=self.name,
                decision="accept",
                confidence=reasoner_result.confidence,
                reasoning="Critic unavailable, accepting reasoner decision",
                evidence=reasoner_result.evidence,
                metadata={"agrees": True, "issues": []}
            )

        evidence_text = "\n".join([
            f"{e.get('text', '')[:300]}" for e in reasoner_result.evidence[:2]
        ])

        try:
            result = self.chain.invoke({
                "criterion": criterion.get("text", ""),
                "reasoner_decision": reasoner_result.decision,
                "reasoner_confidence": reasoner_result.confidence,
                "reasoner_reasoning": reasoner_result.reasoning,
                "evidence": evidence_text or "No evidence"
            })

            return AgentResult(
                agent_name=self.name,
                decision=result.get("recommendation", "review"),
                confidence=float(result.get("adjusted_confidence", reasoner_result.confidence)),
                reasoning=f"Agrees: {result.get('agrees')}. Issues: {result.get('issues', [])}",
                evidence=reasoner_result.evidence,
                metadata={
                    "agrees": result.get("agrees", True),
                    "issues": result.get("issues", []),
                    "criterion_id": criterion.get("id")
                }
            )
        except Exception as e:
            logger.error(f"Critic failed: {e}")
            return AgentResult(
                agent_name=self.name,
                decision="review",
                confidence=reasoner_result.confidence * 0.8,
                reasoning=f"Critique error, flagging for review: {str(e)}",
                evidence=reasoner_result.evidence,
                metadata={"error": str(e)}
            )


class SynthesizerAgent:
    """
    Synthesizer Agent: Combines all agent outputs to make final recommendation.
    Produces the final verdict for a bidder.
    """

    def __init__(self):
        self.name = "Synthesizer"
        self.llm = None
        self.chain = None
        self._init_llm()

    def _init_llm(self):
        if not LANGCHAIN_AVAILABLE:
            return

        if os.getenv("MOCK_LLM", "false").lower() == "true":
            from langchain_core.language_models.fake_chat_models import FakeListChatModel
            self.llm = FakeListChatModel(responses=[
                '{"final_decision": "pass", "final_confidence": 0.80, "summary": "Bidder meets the criterion requirements.", "needs_review": false}'
            ])
        else:
            self.llm = ChatOllama(
                model=os.getenv("OLLAMA_MODEL", "llama3"),
                base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
                temperature=0,
                format="json",
            )

        prompt = PromptTemplate(
            input_variables=["criterion", "retriever_summary", "reasoner_summary", "critic_summary"],
            template="""You are the final decision maker for procurement evaluation. Synthesize all agent analyses.

Criterion: {criterion}

Agent Analyses:
1. RETRIEVER: {retriever_summary}
2. REASONER: {reasoner_summary}
3. CRITIC: {critic_summary}

Make the FINAL decision:
- If all agents agree and confidence is high (>0.8): pass or fail
- If critic raised issues or confidence is medium (0.5-0.8): flag for review
- If evidence is weak or conflicting: fail or review

Respond in JSON:
{{"final_decision": "pass|fail|review_needed", "final_confidence": 0.0-1.0, "summary": "brief explanation", "needs_review": true/false}}"""
        )

        self.chain = prompt | self.llm | JsonOutputParser()

    def synthesize(self, criterion: Dict, retriever_result: AgentResult,
                   reasoner_result: AgentResult, critic_result: AgentResult) -> Dict:
        """Synthesize all agent results into final verdict."""

        if not self.chain:
            # Rule-based fallback
            avg_confidence = (retriever_result.confidence + reasoner_result.confidence + critic_result.confidence) / 3
            if avg_confidence >= 0.8 and reasoner_result.decision == "pass":
                final = "pass"
            elif avg_confidence < 0.5 or reasoner_result.decision == "fail":
                final = "fail"
            else:
                final = "review_needed"

            return {
                "status": final,
                "confidence": avg_confidence,
                "reasoning": f"Retriever: {retriever_result.reasoning}. Reasoner: {reasoner_result.reasoning}. Critic: {critic_result.reasoning}",
                "needs_human_review": final == "review_needed",
                "evidence_citation": {
                    "excerpt": retriever_result.evidence[0].get("text", "")[:200] if retriever_result.evidence else "",
                    "page": retriever_result.evidence[0].get("page") if retriever_result.evidence else None,
                    "source_doc": retriever_result.evidence[0].get("source_file") if retriever_result.evidence else None
                }
            }

        try:
            result = self.chain.invoke({
                "criterion": criterion.get("text", ""),
                "retriever_summary": f"Found {len(retriever_result.evidence)} docs, top score: {retriever_result.confidence:.2f}",
                "reasoner_summary": f"Decision: {reasoner_result.decision}, Confidence: {reasoner_result.confidence:.2f}, Reason: {reasoner_result.reasoning}",
                "critic_summary": f"Recommendation: {critic_result.decision}, Adjusted confidence: {critic_result.confidence:.2f}, Issues: {critic_result.metadata.get('issues', [])}"
            })

            return {
                "status": result.get("final_decision", "review_needed"),
                "confidence": float(result.get("final_confidence", 0.5)),
                "reasoning": result.get("summary", ""),
                "needs_human_review": result.get("needs_review", True),
                "evidence_citation": {
                    "excerpt": retriever_result.evidence[0].get("text", "")[:200] if retriever_result.evidence else "",
                    "page": retriever_result.evidence[0].get("page") if retriever_result.evidence else None,
                    "source_doc": retriever_result.evidence[0].get("source_file") if retriever_result.evidence else None
                }
            }
        except Exception as e:
            logger.error(f"Synthesizer failed: {e}")
            return {
                "status": "review_needed",
                "confidence": 0.3,
                "reasoning": f"Synthesis error: {str(e)}",
                "needs_human_review": True,
                "evidence_citation": {}
            }


class MultiAgentOrchestrator:
    """
    Orchestrates the multi-agent workflow for tender evaluation.
    """

    def __init__(self):
        self.retriever = RetrieverAgent()
        self.reasoner = ReasonerAgent()
        self.critic = CriticAgent()
        self.synthesizer = SynthesizerAgent()
        logger.info("MultiAgentOrchestrator initialized with all agents")

    def evaluate_criterion(self, criterion: Dict, bidder_docs: List[Dict]) -> Dict:
        """Run full multi-agent evaluation for a single criterion."""
        # Step 1: Retrieve relevant evidence
        retriever_result = self.retriever.retrieve_for_criterion(criterion, bidder_docs)

        # Step 2: Reason about the evidence
        reasoner_result = self.reasoner.reason(criterion, retriever_result.evidence)

        # Step 3: Critique the reasoning
        critic_result = self.critic.critique(criterion, reasoner_result)

        # Step 4: Synthesize final decision
        final_verdict = self.synthesizer.synthesize(
            criterion, retriever_result, reasoner_result, critic_result
        )

        # Add agent trace for audit
        final_verdict["agent_trace"] = {
            "retriever": {"confidence": retriever_result.confidence, "docs_found": len(retriever_result.evidence)},
            "reasoner": {"decision": reasoner_result.decision, "confidence": reasoner_result.confidence},
            "critic": {"agrees": critic_result.metadata.get("agrees"), "issues": critic_result.metadata.get("issues", [])},
        }

        return final_verdict

    def evaluate_bidder(self, criteria: List[Dict], bidder_docs: List[Dict]) -> List[Dict]:
        """Evaluate a bidder against all criteria."""
        results = []
        for criterion in criteria:
            verdict = self.evaluate_criterion(criterion, bidder_docs)
            verdict["criterion_id"] = criterion.get("id")
            results.append(verdict)
        return results

    def recommend_winner(self, tender_criteria: List[Dict], bidders: List[Dict]) -> Dict:
        """
        Recommend which bidder should win the tender.
        Returns ranking with scores and recommendation.
        """
        bidder_scores = []

        for bidder in bidders:
            bidder_id = bidder.get("id")
            bidder_name = bidder.get("vendor_name", f"Bidder {bidder_id}")
            verdicts = bidder.get("verdicts", [])

            # Calculate scores
            total_score = 0
            mandatory_pass = True
            weighted_confidence = 0

            for verdict in verdicts:
                criterion = next((c for c in tender_criteria if c.get("id") == verdict.get("criterion_id")), {})
                weight = criterion.get("weight", 1.0)
                is_mandatory = criterion.get("type") == "mandatory"

                if verdict.get("status") == "pass":
                    total_score += weight * verdict.get("confidence", 0.5)
                    weighted_confidence += verdict.get("confidence", 0.5)
                elif is_mandatory and verdict.get("status") == "fail":
                    mandatory_pass = False

            avg_confidence = weighted_confidence / len(verdicts) if verdicts else 0

            bidder_scores.append({
                "bidder_id": bidder_id,
                "bidder_name": bidder_name,
                "total_score": total_score,
                "avg_confidence": avg_confidence,
                "mandatory_pass": mandatory_pass,
                "verdict_count": len(verdicts),
                "disqualified": not mandatory_pass
            })

        # Sort by: mandatory pass first, then total score
        bidder_scores.sort(key=lambda x: (x["mandatory_pass"], x["total_score"]), reverse=True)

        # Determine winner
        qualified = [b for b in bidder_scores if not b["disqualified"]]
        winner = qualified[0] if qualified else None

        return {
            "recommendation": {
                "winner_id": winner["bidder_id"] if winner else None,
                "winner_name": winner["bidder_name"] if winner else "No qualified bidder",
                "winner_score": winner["total_score"] if winner else 0,
                "confidence": winner["avg_confidence"] if winner else 0,
                "reasoning": f"Highest scoring qualified bidder with {winner['verdict_count']} criteria evaluated" if winner else "No bidders passed all mandatory criteria"
            },
            "rankings": bidder_scores,
            "qualified_count": len(qualified),
            "total_bidders": len(bidders)
        }


# Singleton instance
orchestrator = MultiAgentOrchestrator()
