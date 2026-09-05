/**
 * Emits a JSON-LD block.
 *
 * Titles and overviews come from a third-party catalogue, so `<` is escaped: that
 * is what stops a `</script>` sequence inside provider data from ending the block
 * early. The payload is machine-readable only and renders nothing visible.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
