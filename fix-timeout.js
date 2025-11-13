const fs = require('fs');
const path = 'C:\\Users\\kunal\\Ruther\\ROUTE\\src\\hooks\\use-study-buddy.ts';
let content = fs.readFileSync(path, 'utf8');

// Increase the timeout from 10 seconds to 30 seconds and add proper headers
const updatedCode = `// Increased timeout to 30 seconds to allow for complex queries
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(\`/api/student/profile?userId=\${userId}\`, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });`;

content = content.replace(
  /const timeoutId = setTimeout\(\(\) => controller\.abort\(\), 10000\); \/\/ 10 second timeout\s*\n\s*\n\s*const response = await fetch\(`\/api\/student\/profile\?userId=\$\{userId\}`, \{\s*\n\s*signal: controller\.signal\s*\n\s*\}\);/g,
  updatedCode
);

// Also fix the bug where it says currentDate instead of currentData
content = content.replace(
  /revisionQueue: typeof data\.data\.currentDate\?\.(revisionQueue) === 'number' \? data\.data\.currentData\.\1 : 0/g,
  `revisionQueue: typeof data.data.currentData?.revisionQueue === 'number' ? data.data.currentData.revisionQueue : 0`
);

fs.writeFileSync(path, content);
console.log('Fixed the timeout issue in fetchProfileData function and corrected the currentDate bug');