'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CodeBlock } from './CodeBlock';
import { MathBlock } from './MathBlock';
import { Separator } from '@/components/ui/separator';
import { 
  TestTube, 
  Code, 
  SquareRadical, 
  Table, 
  List, 
  Eye, 
  Shield, 
  Clock 
} from 'lucide-react';

/**
 * Comprehensive Markdown Testing Component
 * 
 * This component tests all aspects of our Markdown rendering implementation:
 * - Basic formatting (bold, italic, strikethrough)
 * - Code blocks with syntax highlighting
 * - Math formulas with KaTeX
 * - Tables and lists
 * - Security sanitization
 * - Performance with streaming responses
 */
export function MarkdownTestComponent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Test content for different Markdown features
  const testContents = {
    basic: `# Markdown Rendering Test

## Basic Formatting

This is **bold text**, *italic text*, and ~~strikethrough text~~.

### Lists

**Ordered List:**
1. First item
2. Second item
3. Third item

**Unordered List:**
- Apples
- Bananas
- Oranges

### Links and Images

Visit [OpenAI](https://openai.com) for more information.

![Sample Image](https://via.placeholder.com/150)`,
    
    code: `# Code Block Testing

## JavaScript Example

\`\`\`javascript
function greetUser(name) {
  // This is a comment
  const message = \`Hello, \${name}!\`;
  
  if (name.length > 0) {
    console.log(message);
    return message;
  } else {
    throw new Error("Name cannot be empty");
  }
}

// Usage
try {
  const greeting = greetUser("Alice");
  document.getElementById("output").innerHTML = greeting;
} catch (error) {
  console.error("Error:", error.message);
}
\`\`\`

## Python Example

\`\`\`python
import numpy as np
import matplotlib.pyplot as plt

def fibonacci_sequence(n):
    """Generate Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    sequence = [0, 1]
    for i in range(2, n):
        next_term = sequence[i-1] + sequence[i-2]
        sequence.append(next_term)
    
    return sequence

# Generate and plot
terms = 10
fib_seq = fibonacci_sequence(terms)
print(f"Fibonacci sequence ({terms} terms): {fib_seq}")

plt.figure(figsize=(10, 6))
plt.plot(fib_seq, 'bo-', linewidth=2, markersize=6)
plt.title('Fibonacci Sequence')
plt.xlabel('Term')
plt.ylabel('Value')
plt.grid(True)
plt.show()
\`\`\`

## SQL Example

\`\`\`sql
-- Create a table for student records
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    age INTEGER CHECK (age >= 16),
    gpa DECIMAL(3,2) CHECK (gpa >= 0.0 AND gpa <= 4.0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO students (name, email, age, gpa) VALUES
('Alice Johnson', 'alice@example.com', 20, 3.8),
('Bob Smith', 'bob@example.com', 19, 3.5),
('Carol Davis', 'carol@example.com', 21, 3.9);

-- Query with JOIN
SELECT s.name, s.email, s.gpa, 
       CASE 
         WHEN s.gpa >= 3.7 THEN 'Excellent'
         WHEN s.gpa >= 3.0 THEN 'Good'
         WHEN s.gpa >= 2.0 THEN 'Average'
         ELSE 'Needs Improvement'
       END as performance_level
FROM students s
WHERE s.age BETWEEN 18 AND 22
ORDER BY s.gpa DESC;
\`\`\``,
    
    math: `# Mathematical Expressions Testing

## Inline Math

The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.

Euler's identity: $e^{i\\pi} + 1 = 0$

## Block Math Examples

### Calculus

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

### Linear Algebra

$$
\\begin{bmatrix}
1 & 2 & 3 \\\\
4 & 5 & 6 \\\\
7 & 8 & 9
\\end{bmatrix}
\\begin{bmatrix}
x \\\\
y \\\\
z
\\end{bmatrix}
= \\lambda
\\begin{bmatrix}
x \\\\
y \\\\
z
\\end{bmatrix}
$$

### Statistics

Sample mean: $\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i$

Standard deviation: $\\sigma = \\sqrt{\\frac{1}{n} \\sum_{i=1}^{n} (x_i - \\bar{x})^2}$

### Physics

Einstein's mass-energy equivalence: $E = mc^2$

Schrödinger equation:
$$
i\\hbar\\frac{\\partial}{\\partial t}\\Psi(x,t) = -\\frac{\\hbar^2}{2m}\\frac{\\partial^2}{\\partial x^2}\\Psi(x,t) + V(x)\\Psi(x,t)
$$`,
    
    tables: `# Table Rendering Testing

## Basic Table

| Name | Age | Grade | Status |
|------|-----|-------|--------|
| Alice Johnson | 20 | A | Active |
| Bob Smith | 19 | B+ | Active |
| Carol Davis | 21 | A- | Inactive |
| David Wilson | 18 | B | Active |

## Advanced Table with Math

| Function | Domain | Range | Derivative |
|----------|--------|-------|------------|
| $f(x) = x^2$ | $\\mathbb{R}$ | $[0, \\infty)$ | $f'(x) = 2x$ |
| $g(x) = \\sin(x)$ | $\\mathbb{R}$ | $[-1, 1]$ | $g'(x) = \\cos(x)$ |
| $h(x) = e^x$ | $\\mathbb{R}$ | $(0, \\infty)$ | $h'(x) = e^x$ |

## Code Statistics Table

| Language | Lines | Functions | Complexity | Test Coverage |
|----------|-------|-----------|------------|---------------|
| JavaScript | 1,234 | 45 | Medium | 87% |
| Python | 892 | 23 | Low | 92% |
| TypeScript | 1,567 | 67 | High | 89% |
| Java | 2,345 | 89 | High | 78% |`,
    
    security: `# Security Testing

## Safe Content

This content should render safely:

- Normal text formatting
- [Safe links](https://example.com)
- ![Safe images](https://via.placeholder.com/150)

## Potentially Dangerous Content (Should be Sanitized)

### JavaScript Attempts (Should be blocked)

This should be safe: <script>alert('XSS')</script>

This should also be safe: <img src="x" onerror="alert('XSS')">

### Unsafe Protocols (Should be blocked or sanitized)

- [JavaScript protocol](javascript:alert('XSS'))
- [Data protocol with script](data:text/html,<script>alert('XSS')</script>)

### Safe Links (Should work)

- [HTTP Link](http://example.com)
- [HTTPS Link](https://example.com)
- [Mailto Link](mailto:test@example.com)
- [Relative Link](/dashboard)

## HTML Elements (Should be sanitized)

<div onclick="alert('test')">This div should be safe</div>

<span style="color: red;">This span should render</span>

<p>This paragraph should render normally with <strong>bold text</strong>.</p>`,
    
    streaming: `# Streaming Response Simulation

This content simulates what happens during streaming responses.

## Features Being Tested

- Real-time content updates
- Partial Markdown rendering
- Smooth content insertion
- Performance with large responses
- Memory usage optimization

Try the "Start Streaming Test" button below to see how our Markdown renderer handles incremental content updates.

## Implementation Details

The streaming test will:
1. Start with an empty state
2. Gradually add content in chunks
3. Render each chunk as Markdown
4. Maintain smooth user experience
5. Handle syntax highlighting incrementally
6. Update math formulas as they complete

This demonstrates that our implementation works correctly with both streaming and non-streaming responses from the AI chat endpoint.`
  };

  // Simulate streaming response
  const simulateStreaming = async () => {
    setIsStreaming(true);
    setStreamingContent('');
    
    const chunks = [
      "# Streaming Test Results\n\n",
      "## Initial Response\n\n",
      "The streaming response has started...\n\n",
      "```javascript\nconsole.log('Streaming chunk 1');\n```\n\n",
      "## Processing...\n\n",
      "More content is being generated...\n\n",
      "### Mathematical Content\n\n",
      "Inline math: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$\n\n",
      "```\ntable\n| Operation | Status |\n|-----------|--------|\n| Chunk 1   | ✅ Done |\n| Chunk 2   | ✅ Done |\n| Chunk 3   | 🔄 Processing |\n```\n\n",
      "## Final Results\n\n",
      "```python\n# Final streaming results\ndef process_streaming_response():\n    return \"Streaming completed successfully!\"\n\nresult = process_streaming_response()\nprint(result)\n```\n\n",
      "The streaming test has completed. All Markdown content rendered correctly!"
    ];

    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setStreamingContent(prev => prev + chunk);
    }
    
    setIsStreaming(false);
  };

  const testScenarios = [
    {
      id: 'basic',
      title: 'Basic Formatting',
      description: 'Test bold, italic, lists, links, and basic Markdown',
      icon: List,
      content: testContents.basic
    },
    {
      id: 'code',
      title: 'Code Blocks',
      description: 'Test syntax highlighting for multiple programming languages',
      icon: Code,
      content: testContents.code
    },
    {
      id: 'math',
      title: 'Math Formulas',
      description: 'Test KaTeX rendering for inline and block math expressions',
      icon: SquareRadical,
      content: testContents.math
    },
    {
      id: 'tables',
      title: 'Tables',
      description: 'Test table rendering with various content types',
      icon: Table,
      content: testContents.tables
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Test XSS protection and content sanitization',
      icon: Shield,
      content: testContents.security
    },
    {
      id: 'streaming',
      title: 'Streaming',
      description: 'Test real-time content updates and performance',
      icon: Clock,
      content: testContents.streaming
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Markdown Rendering Test Suite
        </h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive testing of our secure Markdown renderer implementation
        </p>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-center">
          <TabsList className="grid grid-cols-6 lg:grid-cols-6 gap-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Overview
            </TabsTrigger>
            {testScenarios.map((scenario) => (
              <TabsTrigger key={scenario.id} value={scenario.id} className="flex items-center gap-2">
                <scenario.icon className="h-4 w-4" />
                {scenario.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testScenarios.map((scenario) => (
              <Card key={scenario.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <scenario.icon className="h-5 w-5 text-primary" />
                    {scenario.title}
                  </CardTitle>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab(scenario.id)}
                    className="w-full"
                  >
                    Test {scenario.title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Streaming Test Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Live Streaming Test
              </CardTitle>
              <CardDescription>
                Test how the Markdown renderer handles real-time content updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={simulateStreaming}
                  disabled={isStreaming}
                  className="w-full"
                >
                  {isStreaming ? 'Streaming...' : 'Start Streaming Test'}
                </Button>
                
                {isStreaming && (
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                    <span>Streaming content...</span>
                  </div>
                )}

                {streamingContent && (
                  <div className="border rounded-lg p-4 bg-background">
                    <h4 className="font-medium mb-2">Streaming Content:</h4>
                    <Separator className="my-2" />
                    <div className="markdown-content">
                      <MarkdownRenderer content={streamingContent} />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Test Tabs */}
        {testScenarios.map((scenario) => (
          <TabsContent key={scenario.id} value={scenario.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <scenario.icon className="h-5 w-5 text-primary" />
                  {scenario.title}
                </CardTitle>
                <CardDescription>{scenario.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-6 bg-background">
                  <MarkdownRenderer content={scenario.content} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Implementation Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Summary</CardTitle>
          <CardDescription>
            Key features and security measures implemented
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium mb-2">✅ Features Implemented</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• GitHub Flavored Markdown support</li>
              <li>• Syntax highlighting with prismjs</li>
              <li>• KaTeX math formula rendering</li>
              <li>• Secure content sanitization</li>
              <li>• Copy buttons for code blocks</li>
              <li>• Responsive design</li>
              <li>• Streaming response support</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">🛡️ Security Measures</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• XSS prevention with rehype-sanitize</li>
              <li>• Safe HTML attribute filtering</li>
              <li>• Protocol validation for links</li>
              <li>• Image source validation</li>
              <li>• Content security policy compliance</li>
              <li>• Safe regex patterns</li>
              <li>• Memory-safe rendering</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MarkdownTestComponent;