const fs = require('fs');
const path = 'C:\\Users\\kunal\\Ruther\\ROUTE\\src\\app\\(app)\\study-buddy\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find all positions of the interface definition
const searchStr = 'interface EndpointConfigurationCardProps';
let positions = [];
let pos = content.indexOf(searchStr);

while (pos !== -1) {
  positions.push(pos);
  pos = content.indexOf(searchStr, pos + 1);
}

console.log('Found interface at positions:', positions);

if (positions.length > 1) {
  // Find the second occurrence and remove from there to the next function's closing brace
  const secondStart = positions[1];
  console.log('Second interface starts at:', secondStart);
  
  // Find the function that follows this interface
  const funcStart = content.indexOf('function EndpointConfigurationCard', secondStart);
  console.log('Function starts at:', funcStart);
  
  if (funcStart !== -1) {
    // Find the opening brace of the function
    const openBrace = content.indexOf('{', funcStart);
    console.log('Opening brace at:', openBrace);
    
    // Count braces to find the closing brace
    let braceCount = 1;
    let i = openBrace + 1;
    while (i < content.length && braceCount > 0) {
      if (content[i] === '{') {
        braceCount++;
      } else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) break;
      }
      i++;
    }
    
    console.log('Final closing brace at:', i-1, 'with character:', content[i-1]);
    
    if (braceCount === 0) {
      // Remove from second interface to end of its function
      const endPos = i - 1;
      content = content.substring(0, secondStart) + content.substring(endPos + 1);
      console.log('Removed duplicate interface and function');
      fs.writeFileSync(path, content);
      console.log('File updated successfully');
    } else {
      console.log('Could not find matching closing brace');
    }
  }
} else {
  console.log('No duplicate interface found');
}