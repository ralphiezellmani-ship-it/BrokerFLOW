"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sv">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <div
          style={{
            maxWidth: "28rem",
            margin: "4rem auto",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Något gick fel
          </h2>
          <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {error.message || "Ett oväntat fel uppstod."}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Försök igen
          </button>
        </div>
      </body>
    </html>
  );
}
