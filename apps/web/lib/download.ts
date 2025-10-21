export type MarkdownSection = {
  title: string;
  content: string;
};

export function downloadMarkdown(filename: string, sections: MarkdownSection[]) {
  if (typeof window === "undefined") return;

  const safeFilename = filename.endsWith(".md") ? filename : `${filename}.md`;
  const content = sections
    .map((section) => `# ${section.title}\n\n${section.content.trim()}\n`)
    .join("\n");

  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const href = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = safeFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(href);
}
