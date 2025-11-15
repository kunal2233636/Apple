# R2 Knowledge Files - Example Content

This directory contains example markdown files that can be uploaded to Cloudflare R2 for testing the Study Buddy AI system's RAG (Retrieval-Augmented Generation) capabilities.

## Directory Structure

```
r2-knowledge-files/
├── subjects/
│   ├── mathematics/
│   │   └── algebra-basics.md
│   └── science/
│       └── physics-laws.md
└── study-guides/
    ├── exam-prep-tips.md
    └── note-taking-strategies.md
```

## Files Included

### Mathematics
- **algebra-basics.md**: Comprehensive guide to basic algebra concepts including variables, equations, and problem-solving techniques

### Science
- **physics-laws.md**: Fundamental physics laws including Newton's laws of motion, conservation laws, and thermodynamics

### Study Guides
- **exam-prep-tips.md**: Effective strategies for exam preparation, study techniques, and anxiety management
- **note-taking-strategies.md**: Various note-taking methods including Cornell, mind mapping, and outlining

## How to Use These Files

### 1. Upload to R2

**Using Cloudflare Dashboard:**
1. Navigate to your R2 bucket in Cloudflare Dashboard
2. Create the folder structure (subjects/mathematics, subjects/science, study-guides)
3. Upload each file to its respective folder

**Using AWS CLI:**
```bash
# Upload entire directory structure
aws s3 sync ./examples/r2-knowledge-files s3://study-buddy-knowledge \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
  --profile r2
```

**Using Wrangler:**
```bash
# Upload individual files
wrangler r2 object put study-buddy-knowledge/subjects/mathematics/algebra-basics.md \
  --file ./examples/r2-knowledge-files/subjects/mathematics/algebra-basics.md

wrangler r2 object put study-buddy-knowledge/subjects/science/physics-laws.md \
  --file ./examples/r2-knowledge-files/subjects/science/physics-laws.md

wrangler r2 object put study-buddy-knowledge/study-guides/exam-prep-tips.md \
  --file ./examples/r2-knowledge-files/study-guides/exam-prep-tips.md

wrangler r2 object put study-buddy-knowledge/study-guides/note-taking-strategies.md \
  --file ./examples/r2-knowledge-files/study-guides/note-taking-strategies.md
```

### 2. Test File Retrieval

After uploading, test the files endpoint:

```bash
# List all files
curl -X POST http://localhost:3000/api/ai/files \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "list",
    "userId": "your-user-id"
  }'

# Search for specific content
curl -X POST http://localhost:3000/api/ai/files \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "search",
    "query": "how to solve algebra equations",
    "userId": "your-user-id"
  }'
```

### 3. Test RAG Integration

Test the RAG feature in the chat endpoint:

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I prepare for an exam?",
    "userId": "your-user-id",
    "conversationId": "test-conversation",
    "rag": {
      "enabled": true
    }
  }'
```

The AI should retrieve relevant content from the exam-prep-tips.md file and use it to enhance the response.

## File Format Guidelines

All example files follow these best practices:

### Frontmatter
Each file includes YAML frontmatter with metadata:
```yaml
---
title: "File Title"
subject: "Subject Area"
difficulty: "beginner|intermediate|advanced"
topics: ["topic1", "topic2", "topic3"]
last_updated: "YYYY-MM-DD"
---
```

### Content Structure
- Clear headings and subheadings
- Bullet points and numbered lists
- Code blocks and formulas where appropriate
- Examples and practice problems
- Visual elements (tables, diagrams described in text)

### Markdown Features Used
- Headers (# ## ###)
- Bold and italic text
- Lists (ordered and unordered)
- Code blocks with syntax highlighting
- Tables
- Blockquotes
- Horizontal rules

## Creating Your Own Files

When creating additional knowledge files:

1. **Use descriptive filenames**: `topic-subtopic.md` format
2. **Include frontmatter**: Helps with categorization and search
3. **Structure content logically**: Use clear headings
4. **Add examples**: Concrete examples improve understanding
5. **Keep files focused**: One main topic per file
6. **Optimize for search**: Include relevant keywords naturally
7. **Update regularly**: Keep content current

## Testing Semantic Search

These files are designed to test semantic search capabilities:

**Query Examples:**
- "How do I solve equations?" → Should find algebra-basics.md
- "What are Newton's laws?" → Should find physics-laws.md
- "Study tips for tests" → Should find exam-prep-tips.md
- "How to take better notes?" → Should find note-taking-strategies.md

**Cross-Topic Queries:**
- "How to study physics?" → Should find both physics-laws.md and exam-prep-tips.md
- "Math exam preparation" → Should find algebra-basics.md and exam-prep-tips.md

## File Statistics

| File | Size | Topics Covered | Difficulty |
|------|------|----------------|------------|
| algebra-basics.md | ~4 KB | Variables, equations, solving | Beginner |
| physics-laws.md | ~6 KB | Newton's laws, conservation, thermodynamics | Intermediate |
| exam-prep-tips.md | ~8 KB | Study techniques, time management, anxiety | Beginner |
| note-taking-strategies.md | ~7 KB | Cornell method, mind mapping, organization | Beginner |

## Expanding the Knowledge Base

Consider adding files for:

### More Subjects
- Chemistry (periodic table, reactions, stoichiometry)
- Biology (cells, genetics, evolution)
- History (major events, timelines, analysis)
- Literature (analysis techniques, writing tips)
- Computer Science (algorithms, data structures)

### More Study Skills
- Time management strategies
- Memory techniques
- Research methods
- Writing guides
- Critical thinking

### Specialized Topics
- Test-specific prep (SAT, ACT, AP exams)
- Subject-specific study guides
- Common misconceptions and how to avoid them
- Quick reference sheets

## Maintenance

**Regular Tasks:**
- Review and update content quarterly
- Add new files based on user queries
- Remove outdated information
- Improve based on user feedback
- Monitor which files are most accessed

## Support

For issues or questions:
1. Check the main documentation: `docs/CLOUDFLARE_R2_SETUP_GUIDE.md`
2. Review the API documentation
3. Test with the provided test scripts
4. Check R2 dashboard for upload confirmation

## License

These example files are provided for testing and educational purposes. Feel free to modify and expand them for your needs.
