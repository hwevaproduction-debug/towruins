const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function extractDocxText(filePath) {
  const buf = fs.readFileSync(filePath);
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 65557; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) throw new Error("No EOCD found in " + filePath);
  const centralDirOffset = buf.readUInt32LE(eocdOffset + 16);
  const centralDirSize = buf.readUInt32LE(eocdOffset + 12);
  const entries = [];
  let offset = centralDirOffset;
  const endOffset = centralDirOffset + centralDirSize;
  while (offset < endOffset - 4) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x02014b50) break;
    const compression = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const uncompressedSize = buf.readUInt32LE(offset + 24);
    const fileNameLength = buf.readUInt16LE(offset + 28);
    const extraLength = buf.readUInt16LE(offset + 30);
    const commentLength = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const fileName = buf.toString("utf8", offset + 46, offset + 46 + fileNameLength);
    entries.push({ fileName, compression, compressedSize, uncompressedSize, localHeaderOffset });
    offset = offset + 46 + fileNameLength + extraLength + commentLength;
  }
  const docEntry = entries.find((e) => e.fileName === "word/document.xml");
  const entry = docEntry || entries.find((e) => e.fileName.endsWith(".xml"));
  if (!entry) throw new Error("No document.xml found in " + filePath);
  const localOffset = entry.localHeaderOffset;
  const localFnLen = buf.readUInt16LE(localOffset + 26);
  const localExtraLen = buf.readUInt16LE(localOffset + 28);
  const dataOffset = localOffset + 30 + localFnLen + localExtraLen;
  const compressed = buf.slice(dataOffset, dataOffset + entry.compressedSize);
  const decompressed = zlib.inflateRawSync(compressed);
  return decompressed.toString("utf8");
}

function extractTextFromXml(xml) {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function extractSections(xml) {
  const paragraphs = xml.split(/<\/w:p>/g);
  const sections = [];
  let currentSection = null;

  for (const para of paragraphs) {
    const hasBreak = para.includes('<w:br w:type="textWrapping"');
    const text = extractTextFromXml(para + "</w:p>");

    if (!text) continue;

    // Check if this paragraph has a line break (heading with inline content)
    const firstBreak = para.indexOf('<w:br w:type="textWrapping"');
    if (firstBreak !== -1) {
      // Text before the break is the heading title
      const beforeBreak = extractTextFromXml(para.substring(0, firstBreak) + "</w:t></w:r></w:p>");
      // Text after the break is the start of content
      const afterBreakXml = para.substring(firstBreak + '<w:br w:type="textWrapping"/>'.length);
      const afterBreak = extractTextFromXml(afterBreakXml + "</w:p>");

      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = { title: beforeBreak, content: afterBreak };
    } else if (currentSection) {
      // Continuation paragraph - append to current section content
      currentSection.content += (currentSection.content ? "\n" : "") + text;
    } else {
      // No current section yet - could be intro text or first heading without break
      // Treat as a section with empty title or first section
      currentSection = { title: text, content: "" };
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

const dir = path.join(__dirname, "..", "..", "terms&all");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".docx"));

const slugMap = {
  'Tenant & Guest Agreement.docx': 'terms-of-use',
  'Privacy Policy.docx': 'privacy-policy',
  'Host & Landlord Agreement.docx': 'landlord-terms',
  'Refund and Cancellation +more.docx': 'refund-policy',
};

for (const file of files) {
  const slug = slugMap[file];
  if (!slug) continue;
  const fullPath = path.join(dir, file);
  const xml = extractDocxText(fullPath);
  const sections = extractSections(xml);

  console.log("// --- " + slug + " ---");
  const title = sections.length > 0 ? sections[0].title : file;
  console.log("{ slug: \"" + slug + "\", title: \"" + title.replace(/"/g, '\\"') + "\", content: JSON.stringify([");
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const id = s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const contentJson = JSON.stringify(s.content);
    const titleJson = JSON.stringify(s.title);
    console.log("  { id: \"" + id + "\", title: " + titleJson + ", content: " + contentJson + "}" + (i < sections.length - 1 ? "," : ""));
  }
  console.log("])");
  console.log("},");
  console.log();
}
