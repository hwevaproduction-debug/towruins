const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function extractDocxText(filePath) {
  const buf = fs.readFileSync(filePath);

  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 65557; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("No EOCD found in " + filePath);
  }

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

    entries.push({
      fileName,
      compression,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset = offset + 46 + fileNameLength + extraLength + commentLength;
  }

  const docEntry = entries.find((e) => e.fileName === "word/document.xml");
  const entry = docEntry || entries.find((e) => e.fileName.endsWith(".xml"));
  if (!entry) {
    throw new Error(
      "No document.xml found in " + filePath + ". Entries: " + entries.map((e) => e.fileName).join(", ")
    );
  }

  const localOffset = entry.localHeaderOffset;
  const localFnLen = buf.readUInt16LE(localOffset + 26);
  const localExtraLen = buf.readUInt16LE(localOffset + 28);
  const dataOffset = localOffset + 30 + localFnLen + localExtraLen;

  const compressed = buf.slice(dataOffset, dataOffset + entry.compressedSize);
  let decompressed;
  if (entry.compression === 8) {
    decompressed = zlib.inflateRawSync(compressed);
  } else if (entry.compression === 0) {
    decompressed = compressed;
  } else {
    decompressed = zlib.inflateRawSync(compressed);
  }

  const xml = decompressed.toString("utf8");
  const text = xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

function extractSections(text, docTitle) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    if (line === docTitle) continue;

    const isHeading = line.length < 60 &&
                      !/[.!?;:]$/.test(line) &&
                      !line.startsWith('http') &&
                      !line.includes('@');

    if (isHeading && line !== '') {
      currentSection = { title: line, content: '' };
      sections.push(currentSection);
    } else if (currentSection) {
      currentSection.content += (currentSection.content ? '\n' : '') + line;
    }
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
  const fullPath = path.join(dir, file);
  const text = extractDocxText(fullPath);
  const docTitle = text.split('\n')[0].trim();
  const sections = extractSections(text, docTitle);
  const slug = slugMap[file] || file.replace('.docx', '').toLowerCase().replace(/\s+/g, '-');

  console.log(JSON.stringify({ slug, title: docTitle, sections }, null, 2));
  console.log('\n---END---\n');
}
