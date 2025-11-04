ocs/DEPLOYMENT_GUIDE.md</path>
<content"># CBSE Question Persistence System - Deployment Guide

## Quick Start

This guide provides step-by-step instructions to deploy and test the comprehensive CBSE question persistence and enhancement system.

## Prerequisites

### Required Environment Variables
```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini AI Configuration (Required)
NEXT_PUBLIC_GEMINI_QUESTIONS_API_KEY=your_gemini_api_key

# Optional: Debug Mode
NEXT_PUBLIC_DEBUG_QUESTION_SYSTEM=true
```

### Database Setup

#### 1. Create the Question Sets Table
Execute the following SQL in your Supabase SQL editor:

```sql
-- Migration: Create CBSE Question Sets Table
CREATE TABLE IF NOT EXISTS cbse_question_sets (
    id VARCHAR(255) PRIMARY KEY,
    chapter_name VARCHAR(255) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cbse_year VARCHAR(4) DEFAULT '2026',
    questions JSONB NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 0,
    generation_count INTEGER NOT NULL DEFAULT 1,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cbse_question_sets_chapter_subject 
    ON cbse_question_sets (chapter_name, subject_name);

CREATE INDEX IF NOT EXISTS idx_cbse_question_sets_subject 
    ON cbse_question_sets (subject_name);

CREATE INDEX IF NOT EXISTS idx_cbse_question_sets_last_modified 
    ON cbse_question_sets (last_modified DESC);

-- Create unique constraint to prevent duplicate question sets
CREATE UNIQUE INDEX IF NOT EXISTS idx_cbse_question_sets_unique_chapter_subject 
    ON cbse_question_sets (chapter_name, subject_name);
```

#### 2. Enable Row Level Security (Optional)
```sql
-- Enable RLS
ALTER TABLE cbse_question_sets ENABLE ROW LEVEL SECURITY;

-- Example policies (modify based on your auth requirements)
CREATE POLICY "Allow read access" ON cbse_question_sets
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access" ON cbse_question_sets
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access" ON cbse_question_sets
    FOR UPDATE USING (true);
```

## Implementation Files

### Core Files Created

1. **Question Storage Service** (`src/lib/question-storage.ts`)
   - Supabase-based persistence layer
   - Question deduplication and similarity detection
   - Subject-level statistics and analytics

2. **Question Manager** (`src/lib/question-manager.ts`)
   - Orchestrates question loading, generation, and merging
   - Enhanced error handling with fallback mechanisms
   - Smart question retrieval with storage-first approach

3. **Enhanced Modal** (`src/components/modals/question-assessment-modal.tsx`)
   - Updated UI with persistence features
   - "Add Extra Questions" functionality
   - Question source indicators and metadata display

4. **2026 CBSE Compliance** (`src/lib/gemini-questions.ts`)
   - Updated prompts for 2026 CBSE Class 12 syllabus
   - Latest board exam pattern references

5. **Test Suite** (`src/lib/tests/question-persistence-test.ts`)
   - Comprehensive testing framework
   - Smoke tests and integration tests

## Testing the System

### Quick Test (Browser Console)
```javascript
// Navigate to your app and open browser console
// Test basic functionality
window.runQuickSmokeTest()

// Test full persistence system
window.runQuestionPersistenceTests()
```

### Manual Testing Steps

#### 1. Test Question Generation
1. Open any chapter assessment modal
2. Wait for questions to load
3. Verify questions are generated using Gemini AI
4. Check console for storage operations

#### 2. Test Persistence
1. Close the modal
2. Reopen the same chapter assessment
3. Verify questions load from storage (not regenerated)
4. Check for "Saved Questions" badge in UI

#### 3. Test "Add Extra Questions"
1. With existing questions, click "Add Extra Questions" button
2. Verify additional questions are generated
3. Check that total question count increases
4. Confirm questions are saved to storage

#### 4. Test UI Enhancements
- **Question Source Indicators**: Blue badge for stored questions, green for fresh
- **Generation History**: Clock icon with timestamp
- **Question Count**: Shows total questions in set
- **Add Button**: Available when questions exist

## Feature Verification Checklist

### ✅ Question Persistence System
- [ ] Questions saved to Supabase after generation
- [ ] Existing questions loaded before generating new ones
- [ ] Question metadata tracked (chapter, subject, timestamp)
- [ ] Unique question sets per chapter-subject combination

### ✅ Enhanced User Experience  
- [ ] Visual indicators show question source
- [ ] "Add Extra Questions" button appears when questions exist
- [ ] Question count displays total available
- [ ] Generation history shows last update time

### ✅ 2026 CBSE Compliance
- [ ] Question prompts reference 2026 CBSE syllabus
- [ ] Latest board exam pattern formatting
- [ ] Updated marking scheme references

### ✅ Technical Implementation
- [ ] Database table created with proper indexes
- [ ] Error handling and fallback mechanisms work
- [ ] Question deduplication prevents duplicates
- [ ] Subject statistics and analytics functional

## Performance Considerations

### Expected Behavior
- **First Load**: 10-30 seconds (generation + storage)
- **Subsequent Loads**: <1 second (storage retrieval)
- **Add Extra Questions**: 5-15 seconds (generation + merge)

### Optimization Features
- **Smart Caching**: Questions stored in cloud for instant retrieval
- **Deduplication**: Prevents redundant question generation
- **Efficient Indexing**: Fast chapter-subject lookups
- **Graceful Fallbacks**: Sample questions on generation failure

## Monitoring and Debugging

### Console Logging
The system provides detailed logging for troubleshooting:
```javascript
// Enable debug mode
localStorage.setItem('debug-question-system', 'true');

// Check logs in browser console
[QuestionManager] Using existing questions from storage
[QuestionStorage] Saved question set: {id: "...", questionCount: 10}
[QuestionAssessment] Loaded questions: {source: "storage", isExisting: true}
```

### Common Issues and Solutions

#### "Table doesn't exist" Error
```bash
# Solution: Run the migration SQL provided above
# Check Supabase dashboard → SQL Editor → Execute migration
```

#### "Questions not saving to storage"
1. Verify Supabase credentials in environment variables
2. Check network connectivity
3. Review RLS policies in Supabase
4. Check browser console for detailed errors

#### "Generation fails with API error"
1. Verify Gemini API key is valid
2. Check API quota and rate limits
3. Ensure internet connectivity
4. Review error messages in console

#### "Add Extra Questions not working"
1. Ensure questions exist for the chapter
2. Check for JavaScript errors in console
3. Verify Supabase connection
4. Test with fresh chapter if needed

## Security Considerations

### Data Protection
- Questions stored in encrypted Supabase instance
- No personal user data linked to questions
- Row Level Security (RLS) can be enabled
- API keys stored securely in environment variables

### Access Control
```sql
-- Example RLS policies for user-based access
CREATE POLICY "Users can access their question sets" ON cbse_question_sets
    FOR ALL USING (auth.uid() IS NOT NULL);
```

## Production Deployment

### 1. Environment Configuration
```bash
# Set production environment variables
export NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_key
export NEXT_PUBLIC_GEMINI_QUESTIONS_API_KEY=your_production_gemini_key
```

### 2. Database Migration
```bash
# Run migration in production Supabase instance
# Use Supabase CLI or dashboard SQL editor
```

### 3. Build and Deploy
```bash
# Build the application
npm run build

# Deploy to your platform
# (Vercel, Netlify, etc.)
```

### 4. Monitor Performance
- Track question generation times
- Monitor storage hit rates
- Watch for error rates
- Analyze user engagement with "Add Extra Questions"

## Maintenance

### Regular Tasks
1. **Monitor Storage Usage**: Track question set growth
2. **Review Error Logs**: Check for generation failures
3. **Update CBSE Prompts**: Keep syllabus references current
4. **Clean Test Data**: Remove test chapters regularly

### Performance Monitoring
```javascript
// Add to monitoring dashboard
const metrics = {
  questionGenerationTime: 'avg_time_per_generation',
  storageHitRate: 'percentage_loaded_from_storage', 
  errorRate: 'generation_failure_percentage',
  userEngagement: 'add_extra_questions_usage'
};
```

## Support and Troubleshooting

### Getting Help
1. Check browser console for detailed error messages
2. Review the comprehensive documentation in `docs/QUESTION_PERSISTENCE_SYSTEM.md`
3. Run the test suite to identify specific issues
4. Verify all environment variables are correctly set

### Debug Commands
```javascript
// In browser console
window.runQuestionPersistenceTests()  // Full test suite
window.runQuickSmokeTest()            // Quick functionality test

// Check question availability
questionManager.checkQuestionAvailability('Chapter Name', 'Subject Name')

// Get subject statistics
questionManager.getSubjectQuestionStats('Subject Name')
```

---

🎉 **Congratulations!** Your CBSE Question Persistence System is now fully deployed and operational with 2026 syllabus compliance and enhanced user experience features.