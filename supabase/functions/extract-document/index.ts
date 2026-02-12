// Supabase Edge Function: extract-document
// Extracts text from PDF, classifies document type, and extracts key fields

// This is a placeholder for the extraction Edge Function.
// Implementation will be added in Epic 5 (Extraktionspipeline).

Deno.serve(async (req) => {
  try {
    const { document_id, assignment_id } = await req.json();

    if (!document_id || !assignment_id) {
      return new Response(
        JSON.stringify({ error: "document_id and assignment_id are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // TODO: Implement extraction pipeline
    // 1. Fetch document from Storage
    // 2. Extract text (pdf-parse)
    // 3. Classify document type via LLM
    // 4. Extract key fields via LLM
    // 5. Save results in extractions table

    return new Response(
      JSON.stringify({ status: "not_implemented" }),
      { status: 501, headers: { "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
