-- ==============================================================================
-- Migration: Add Native pgvector Extension and HNSW Cosine Index
-- Description: Enables vector extension, adds 256-dim vector column, creates HNSW index
-- ==============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add native 256-dimensional vector column to knowledge_vectors table
ALTER TABLE "knowledge_vectors" ADD COLUMN IF NOT EXISTS "embedding_vec" vector(256);

-- 3. Create HNSW (Hierarchical Navigable Small World) index for sub-5ms cosine retrieval
CREATE INDEX IF NOT EXISTS "knowledge_vectors_embedding_vec_hnsw_idx" 
ON "knowledge_vectors" USING hnsw ("embedding_vec" vector_cosine_ops);
