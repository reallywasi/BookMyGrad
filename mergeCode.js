const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'all_code_dump.js');
const baseDir = __dirname;

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (path.basename(fullPath) !== 'node_modules') {
        walk(fullPath, callback);
      }
    } else {
      callback(fullPath);
    }
  });
}

function mergeFiles() {
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

  walk(baseDir, (filePath) => {
    const relativePath = path.relative(baseDir, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    const label = `\n\n// -------------------------\n// File: ${relativePath}\n// -------------------------\n\n`;
    fs.appendFileSync(outputFile, label + content, 'utf8');
  });

  console.log(`✅ All files (excluding node_modules) merged into ${outputFile}`);
}

mergeFiles();
