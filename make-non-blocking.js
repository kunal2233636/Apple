const fs = require('fs');
const path = 'C:\\Users\\kunal\\Ruther\\ROUTE\\src\\hooks\\use-study-buddy.ts';
let content = fs.readFileSync(path, 'utf8');

// Make fetchProfileData call non-blocking by removing the await
content = content.replace(
  /\/\/ Fetch profile data\s*\n\s*await fetchProfileData\(\);/g,
  `// Fetch profile data (non-blocking)
        fetchProfileData();`
);

fs.writeFileSync(path, content);
console.log('Made fetchProfileData call non-blocking to prevent chat initialization blocking');