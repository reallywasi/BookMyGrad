const fs = require("fs");
const path = require("path");

let output = "";

function listDirectory(dirPath, indent = "") {
  const items = fs.readdirSync(dirPath);

  items.forEach((item) => {
    if (item === "node_modules") return;

    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      output += `${indent}📁 ${item}\n`;
      listDirectory(fullPath, indent + "  ");
    } else {
      output += `${indent}📄 ${item}\n`;
    }
  });
}

const targetPath = process.argv[2] || __dirname;
console.log(`Generating structure of: ${targetPath}`);
listDirectory(targetPath);

// Write to structure.txt
const outputPath = path.join(__dirname, "structure.txt");
fs.writeFileSync(outputPath, output, "utf-8");
console.log(`✅ Folder structure saved to: ${outputPath}`);
