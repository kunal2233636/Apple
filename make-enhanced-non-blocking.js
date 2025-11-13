const fs = require('fs');
const path = 'C:\\Users\\kunal\\Ruther\\ROUTE\\src\\hooks\\use-study-buddy.ts';
let content = fs.readFileSync(path, 'utf8');

// Make buildInitialEnhancedContext call non-blocking as well
content = content.replace(
  /\/\/ Build initial enhanced context\s*\n\s*if \(user\.id\) {\s*\n\s*await buildInitialEnhancedContext\(\);\s*\n\s*}/g,
  `// Build initial enhanced context (non-blocking)
        if (user.id) {
          buildInitialEnhancedContext();
        }`
);

fs.writeFileSync(path, content);
console.log('Made buildInitialEnhancedContext call non-blocking as well');