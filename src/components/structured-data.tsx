export function StructuredData({ data, schema }: { data: object; schema?: string }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" data-schema={schema} dangerouslySetInnerHTML={{ __html: json }} />;
}
